import express from 'express';
import helmet from 'helmet';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { VirginAssistant } from '../../src/lib/localBankAssistant/service';
import { assistantPage } from './page';
import { installMacStartup } from '../../src/lib/localBankAssistant/macStartup';
import { execFile } from 'child_process';
import { promisify } from 'util';

export function createAssistantServer(service: VirginAssistant, port: number) {
  const app = express();
  const token = randomBytes(32).toString('hex');
  const origin = `http://127.0.0.1:${port}`;
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'"], connectSrc: ["'self'"], upgradeInsecureRequests: null } } }));
  app.use((request, response, next) => {
    if (request.headers.host !== `127.0.0.1:${port}`) { response.status(403).end(); return; }
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET' && request.headers.origin !== origin) { response.status(403).end(); return; }
    if (request.path.startsWith('/api/') && !request.headers.cookie?.split(';').some(value => value.trim() === `bank-assistant=${token}`)) { response.status(403).end(); return; }
    next();
  });
  app.use(express.json({ limit: '2kb' }));
  app.get('/', (_request, response) => {
    response.cookie('bank-assistant', token, { httpOnly: true, sameSite: 'strict', path: '/' });
    response.type('html').send(assistantPage());
  });
  app.get('/favicon.ico', (_request, response) => response.status(204).end());
  app.get('/assets/:file', (request, response) => {
    if (!['style.css', 'client.js'].includes(request.params.file)) { response.status(404).end(); return; }
    response.sendFile(path.join(__dirname, request.params.file));
  });
  app.get('/api/status', (_request, response) => response.json(service.snapshot()));
  app.get('/api/statements/:id', (request, response) => {
    try {
      const file = service.statementPath(request.params.id);
      response.setHeader('Content-Disposition', 'inline; filename="virgin-statement.pdf"');
      response.sendFile(file);
    } catch { response.status(404).end(); }
  });
  app.post('/api/action', async (request, response) => {
    try {
      const body = z.discriminatedUnion('action', [
        z.object({ action: z.enum(['open-bank', 'check', 'open-hub', 'disconnect']) }),
        z.object({ action: z.literal('schedule'), enabled: z.boolean() }),
        z.object({ action: z.literal('alerts'), enabled: z.boolean() }),
        z.object({ action: z.literal('startup') }),
        z.object({ action: z.literal('preview'), id: z.string().regex(/^[a-f0-9]{64}$/), accountName: z.string().trim().min(1).max(100), consent: z.literal(true) }),
      ]).parse(request.body);
      if (body.action === 'open-bank') await service.openBank();
      if (body.action === 'check') await service.check();
      if (body.action === 'open-hub') await service.openHub();
      if (body.action === 'schedule') await service.setSchedule(body.enabled);
      if (body.action === 'alerts') await service.setAlerts(body.enabled);
      if (body.action === 'startup') await installMacStartup(os.homedir(), process.execPath, path.resolve(__dirname, '../..'));
      if (body.action === 'disconnect') { await service.setSchedule(false); await service.close(); }
      if (body.action === 'preview') await service.stagePreview(body.id, body.accountName);
      response.json({ success: true, message: body.action === 'preview' ? 'Review the statement in Family Hub before saving.' : body.action === 'startup' ? 'Start-at-login enabled for your next Mac login. Keep this checkout installed.' : '' });
    } catch (error) {
      response.status(400).json({ error: error instanceof z.ZodError ? 'Invalid action.' : error instanceof Error ? error.message : 'Action could not complete.' });
    }
  });
  return app;
}

async function main() {
  const port = Number(process.env.BANK_ASSISTANT_PORT || 3941);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port.');
  const directory = path.join(os.homedir(), 'Library', 'Application Support', 'FamilyHubBankAssistant', 'virgin');
  const service = new VirginAssistant(directory, undefined, async () => {
    if (process.platform === 'darwin') await promisify(execFile)('/usr/bin/osascript', ['-e', 'display notification "Virgin Money needs attention. Open the Family Hub bank assistant." with title "Family Hub"'], { timeout: 5000 });
  });
  await service.initialise();
  const server = createAssistantServer(service, port).listen(port, '127.0.0.1', () => {
    service.startSchedule();
    console.log(`Virgin local assistant: http://127.0.0.1:${port}`);
  });
  server.on('error', () => { console.error('Assistant could not bind its local port.'); process.exitCode = 1; });
  const stop = () => { void service.close().finally(() => server.close()); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
if (process.argv[1]?.endsWith('/bank-assistant/server.ts')) void main().catch(() => { console.error('Could not start the local bank assistant.'); process.exitCode = 1; });

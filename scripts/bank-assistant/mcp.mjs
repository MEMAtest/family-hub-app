import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(new URL('./runtime/package.json', import.meta.url));
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const origin = 'http://127.0.0.1:3941';

export async function assistantRequest(route, body) {
  const entry = await fetch(origin, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  const cookie = entry.headers.get('set-cookie')?.split(';')[0];
  if (!entry.ok || !cookie) throw new Error('The local bank assistant is unavailable.');
  const response = await fetch(`${origin}${route}`, {
    method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('The local bank assistant could not complete the request.');
  return response.json();
}

export function createVirginMcp(request = assistantRequest) {
  const server = new McpServer({ name: 'family-hub-virgin', version: '0.2.0' }, {
    instructions: 'Virgin Money read-only banking connector on this Mac. Never request or return passwords, cookies, codes or keys. Phone approval stays in Virgin. Downloads are not budget imports: preparing a CSV never commits transactions. Do not claim permanent authentication, complete PDF history or physical phone receipt from a successful download.',
    maxToolInputElements: 100,
  });
  const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
  server.registerTool('virgin_status', {
    description: 'Read connection state, saved-login availability and downloaded document metadata. No credentials or transaction bodies are returned.',
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => result(await request('/api/status')));
  server.registerTool('virgin_refresh', {
    description: 'Refresh read-only bank exports using the saved Keychain login if needed. May request approval in the Virgin phone app. Never makes payments or commits budget imports.',
    inputSchema: {}, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async () => { await request('/api/action', { action: 'check' }); return result(await request('/api/status')); });
  server.registerTool('virgin_prepare_budget_import', {
    description: 'Prepare a private headed CSV for a downloaded export; returns its local path and counts. Does not upload it or import it to the budget.',
    inputSchema: { exportId: z.string().regex(/^[a-f0-9]{64}$/) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ exportId }) => result(await request('/api/prepare-budget', { id: exportId })));
  server.registerTool('virgin_request_phone_approval', {
    description: 'Request a fresh login only when the human says their phone is ready. May send one Virgin approval prompt; do not call repeatedly or automatically after expiry. Does not override rejected credentials.',
    inputSchema: { phoneReady: z.literal(true) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async () => { await request('/api/action', { action: 'request-phone-approval' }); return result(await request('/api/status')); });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createVirginMcp().connect(new StdioServerTransport()).catch(() => {
    process.stderr.write('Virgin MCP could not start.\n'); process.exitCode = 1;
  });
}

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(directory, 'runtime-entry.ts')],
  outfile: path.join(directory, 'runtime', 'server.cjs'),
  bundle: true, platform: 'node', format: 'cjs', target: 'node22',
  external: ['@playwright/test', 'express', 'helmet', 'zod', 'react', 'react-dom/server', 'lucide-react', 'pdf-parse'],
  define: { 'process.env.BANK_ASSISTANT_ROOT': JSON.stringify(path.resolve(directory, '../..')) },
  logLevel: 'warning',
});

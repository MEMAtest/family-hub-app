import { main } from './server';
void main().catch(() => { console.error('Could not start the local bank assistant.'); process.exitCode = 1; });

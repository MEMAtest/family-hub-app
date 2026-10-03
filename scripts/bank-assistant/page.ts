import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landmark, RefreshCw, LogIn, Bell, Pause, ShieldCheck, ExternalLink, FileText, type LucideIcon } from 'lucide-react';

const icon = (component: LucideIcon, size = 18) => renderToStaticMarkup(React.createElement(component, { size, 'aria-hidden': true }));
export function assistantPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Virgin Money | Family Hub</title><link rel="stylesheet" href="/assets/style.css"></head><body>
    <header>${icon(Landmark, 24)}<div><p>Family Hub / Bank assistant</p><h1>Virgin Money</h1></div><span class="local">${icon(ShieldCheck, 16)}Local pilot</span></header>
    <main>
      <section class="status-band" aria-label="Connection status"><div><span id="status" class="badge">Not connected</span><h2 id="notice">Not connected</h2><p id="checked">No checks yet</p></div><div class="actions"><button id="open-bank">${icon(LogIn)}Open Virgin</button><button id="check">${icon(RefreshCw)}Check now</button></div></section>
      <section class="settings" aria-label="Retrieval settings"><label><input id="schedule" type="checkbox">Check at 07:00 and 19:00 London time</label><label><input id="mac-alerts" type="checkbox">Mac alerts when sign-in is needed</label><button id="startup" class="secondary">${icon(LogIn)}Start on Mac login</button><button id="notifications" class="secondary">${icon(Bell)}Enable browser alerts</button><button id="pause" class="secondary">${icon(Pause)}Disconnect</button></section>
      <p class="warning">Bank approval stays with Virgin. No passwords are stored. This pilot retrieves statements, not a live transaction feed. Device must be awake and the assistant running.</p>
      <section aria-label="Retrieved statements"><div class="section-heading"><h2>${icon(FileText, 20)}Statements on this device</h2><span id="count">0 files</span></div><div id="statements"><p class="empty">No statements retrieved.</p></div></section>
      <section class="destination" aria-label="Family Hub destination"><h2>Family Hub preview</h2><div class="destination-controls"><label>Statement account<input id="account" type="text" placeholder="Exact account name in Family Hub" maxlength="100"></label><button id="open-hub" class="secondary">${icon(ExternalLink)}Open Family Hub</button></div><label class="consent"><input id="consent" type="checkbox">Send the selected Virgin PDF to family-hub-app.vercel.app for review. External AI stays off.</label></section>
      <p id="error" role="alert" hidden></p><p id="result" role="status"></p>
    </main><template id="pdf-icon">${icon(FileText, 16)}</template><script src="/assets/client.js" defer></script></body></html>`;
}

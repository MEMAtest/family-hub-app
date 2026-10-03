const byId = id => document.getElementById(id);
const dates = value => value ? new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : 'Never';
const statusLabels = {idle:'Not connected',checking:'Checking',awaiting_signin:'Sign-in needed',navigation_required:'Needs review',ready:'Checked',error:'Check failed'};
let lastNotice = '';
let busy = false;
async function action(name, body = {}) {
  if (busy) return;
  busy = true;
  byId('error').hidden = true;
  document.querySelectorAll('button').forEach(button => button.disabled = true);
  try {
    const response = await fetch('/api/action', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,...body})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Action failed.');
    byId('result').textContent = result.message || '';
  } catch (error) { byId('error').textContent = error.message; byId('error').hidden = false; }
  finally { busy = false; document.querySelectorAll('button').forEach(button => button.disabled = false); await refresh(); }
}
async function refresh() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error();
    const state = await response.json();
    byId('status').textContent = statusLabels[state.status] || 'Needs review';
    byId('notice').textContent = state.notice;
    byId('checked').textContent = `Last attempt: ${dates(state.lastChecked)}`;
    byId('schedule').checked = state.scheduleEnabled;
    byId('mac-alerts').checked = state.alertsEnabled;
    byId('count').textContent = `${state.statements.length} ${state.statements.length === 1 ? 'file' : 'files'}`;
    const list = byId('statements'); list.replaceChildren();
    if (!state.statements.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'No statements retrieved.'; list.append(empty); }
    for (const statement of state.statements) {
      const row = document.createElement('article'); row.className = 'statement';
      const text = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = statement.through ? `Transactions through ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(statement.through + 'T12:00:00Z'))}` : 'Dates need review';
      const detail = document.createElement('p'); detail.textContent = `${statement.rows} extracted rows \u00b7 Retrieved ${dates(statement.retrievedAt)}${statement.reviewRequired ? ' \u00b7 Check extraction' : ''}`;
      const button = document.createElement('button'); button.textContent = 'Send preview'; button.disabled = busy;
      const view = document.createElement('a'); view.href = `/api/statements/${statement.id}`; view.target = '_blank'; view.rel = 'noreferrer'; view.className = 'pdf-link';
      view.append(byId('pdf-icon').content.cloneNode(true), document.createTextNode('View PDF'));
      button.addEventListener('click', () => {
        if (!byId('consent').checked || !byId('account').value.trim()) {
          byId('error').textContent = 'Choose the Family Hub account and approve sending this PDF before continuing.'; byId('error').hidden = false; return;
        }
        void action('preview', {id:statement.id, accountName:byId('account').value.trim(), consent:true});
      });
      text.append(title,detail,view); row.append(text,button); list.append(row);
    }
    if (lastNotice && lastNotice !== state.notice && ['awaiting_signin','navigation_required','error'].includes(state.status) && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Virgin Money needs attention', {body:state.notice});
    }
    lastNotice = state.notice;
  } catch { byId('error').textContent = 'The local assistant is unavailable. No bank data is being refreshed.'; byId('error').hidden = false; }
}
byId('open-bank').addEventListener('click',()=>action('open-bank'));
byId('check').addEventListener('click',()=>action('check'));
byId('open-hub').addEventListener('click',()=>action('open-hub'));
byId('startup').addEventListener('click',()=>action('startup'));
byId('pause').addEventListener('click',()=>action('disconnect'));
byId('schedule').addEventListener('change',()=>action('schedule',{enabled:byId('schedule').checked}));
byId('mac-alerts').addEventListener('change',()=>action('alerts',{enabled:byId('mac-alerts').checked}));
byId('notifications').addEventListener('click',async()=>{
  if (!('Notification' in window)) { byId('result').textContent = 'Desktop alerts are unavailable in this browser.'; return; }
  const permission = await Notification.requestPermission();
  byId('result').textContent = permission === 'granted' ? 'Desktop alerts enabled.' : 'Alerts not enabled. Status remains visible here.';
});
void refresh(); setInterval(refresh,5000);

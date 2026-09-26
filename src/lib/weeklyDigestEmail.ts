import type { WeeklyDigest } from '@/lib/weeklyDigest';
import { EMPTY_DIGEST_EXTRAS, type DigestExtras } from '@/lib/weeklyDigestExtras';

/**
 * Renders the weekly digest as an email.
 *
 * Written for email clients, not browsers: tables, inline styles, no flexbox,
 * no external CSS. Gmail strips a <style> block in some contexts, so every rule
 * that matters is on the element.
 */

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const INK = '#233d37';
const MUTED = '#61756f';
const ACCENT = '#147c72';
const LINE = '#dde5e0';

const statusTone: Record<string, string> = {
  overdue: '#b91c1c',
  'due-today': '#b45309',
  'due-soon': '#a16207',
  'in-progress': '#1d4ed8',
  'not-started': MUTED,
  completed: MUTED,
};

const URGENCY_TONE: Record<string, string> = {
  urgent: '#b91c1c',
  soon: '#b45309',
  routine: '#1d4ed8',
  someday: MUTED,
};

const FOOTER_TEXT = 'Choose what goes in this email under News > Kids Events > Monday email.';

export const renderWeeklyDigestSubject = (digest: WeeklyDigest, familyName: string, extras: DigestExtras = EMPTY_DIGEST_EXTRAS) => {
  const urgent = extras.urgentHomeJobs
    ? `, ${extras.urgentHomeJobs} urgent home job${extras.urgentHomeJobs === 1 ? '' : 's'}`
    : '';
  if (digest.eventCount === 0 && digest.tasks.length === 0) {
    return `${familyName}: a clear week (${digest.rangeLabel})${urgent}`;
  }
  const bits = [`${digest.eventCount} ${digest.eventCount === 1 ? 'thing' : 'things'} on`];
  if (digest.tasks.length) bits.push(`${digest.tasks.length} due`);
  if (digest.clashes.length) bits.push(`${digest.clashes.length} clash${digest.clashes.length === 1 ? '' : 'es'}`);
  return `${familyName} this week: ${bits.join(', ')}${urgent}`;
};

export const renderWeeklyDigestText = (digest: WeeklyDigest, familyName: string, extras: DigestExtras = EMPTY_DIGEST_EXTRAS) => {
  const lines: string[] = [`${familyName} - week of ${digest.rangeLabel}`, ''];

  if (digest.clashes.length) {
    lines.push('CLASHES');
    digest.clashes.forEach((c) => lines.push(`  ${c.label}: ${c.who} has ${c.a} and ${c.b}`));
    lines.push('');
  }

  for (const day of digest.days) {
    if (!day.entries.length) continue;
    lines.push(day.label);
    day.entries.forEach((e) => lines.push(`  ${e.time}  ${e.title} - ${e.who}${e.location ? ` (${e.location})` : ''}`));
    lines.push('');
  }

  if (digest.tasks.length) {
    lines.push('DUE THIS WEEK');
    digest.tasks.forEach((t) => lines.push(`  ${t.dueLabel}: ${t.title} - ${t.who}`));
    lines.push('');
  }

  if (digest.eventCount === 0 && digest.tasks.length === 0) {
    lines.push('Nothing scheduled. Enjoy it.', '');
  }

  if (extras.kidsIdeas.length) {
    lines.push('IDEAS FOR THE KIDS');
    extras.kidsIdeas.forEach((idea) => lines.push(`  ${idea.title}${idea.free ? ' (free)' : ''} - ${idea.where}. ${idea.pattern}. ${idea.url}`));
    lines.push('');
  }

  if (extras.homeJobs.length) {
    lines.push(`HOME JOBS (${extras.homeJobsTotal} open)`);
    extras.homeJobs.forEach((job) => lines.push(`  [${job.urgencyLabel}] ${job.title} - ${job.who}${job.when ? `, ${job.overdue ? 'overdue since ' : ''}${job.when}` : ''}`));
    if (extras.homeJobsTotal > extras.homeJobs.length) lines.push(`  ...and ${extras.homeJobsTotal - extras.homeJobs.length} more in the app`);
    lines.push('');
  }

  lines.push(FOOTER_TEXT);
  return lines.join('\n');
};

export const renderWeeklyDigestHtml = (digest: WeeklyDigest, familyName: string, extras: DigestExtras = EMPTY_DIGEST_EXTRAS) => {
  const dayRows = digest.days
    .filter((day) => day.entries.length > 0)
    .map((day) => {
      const entries = day.entries
        .map(
          (entry) => `
            <tr>
              <td width="62" style="width:62px;padding:6px 12px 6px 0;white-space:nowrap;vertical-align:top;color:${ACCENT};font-weight:600;font-size:14px;">${escape(entry.time)}</td>
              <td style="padding:6px 0;vertical-align:top;font-size:14px;color:${INK};">
                ${escape(entry.title)}
                <div style="color:${MUTED};font-size:12px;padding-top:2px;">${escape(entry.who)}${entry.location ? ` &middot; ${escape(entry.location)}` : ''}</div>
              </td>
            </tr>`
        )
        .join('');

      return `
        <tr>
          <td style="padding:18px 0 4px;border-top:1px solid ${LINE};">
            <div style="font-size:13px;font-weight:700;color:${INK};letter-spacing:.02em;">${escape(day.label)}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:6px;table-layout:fixed;">${entries}</table>
          </td>
        </tr>`;
    })
    .join('');

  const clashBlock = digest.clashes.length
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
        <tr><td style="padding:14px 16px;">
          <div style="font-size:13px;font-weight:700;color:#991b1b;">Worth a look</div>
          ${digest.clashes
            .map(
              (c) =>
                `<div style="font-size:13px;color:#7f1d1d;padding-top:6px;">${escape(c.who)} is double-booked on ${escape(c.label)}: ${escape(c.a)} and ${escape(c.b)}.</div>`
            )
            .join('')}
        </td></tr>
      </table>`
    : '';

  const taskBlock = digest.tasks.length
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;border-top:1px solid ${LINE};">
        <tr><td style="padding-top:18px;">
          <div style="font-size:13px;font-weight:700;color:${INK};">Due this week</div>
          ${digest.tasks
            .map(
              (task) => `
              <div style="padding-top:8px;font-size:14px;color:${INK};">
                ${escape(task.title)}${task.subject ? ` <span style="color:${MUTED};">(${escape(task.subject)})</span>` : ''}
                <div style="font-size:12px;padding-top:2px;color:${statusTone[task.status] ?? MUTED};">
                  ${escape(task.dueLabel)} &middot; ${escape(task.who)}
                </div>
              </div>`
            )
            .join('')}
        </td></tr>
      </table>`
    : '';

  const ideasBlock = extras.kidsIdeas.length
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;border-top:1px solid ${LINE};">
        <tr><td style="padding-top:18px;">
          <div style="font-size:13px;font-weight:700;color:${INK};">Ideas for the kids</div>
          ${extras.kidsIdeas
            .map(
              (idea) => `
              <div style="padding-top:10px;font-size:14px;color:${INK};">
                <a href="${escape(idea.url)}" style="color:${ACCENT};font-weight:600;text-decoration:none;">${escape(idea.title)}</a>${idea.free ? ` <span style="font-size:11px;font-weight:700;color:#047857;">FREE</span>` : ''}${idea.pinned ? ` <span style="font-size:11px;color:${MUTED};">&#9733; picked by you</span>` : ''}
                <div style="font-size:13px;color:${INK};padding-top:2px;">${escape(idea.summary)}</div>
                <div style="font-size:12px;color:${MUTED};padding-top:2px;">${escape(idea.where)} &middot; ${escape(idea.pattern)}</div>
              </div>`
            )
            .join('')}
          <div style="font-size:11px;color:${MUTED};padding-top:10px;">Times and prices change, so check the venue before you go.</div>
        </td></tr>
      </table>`
    : '';

  const homeBlock = extras.homeJobs.length
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;border-top:1px solid ${LINE};">
        <tr><td style="padding-top:18px;">
          <div style="font-size:13px;font-weight:700;color:${INK};">Home jobs <span style="font-weight:400;color:${MUTED};">(${extras.homeJobsTotal} open)</span></div>
          ${extras.homeJobs
            .map(
              (job) => `
              <div style="padding-top:8px;font-size:14px;color:${INK};">
                ${job.safety ? '&#9888;&#65039; ' : ''}${escape(job.title)}
                <div style="font-size:12px;padding-top:2px;color:${URGENCY_TONE[job.urgency] ?? MUTED};">
                  ${escape(job.urgencyLabel)} &middot; ${escape(job.who)}${job.when ? ` &middot; ${job.overdue ? 'overdue, ' : ''}${escape(job.when)}` : ''}
                </div>
              </div>`
            )
            .join('')}
          ${extras.homeJobsTotal > extras.homeJobs.length ? `<div style="font-size:12px;color:${MUTED};padding-top:8px;">&hellip;and ${extras.homeJobsTotal - extras.homeJobs.length} more in the app.</div>` : ''}
        </td></tr>
      </table>`
    : '';

  const summary = [
    `${digest.eventCount} ${digest.eventCount === 1 ? 'thing' : 'things'} on`,
    digest.busiestDay ? `busiest is ${escape(digest.busiestDay.label)}` : null,
    digest.totalCost > 0 ? `£${digest.totalCost.toFixed(2)} to pay` : null,
  ]
    .filter(Boolean)
    .join(' &middot; ');

  const empty =
    digest.eventCount === 0 && digest.tasks.length === 0
      ? `<p style="font-size:15px;color:${MUTED};margin:24px 0 0;">Nothing scheduled this week. Enjoy it.</p>`
      : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(familyName)} this week</title></head>
<body style="margin:0;padding:0;background:#f7fbf8;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f7fbf8;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:24px 24px 0;">
          <div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:${MUTED};">The week ahead</div>
          <h1 style="margin:6px 0 2px;font-size:23px;line-height:1.25;color:${INK};font-weight:700;">${escape(familyName)}</h1>
          <div style="font-size:14px;color:${MUTED};">${escape(digest.rangeLabel)}</div>
          ${summary ? `<div style="font-size:13px;color:${ACCENT};padding-top:10px;font-weight:600;">${summary}</div>` : ''}
        </td></tr>
        <tr><td style="padding:20px 24px 26px;">
          ${clashBlock}
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${dayRows}</table>
          ${taskBlock}
          ${empty}
          ${ideasBlock}
          ${homeBlock}
          <p style="margin:26px 0 0;font-size:11px;color:${MUTED};line-height:1.5;">
            Sent by Family Hub on Monday morning. Choose what goes in it under News &rarr; Kids Events &rarr; Monday email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

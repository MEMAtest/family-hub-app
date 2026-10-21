/** Calendar-day boundaries for the daily catch-up, including BST/GMT changes. */
export const londonNotificationDay = (now: Date) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const key = `${parts.year}-${parts.month}-${parts.day}`;
  const tomorrowUtc = new Date(new Date(`${key}T00:00:00Z`).getTime() + 86_400_000);
  const londonHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23',
  }).format(tomorrowUtc));
  return { key, endsAt: new Date(tomorrowUtc.getTime() - londonHour * 3_600_000) };
};

// Import hydration and launch sweeps are inbox updates, not individual alerts.
export const isInboxOnlyNotificationSource = (source: unknown) => typeof source === 'string' && [
  'gmail-nursery-email', 'gmail-school-email', 'grandir-parent-portal', 'calendar-email',
  'notification-sweep',
].includes(source);

type NoticeState = {
  read: boolean; actionRequired: boolean; timestamp: Date | string;
  expiresAt?: Date | string | null; snoozedUntil?: Date | string | null;
  metadata?: any;
};

export const isActionableNotification = (notice: NoticeState, now = Date.now()) => {
  if (notice.read || !notice.actionRequired || notice.metadata?.canAct === false ||
      (notice.snoozedUntil && new Date(notice.snoozedUntil).getTime() > now)) return false;
  let expiry = notice.expiresAt ? new Date(notice.expiresAt).getTime() : NaN;
  if (!notice.expiresAt) {
    const metadata = notice.metadata || {};
    const timestamp = new Date(notice.timestamp).getTime();
    if (metadata.eventDate) {
      expiry = Date.parse(`${metadata.eventDate}T${metadata.eventTime || '23:59'}:00Z`);
    } else if (metadata.source === 'home-intelligence' && Number.isFinite(timestamp)) {
      expiry = londonNotificationDay(new Date(timestamp)).endsAt.getTime();
    } else {
      const intake = ['gmail-nursery-email', 'gmail-school-email', 'grandir-parent-portal', 'calendar-email'].includes(metadata.source);
      expiry = timestamp + (intake ? 7 : 1) * 86_400_000;
    }
  }
  return Number.isFinite(expiry) && expiry > now;
};

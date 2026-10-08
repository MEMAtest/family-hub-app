const shortService = (service: string) => {
  if (/mixed recycling/i.test(service)) return 'mixed recycling';
  if (/paper.*cardboard/i.test(service)) return 'paper and cardboard';
  if (/non.recyclable|refuse/i.test(service)) return 'non-recyclable refuse';
  if (/food waste/i.test(service)) return 'food waste';
  if (/garden/i.test(service)) return 'garden waste';
  return service.trim().toLowerCase();
};

export const binServiceSummary = (services: string[]) =>
  services.map(shortService).filter(Boolean).join(' + ');

export const binCollectionDateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London',
}).format(new Date(`${date}T12:00:00Z`));

export const binReminderTitle = (services: string[]) =>
  `Bins tonight: ${binServiceSummary(services) || 'check the collection'}`;

export const binReminderMessage = (date: string, services: string[]) =>
  `Collection is tomorrow, ${binCollectionDateLabel(date)}. Put out ${services.join(' and ')}. ` +
  'The council calendar does not publish a collection time.';

import { checklistCsv, fileDownloadLink } from '../downloads';
import { createBathroomSourcingSeed } from '../seed';

test('downloads reject unsafe links and support original HTTPS files and measurement photos', () => {
  expect(fileDownloadLink('javascript:alert(1)')).toBeUndefined();
  expect(fileDownloadLink('https://user:password@example.com/a')).toBeUndefined();
  expect(fileDownloadLink('https://example.com/quote.pdf')).toBe('https://example.com/quote.pdf');
  expect(fileDownloadLink('data:image/jpeg;base64,YQ==')).toBeDefined();
});
test('digital quote exports both rooms, every supply line and safe custom item text', () => {
  const sourcing = createBathroomSourcingSeed();
  sourcing.requirements.push({ ...sourcing.requirements[0], id: 'custom', source: 'household', name: '=dangerous,"quoted"' });
  const csv = checklistCsv(sourcing);
  expect(csv.split('\r\n')).toHaveLength(30);
  expect(csv).toContain('Shower Room');
  expect(csv).toContain('"\'=dangerous,""quoted"""');
});

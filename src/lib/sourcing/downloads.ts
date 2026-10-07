import type { ProjectSourcing } from '@/types/sourcing.types';
import { quoteLineSelection } from './quoteInventory';
import { evaluateSelection, requiredDemands } from './selection';
import { basketCostPence } from './spend';

export function fileDownloadLink(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (/^data:(?:image\/(?:jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(raw)) return raw;
  try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

export function checklistCsv(sourcing: ProjectSourcing) {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const allocated = new Set<string>();
  const amounts = (selection: ReturnType<typeof quoteLineSelection>) => {
    let known = 0, ordered = 0, unknown = 0, priced = 0;
    for (const { item } of selection.selections) {
      if (allocated.has(item.id)) continue;
      allocated.add(item.id);
      const pence = basketCostPence(sourcing, item);
      if (pence === undefined) unknown++;
      else { known += pence; priced++; if (item.status === 'ordered') ordered += pence; }
    }
    return [selection.coverage.map((part) => `${part.component}: ${part.quantity}/${part.required}`).join('; '), selection.deviation ? 'Replacement - review quote deviation' : '', selection.warnings.join('; '), priced ? (known / 100).toFixed(2) : '', priced ? (ordered / 100).toFixed(2) : '', unknown || ''];
  };
  const rows: unknown[][] = [['Bathroom', 'Quoted item', 'Quantity', 'Status', 'Selected products', 'Product links', 'Coverage', 'Quote deviation', 'Warnings', 'Allocated known selected goods GBP (purchase counted once)', 'Allocated known ordered goods GBP', 'Unconfirmed selected costs']];
  for (const line of sourcing.quoteLines ?? []) {
    const selection = quoteLineSelection(sourcing, line);
    rows.push([sourcing.rooms?.[line.roomId]?.name || (line.roomId === 'main-bathroom' ? 'Main Bathroom' : 'Shower Room'), line.text, line.quantity, selection.complete ? 'Selected' : selection.selections.length ? 'Selected - coverage incomplete' : 'To choose', selection.selections.map(({ product }) => product.name).join('; '), selection.selections.map(({ product }) => product.url).join('; '), ...amounts(selection)]);
  }
  for (const item of requiredDemands(sourcing).filter((entry) => !sourcing.quoteLines?.some((line) => line.requirementId === entry.id))) {
    const check = evaluateSelection(sourcing, item);
    rows.push([sourcing.rooms?.[item.roomId]?.name || item.roomId, item.name, item.quantity, check.complete ? 'Selected' : check.selected.length ? 'Selected - coverage incomplete' : 'To choose', check.selected.map(({ product }) => product.name).join('; '), check.selected.map(({ product }) => product.url).join('; '), ...amounts(check)]);
  }
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

export function downloadChecklist(sourcing: ProjectSourcing) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', checklistCsv(sourcing)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'bathroom-quote-checklist.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

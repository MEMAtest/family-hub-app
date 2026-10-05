import type { ProjectSourcing } from '@/types/sourcing.types';
import { quoteLineSelection } from './quoteInventory';

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
  const rows: unknown[][] = [['Bathroom', 'Quoted item', 'Quantity', 'Status', 'Selected products', 'Product links']];
  for (const line of sourcing.quoteLines ?? []) {
    const selection = quoteLineSelection(sourcing, line);
    rows.push([sourcing.rooms?.[line.roomId]?.name || (line.roomId === 'main-bathroom' ? 'Main Bathroom' : 'Shower Room'), line.text, line.quantity, selection.complete ? 'Selected' : selection.partial ? 'Part selected' : 'To choose', selection.selections.map(({ product }) => product.name).join('; '), selection.selections.map(({ product }) => product.url).join('; ')]);
  }
  for (const item of sourcing.requirements.filter((entry) => entry.source === 'household')) {
    const selected = sourcing.basket.filter((entry) => entry.requirementId === item.id).flatMap((entry) => sourcing.products.find((product) => product.id === entry.productId) ?? []);
    rows.push([sourcing.rooms?.[item.roomId]?.name || item.roomId, item.name, item.quantity, selected.length ? 'Selected' : 'To choose', selected.map((product) => product.name).join('; '), selected.map((product) => product.url).join('; ')]);
  }
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

export function downloadChecklist(sourcing: ProjectSourcing) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', checklistCsv(sourcing)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'bathroom-quote-checklist.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

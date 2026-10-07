import { Check, Circle, Grid2x2 } from 'lucide-react';
import type { ProjectSourcing, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import { requirementSelection, roomName } from './bathroomProject.helpers';
import { requiredDemands } from '@/lib/sourcing/selection';

const zones = [
  { label: 'Walls & lighting', match: /wall tiles|downlight|lighting|extractor/i },
  { label: 'Bath / shower', match: /\bbath\b|shower|screen|tray/i },
  { label: 'Basin & furniture', match: /basin|vanity|worktop|mirror/i },
  { label: 'WC & cistern', match: /toilet|wc|cistern/i },
  { label: 'Floor & heating', match: /floor tiles|underfloor|floor heating/i },
  { label: 'Towel rail & fittings', match: /towel|tap|filler|valve/i },
];

export default function BathroomRoomMap({ sourcing, roomId, onOpenRequirement }: { sourcing: ProjectSourcing; roomId: SourcingRoomId; onOpenRequirement: (requirement: SourcingRequirement, part?: string) => void }) {
  const items = requiredDemands(sourcing, roomId);
  const complete = items.filter((item) => requirementSelection(sourcing, item).complete).length;
  const accent = roomId === 'main-bathroom' ? 'border-teal-300 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/20' : 'border-blue-300 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20';
  return <section aria-label={`${roomName(sourcing, roomId)} visual progress`} className={`min-w-0 rounded-lg border p-3 ${accent}`}>
    <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-semibold">{roomName(sourcing, roomId)} fit-out</h4><p className="text-xs text-gray-600 dark:text-slate-300">{complete} of {items.length} quote items complete</p></div><Grid2x2 aria-hidden="true" className="h-5 w-5 text-gray-500" /></div>
    <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Illustrative item map, not to scale">{zones.filter(({ match }) => items.some((item) => match.test(`${item.name} ${item.category}`))).map((zone) => {
      const zoneItems = items.filter((item) => zone.match.test(`${item.name} ${item.category}`));
      const done = zoneItems.filter((item) => requirementSelection(sourcing, item).complete).length;
      return <div key={zone.label} className="min-w-0 rounded-md border border-white/80 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-900/80">
        <p className="text-[11px] font-medium text-gray-600 dark:text-slate-300">{zone.label}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold">{done === zoneItems.length ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <Circle className="h-3.5 w-3.5 text-amber-600" />}{done}/{zoneItems.length} covered</p>
        <div className="mt-1 space-y-1">{zoneItems.slice(0, 2).map((item) => {
          const status = requirementSelection(sourcing, item);
          return <button key={item.id} onClick={() => onOpenRequirement(item, status.missing[0])} className="block w-full truncate text-left text-[10px] text-gray-600 underline decoration-gray-300 underline-offset-2 dark:text-slate-300">{item.name}</button>;
        })}</div>
      </div>;
    })}</div>
    <p className="mt-2 text-[10px] text-gray-500">Visual item map only; placement and room fit are not measured.</p>
  </section>;
}

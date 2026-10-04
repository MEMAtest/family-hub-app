import type { ProjectSourcing, SourcingRoomId } from '@/types/sourcing.types';
import { unionWcOptions } from './unionCatalogue';

// Supply-of-goods lines transcribed from the two R & R quotations dated 18 January 2026.
const goods: Array<[SourcingRoomId, string, number, string, string[]]> = [
  ['main-bathroom', 'B-shaped shower bath', 1, 'main-bath', ['bath']],
  ['main-bathroom', 'Bath pop-up waste', 1, 'main-bath', ['waste']],
  ['main-bathroom', 'B-shaped bath screen', 1, 'main-bath', ['screen']],
  ['main-bathroom', 'B-shaped bath panel and end panel', 1, 'main-bath', ['front-panel', 'end-panel']],
  ['main-bathroom', '600mm Coronation wall-hung unit with two drawers', 1, 'main-vanity', ['vanity']],
  ['main-bathroom', '500mm toilet unit', 1, 'main-wc-unit', ['wc-unit']],
  ['main-bathroom', 'Grove back-to-wall toilet with push button and soft-close seat', 1, 'main-toilet', ['toilet', 'seat']],
  ['main-bathroom', 'Fluid Master concealed cistern', 1, 'main-wc-unit', ['cistern']],
  ['main-bathroom', 'Element Five two-hole wall-mounted bath filler', 1, 'main-bath-filler', ['bath-filler']],
  ['main-bathroom', 'Element Five basin tap with click waste', 1, 'main-basin-tap', ['basin-tap', 'basin-waste']],
  ['main-bathroom', '1200 x 600mm chrome heated towel rail with chrome valves', 1, 'main-rail', ['towel-rail', 'valves']],
  ['main-bathroom', 'Element Five surface-mounted shower with fixed riser', 1, 'main-shower', ['shower', 'riser']],
  ['main-bathroom', 'Extractor fan', 1, 'main-extractor', ['extractor-fan']],
  ['main-bathroom', 'Chrome downlights with LED bulbs', 6, 'main-downlights', ['downlight', 'led-bulb']],
  ['shower-room', '1000 x 800mm, 8mm sliding shower door', 1, 'shower-door', ['shower-door']],
  ['shower-room', '1000 x 800mm shower tray with high-flow waste', 1, 'shower-tray', ['shower-tray', 'waste']],
  ['shower-room', '400mm Union white vanity', 1, 'shower-vanity', ['vanity']],
  ['shower-room', '500mm Union toilet unit', 1, 'shower-wc-unit', ['wc-unit']],
  ['shower-room', '400mm Union basin', 1, 'shower-vanity', ['basin']],
  ['shower-room', '500mm white worktop', 1, 'shower-worktop', ['worktop']],
  ['shower-room', 'Grove back-to-wall toilet with push button and soft-close seat', 1, 'shower-toilet', ['toilet', 'seat']],
  ['shower-room', 'Fluid Master concealed cistern', 1, 'shower-wc-unit', ['cistern']],
  ['shower-room', 'Element Five basin tap with click waste', 1, 'shower-basin-tap', ['basin-tap', 'basin-waste']],
  ['shower-room', 'Element Five surface-mounted shower with fixed riser', 1, 'shower-shower', ['shower', 'riser']],
  ['shower-room', 'High-performance extractor fan', 1, 'shower-extractor', ['extractor-fan']],
  ['shower-room', '1000 x 500mm chrome towel rail with chrome valves', 1, 'shower-rail', ['towel-rail', 'valves']],
  ['shower-room', 'Chrome downlights with LED bulbs', 4, 'shower-downlights', ['downlight', 'led-bulb']],
  ['shower-room', 'Warmup underfloor heating with thermostat', 1, 'warmup', ['underfloor-heating', 'thermostat']],
];

export function withQuoteInventory(seed: ProjectSourcing): ProjectSourcing {
  const requirements = [...seed.requirements];
  for (const [roomId, text, quantity, id, requiredComponents] of goods) {
    if (requirements.some((item) => item.id === id)) continue;
    const category = /downlight/.test(id) ? 'Lighting' : /extractor/.test(id) ? 'Ventilation' : /worktop|wc-unit/.test(id) ? 'Furniture' : /shower/.test(id.split('-').slice(1).join('-')) ? 'Showers' : 'Fittings';
    const width = id === 'shower-wc-unit' || id === 'shower-worktop' ? 500 : undefined;
    requirements.push({ id, roomId, name: text, category, specification: text, quantity, unit: 'each', status: 'confirmed', source: 'quote', size: width ? `${width}mm wide` : undefined, constraints: width ? { maxWidthMm: width } : {}, requiredComponents });
  }
  const products = [...seed.products];
  for (const option of unionWcOptions) if (!products.some((product) => product.id === option.id)) products.push({ ...option, requirementIds: [...option.requirementIds!], dimensions: { ...option.dimensions }, specs: { ...option.specs }, components: [...option.components] });
  return { ...seed, products, requirements, quoteLines: goods.map(([roomId, text, quantity, requirementId, components], index) => ({ id: `quote-goods-${index}`, roomId, text, quantity, requirementId, components })) };
}

export function quoteLineSelected(sourcing: ProjectSourcing, line: NonNullable<ProjectSourcing['quoteLines']>[number]) {
  return quoteLineSelection(sourcing, line).complete;
}

export function quoteLineSelection(sourcing: ProjectSourcing, line: NonNullable<ProjectSourcing['quoteLines']>[number]) {
  const selections = sourcing.basket.filter((item) => item.requirementId === line.requirementId).flatMap((item) => {
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    return product && line.components.some((part) => product.components.includes(part)) ? [{ item, product }] : [];
  });
  const coverage = line.components.map((component) => ({ component, quantity: selections.reduce((total, { item, product }) => total + (product.components.includes(component) ? item.quantity : 0), 0) }));
  const complete = coverage.length > 0 && coverage.every((part) => part.quantity >= line.quantity);
  return { selections, coverage, complete, partial: !complete && selections.length > 0 };
}

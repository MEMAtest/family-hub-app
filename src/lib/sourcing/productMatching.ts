import type { ComponentEvidence, SourcedProduct } from '@/types/sourcing.types';

const PART_HINTS: Record<string, RegExp> = {
  'wc-unit': /\b(?:wc|toilet)\s*(?:furniture\s*)?(?:unit|cabinet)\b|\bback to wall unit\b/i,
  cistern: /\bcistern\b|\bflush tank\b/i,
  toilet: /\btoilet\b(?!\s*(?:unit|seat|cabinet))|\bwc pan\b/i,
  seat: /\btoilet seat\b|\bsoft close seat\b/i,
  basin: /\b(?:wash)?basin\b(?![ -]*(?:tap|waste|mixer))/i,
  vanity: /\bvanity\b|\b(?:drawer|wall[ -]hung|floor[ -]standing) unit\b|\bunit with (?:a )?basin\b/i,
  'basin-tap': /\bbasin[ -]+(?:tap|mixer)\b/i,
  'basin-waste': /\bbasin waste\b/i,
  'led-bulb': /\bled bulbs?\b|\bled lamps?\b|\blight ?bulbs?\b/i,
  downlight: /\bdownlights?\b|\bspotlights?\b/i,
  'extractor-fan': /\bextractor fans?\b|\bventilation fans?\b|\bbathroom fans?\b/i,
  valves: /\b(?:radiator|towel rail) valves?\b|\bvalves?\b/i,
  'underfloor-heating': /\bunderfloor heating\b|\bfloor heating\b/i,
  thermostat: /\bthermostat\b|\btemperature control\b/i,
  shower: /\bshower (?:system|kit|mixer|valve)\b/i,
  riser: /\b(?:fixed )?riser\b|\briser rail\b/i,
  'bath-filler': /\bbath filler\b|\bbath taps?\b/i,
  bath: /\bbath\b(?![ -]*(?:filler|mixer|taps?|screens?|panels?|waste))/i,
  'shower-tray': /\bshower tray\b(?![ -]*(?:waste|trap|legs?|riser|seal))/i,
  waste: /\bwaste\b|\btrap\b/i,
  'shower-door': /\bshower doors?\b|\bsliding doors?\b/i,
  'towel-rail': /\btowel rails?\b(?![ -]*(?:valves?|brackets?|elements?))|\btowel radiators?\b(?![ -]*valves?)/i,
  screen: /\b(?:bath|shower) screens?\b/i,
  'front-panel': /\b(?:bath|front) panel\b/i,
  'end-panel': /\bend panel\b/i,
  'side-panel': /\bside panel\b/i,
  worktop: /\bworktop\b/i,
};

export const sourcingComponents = Object.keys(PART_HINTS);
const hint = (part: string) => PART_HINTS[part] ?? new RegExp(`\\b${part.replace(/[^a-z0-9-]/gi, '').replace(/-/g, '[ -]')}\\b`, 'i');

/** Negation attaches to the named part, not every fixture earlier in the sentence. */
export function inferComponentEvidence(text: string, required = sourcingComponents): Record<string, ComponentEvidence> {
  const evidence: Record<string, ComponentEvidence> = {};
  const clauses = text.replace(/<[^>]*>/g, ' ').split(/[;\n]|\.(?!\d)/);
  for (const part of required) {
    const pattern = hint(part);
    const matches = clauses.flatMap((clause) => {
      const basinContext = /\bbasin[ -]+(?:tap|mixer|waste)\b/i.test(clause) && !/\b(?:bath|shower|tray)\b/i.test(clause);
      const match = pattern.exec(clause) ?? (part === 'basin-waste' && basinContext ? /\b(?:push[ -]button|click(?:[ -]clack)?|pop[ -]up) waste\b/i.exec(clause) : null);
      if (!match) return [];
      const before = clause.slice(Math.max(0, match.index - 45), match.index);
      const after = clause.slice(match.index + match[0].length);
      // Compatibility copy names other fixtures without supplying them.
      if (/\b(?:compatible with|suitable for|designed for use with|fits|for use with)\s+[^.;]*$/i.test(before)) return [];
      const negativeList = before.match(/(?:without|excludes?|excluding|does not include|not supplied with|not included:|sold separately:|no)\s+([^.;]*)$/i);
      const excluded = !!negativeList && !/\b(?:with|includes?|supplied|included)\b/i.test(negativeList[1])
        || /^\s*(?:(?:and|&|,)\s+(?!with\b|includes?\b)[a-z -]{1,40}\s+)?(?:is |are )?[:(-]?\s*(?:not included|not supplied|excluded|sold separately|optional|available separately)/i.test(after);
      const prefix = clause.slice(0, match.index);
      const count = prefix.match(/\b(\d+)\s*x\s*$/i) ?? prefix.match(/(?:^\s*|\b(?:includes?|contains?|with|and|pack of|set of)\s+|[,:]\s*)(\d+)\s*$/i);
      return [{ quantity: excluded ? 0 : count ? Number(count[1]) : 1, state: excluded ? 'excluded' as const : 'included' as const, source: 'supplier' as const, text: clause.trim().slice(0, 200) }];
    });
    if (matches.length) evidence[part] = matches.find((entry) => entry.state === 'excluded') ?? matches[0];
  }
  return evidence;
}

export function inferIncludedComponents(text: string, required: string[]) {
  return Object.entries(inferComponentEvidence(text, required)).filter(([, entry]) => entry.state === 'included').map(([part]) => part);
}

export function productComponentEvidence(product: SourcedProduct, required: string[]) {
  const text = [product.name, product.size, ...Object.entries(product.specs ?? {}).map(([key, value]) => `${key}: ${value}`), product.description].filter(Boolean).join('; ');
  const inferred = inferComponentEvidence(text, required);
  for (const part of product.components) if (!inferred[part]) inferred[part] = { quantity: 1, state: 'included', source: 'legacy' };
  return { ...inferred, ...product.componentEvidence };
}

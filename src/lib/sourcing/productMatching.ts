const PART_HINTS: Record<string, RegExp> = {
  'wc-unit': /\b(?:wc|toilet)\s*(?:furniture\s*)?(?:unit|cabinet)\b|\bback to wall unit\b/i,
  cistern: /\bcistern\b|\bflush tank\b/i,
  toilet: /\btoilet\b|\bwc pan\b/i,
  seat: /\btoilet seat\b|\bsoft close seat\b/i,
  basin: /\bbasin\b|\bwashbasin\b/i,
  vanity: /\bvanity\b|\bvanity unit\b/i,
  'basin-tap': /\bbasin tap\b|\bmixer tap\b/i,
  'basin-waste': /\bbasin waste\b|\bclick waste\b/i,
  'led-bulb': /\bled bulbs?\b|\bled lamps?\b|\blight ?bulbs?\b/i,
  downlight: /\bdownlights?\b|\bspotlights?\b/i,
  'extractor-fan': /\bextractor fans?\b|\bventilation fans?\b|\bbathroom fans?\b/i,
  valves: /\b(?:radiator|towel rail) valves?\b|\bvalves?\b/i,
  'underfloor-heating': /\bunderfloor heating\b|\bfloor heating\b/i,
  thermostat: /\bthermostat\b|\btemperature control\b/i,
  shower: /\bshower (?:system|kit|mixer|valve)\b/i,
  riser: /\b(?:fixed )?riser\b|\briser rail\b/i,
  'bath-filler': /\bbath filler\b|\bbath taps?\b/i,
  'shower-tray': /\bshower tray\b/i,
  waste: /\bwaste\b|\btrap\b/i,
  'shower-door': /\bshower doors?\b|\bsliding doors?\b/i,
  'towel-rail': /\btowel rails?\b|\btowel radiators?\b/i,
  screen: /\b(?:bath|shower) screens?\b/i,
};

/** Conservative title/description hints. The user reviews the included-parts checklist before saving. */
export function inferIncludedComponents(text: string, required: string[]) {
  return required.filter((part) => PART_HINTS[part]?.test(text) ?? new RegExp(`\\b${part.replace(/-/g, '[ -]')}\\b`, 'i').test(text));
}

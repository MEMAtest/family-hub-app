/** Only labelled supplier dimensions are trusted; an unlabelled size may be height, not width. */
export function labelledDimensions(text: string): Record<string, number> {
  const result: Record<string, number> = {};
  const dimension = (label: string) => /wid/i.test(label) ? 'widthMm' : /high|height/i.test(label) ? 'heightMm' : /long|length/i.test(label) ? 'lengthMm' : /deep|depth/i.test(label) ? 'depthMm' : 'thicknessMm';
  const patterns = [/(\d+(?:\.\d+)?)\s*(mm|cm)\s*(?:in\s+)?(wide|width|high|height|long|length|deep|depth|thick|thickness)\b/gi, /\b(width|height|length|depth|thickness)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(mm|cm)\b/gi];
  for (const [index, pattern] of patterns.entries()) for (const match of text.matchAll(pattern)) {
    const value = Number(match[index ? 2 : 1]) * (match[index ? 3 : 2].toLowerCase() === 'cm' ? 10 : 1);
    if (value > 0 && value <= 10000) result[dimension(match[index ? 1 : 3])] = value;
  }
  for (const size of text.matchAll(/\d+(?:\.\d+)?\s*[WHDL](?:\s*(?:x|×)\s*\d+(?:\.\d+)?\s*[WHDL]){1,3}\s*mm\b/gi))
    for (const match of size[0].matchAll(/(\d+(?:\.\d+)?)\s*([WHDL])\b/gi)) result[({ W: 'widthMm', H: 'heightMm', D: 'depthMm', L: 'lengthMm' })[match[2].toUpperCase()]!] = Number(match[1]);
  return result;
}

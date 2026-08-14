const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

function parseFractionToken(token: string): number | null {
  if (UNICODE_FRACTIONS[token] != null) return UNICODE_FRACTIONS[token];
  const slash = token.match(/^(\d+)\/(\d+)$/);
  if (!slash) return null;
  const denom = Number(slash[2]);
  if (!denom) return null;
  return Number(slash[1]) / denom;
}

function parseLeadingNumber(qty: string): { value: number; rest: string } | null {
  const trimmed = qty.trim();
  if (!trimmed) return null;

  const mixedSlash = trimmed.match(/^(\d+)\s+(\d+\/\d+)\s*(.*)$/);
  if (mixedSlash) {
    const frac = parseFractionToken(mixedSlash[2]);
    if (frac == null) return null;
    return { value: Number(mixedSlash[1]) + frac, rest: mixedSlash[3].trim() };
  }

  const mixedUnicode = trimmed.match(/^(\d+)\s+([½¼¾⅓⅔⅛⅜⅝⅞])\s*(.*)$/);
  if (mixedUnicode) {
    const frac = UNICODE_FRACTIONS[mixedUnicode[2]];
    if (frac == null) return null;
    return { value: Number(mixedUnicode[1]) + frac, rest: mixedUnicode[3].trim() };
  }

  const slash = trimmed.match(/^(\d+\/\d+)\s*(.*)$/);
  if (slash) {
    const frac = parseFractionToken(slash[1]);
    if (frac == null) return null;
    return { value: frac, rest: slash[2].trim() };
  }

  if (trimmed[0] in UNICODE_FRACTIONS) {
    const ch = trimmed[0];
    return { value: UNICODE_FRACTIONS[ch], rest: trimmed.slice(1).trim() };
  }

  const decimal = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (decimal) {
    return { value: Number(decimal[1]), rest: decimal[2].trim() };
  }

  return null;
}

function formatScaledNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return String(Math.round(rounded));
  }
  const str = rounded.toFixed(2).replace(/\.?0+$/, "");
  const asNum = Number(str);
  for (const [char, frac] of Object.entries(UNICODE_FRACTIONS)) {
    const whole = Math.floor(asNum);
    const remainder = asNum - whole;
    if (Math.abs(remainder - frac) < 0.02) {
      return whole > 0 ? `${whole}${char}` : char;
    }
  }
  return str;
}

export function scaleQuantity(qty: string, factor: number): string {
  const trimmed = qty.trim();
  if (!trimmed || factor === 1) return qty;

  const parsed = parseLeadingNumber(trimmed);
  if (!parsed) return qty;

  const scaled = parsed.value * factor;
  if (!Number.isFinite(scaled) || scaled <= 0) return qty;

  const formatted = formatScaledNumber(scaled);
  return parsed.rest ? `${formatted} ${parsed.rest}` : formatted;
}

export function scaledQtyForServings(
  qty: string,
  baseServings: number,
  currentServings: number,
): string {
  if (!qty.trim() || baseServings <= 0 || currentServings === baseServings) {
    return qty;
  }
  return scaleQuantity(qty, currentServings / baseServings);
}

export function qtyToBaseServings(
  qty: string,
  baseServings: number,
  currentServings: number,
): string {
  if (!qty.trim() || baseServings <= 0 || currentServings === baseServings) {
    return qty;
  }
  return scaleQuantity(qty, baseServings / currentServings);
}

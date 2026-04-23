/**
 * Card brand detection by BIN (issuer identification number).
 * Returns the matched brand or 'unknown' when no rule applies.
 *
 * Coverage tuned for Brazil:
 *   visa, mastercard, amex, elo, hipercard, diners, discover, jcb, aura
 *
 * Each rule uses the longest possible prefix range so partial input
 * (1–6 digits) can already preview the brand on the card UI.
 */

export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "elo"
  | "hipercard"
  | "diners"
  | "discover"
  | "jcb"
  | "aura"
  | "unknown";

interface BrandRule {
  brand: CardBrand;
  /** Returns true when the (raw, digits-only) number matches this brand. */
  test: (digits: string) => boolean;
}

const inRange = (digits: string, len: number, start: number, end: number) => {
  if (digits.length < 1) return false;
  const slice = digits.slice(0, Math.min(digits.length, len));
  if (!slice) return false;
  // Pad short input with the lower bound's leading digits so a partial number
  // can still be classified ("4011" → elo as soon as 4 digits are present).
  const padded = slice.padEnd(len, "0");
  const num = Number(padded);
  return num >= start && num <= end;
};

const startsWith = (digits: string, prefixes: string[]) =>
  prefixes.some((p) => digits.startsWith(p.slice(0, digits.length)) && digits.length >= 1 && p.startsWith(digits.slice(0, p.length)));

// Specific Elo BIN list (covers most Brazilian Elo issuances).
const ELO_BINS_4: string[] = [
  "4011", "4312", "4389", "4514", "4573", "5041", "5066", "5067",
  "5090", "6277", "6362", "6363", "6500", "6504", "6505", "6509",
  "6516", "6550",
];

const ELO_BINS_6_RANGES: Array<[number, number]> = [
  [401178, 401179],
  [438935, 438935],
  [451416, 451416],
  [457631, 457632],
  [504175, 504175],
  [506699, 506778],
  [509000, 509999],
  [627780, 627780],
  [636297, 636297],
  [636368, 636368],
  [650031, 650033],
  [650035, 650051],
  [650405, 650439],
  [650485, 650538],
  [650541, 650598],
  [650700, 650718],
  [650720, 650727],
  [650901, 650978],
  [651652, 651679],
  [655000, 655019],
  [655021, 655058],
];

const isElo = (d: string) => {
  if (!d) return false;
  // Match by first 4 digits as soon as available.
  if (d.length >= 4 && ELO_BINS_4.some((p) => d.startsWith(p))) return true;
  // Then refine with 6-digit ranges if number is long enough.
  if (d.length >= 6) {
    const six = Number(d.slice(0, 6));
    return ELO_BINS_6_RANGES.some(([lo, hi]) => six >= lo && six <= hi);
  }
  return false;
};

const RULES: BrandRule[] = [
  // Elo first — its BINs overlap with Visa/Master ranges (e.g. 4011, 5067).
  { brand: "elo", test: isElo },

  // Hipercard
  { brand: "hipercard", test: (d) => d.startsWith("606282") || d.startsWith("3841") || (d.length >= 4 && d.startsWith("6062")) },

  // Amex — 34 / 37
  { brand: "amex", test: (d) => /^3[47]/.test(d) },

  // Diners Club — 300-305, 36, 38, 39
  { brand: "diners", test: (d) => /^3(0[0-5]|[689])/.test(d) },

  // JCB — 35
  { brand: "jcb", test: (d) => /^35/.test(d) },

  // Discover — 6011, 622126-622925, 644-649, 65
  {
    brand: "discover",
    test: (d) =>
      d.startsWith("6011") ||
      /^65/.test(d) ||
      /^64[4-9]/.test(d) ||
      (d.length >= 6 && inRange(d, 6, 622126, 622925)),
  },

  // Aura (Brasil) — começa com 50 (mas não conflita com Maestro 5018/5020/5038/6304…)
  { brand: "aura", test: (d) => d.length >= 2 && d.startsWith("50") },

  // Mastercard — 51-55 e 2221-2720
  {
    brand: "mastercard",
    test: (d) =>
      /^5[1-5]/.test(d) ||
      (d.length >= 4 && inRange(d, 4, 2221, 2720)),
  },

  // Visa — 4 (mais ampla, vai por último)
  { brand: "visa", test: (d) => d.startsWith("4") },
];

export function detectCardBrand(value: string): CardBrand {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "unknown";
  for (const rule of RULES) {
    if (rule.test(digits)) return rule.brand;
  }
  return "unknown";
}

/** Iconify icon name per brand (set "logos" — official, no extra package). */
export const BRAND_ICONS: Record<Exclude<CardBrand, "unknown">, string> = {
  visa: "logos:visa",
  mastercard: "logos:mastercard",
  amex: "logos:amex",
  elo: "logos:elo",
  hipercard: "simple-icons:hipercard",
  diners: "logos:diners-club",
  discover: "logos:discover",
  jcb: "logos:jcb",
  aura: "simple-icons:visa", // fallback genérico
};

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  aura: "Aura",
  unknown: "",
};

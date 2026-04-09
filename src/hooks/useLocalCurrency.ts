import { useState, useEffect } from "react";

/**
 * Map country codes to their currency codes and symbols.
 */
const countryToCurrency: Record<string, { code: string; symbol: string; position: "before" | "after" }> = {
  US: { code: "USD", symbol: "$", position: "before" },
  BR: { code: "BRL", symbol: "R$", position: "before" },
  MX: { code: "MXN", symbol: "$", position: "before" },
  CO: { code: "COP", symbol: "$", position: "before" },
  AR: { code: "ARS", symbol: "$", position: "before" },
  PE: { code: "PEN", symbol: "S/", position: "before" },
  CL: { code: "CLP", symbol: "$", position: "before" },
  EC: { code: "USD", symbol: "$", position: "before" },
  UY: { code: "UYU", symbol: "$", position: "before" },
  PY: { code: "PYG", symbol: "₲", position: "before" },
  BO: { code: "BOB", symbol: "Bs", position: "before" },
  CR: { code: "CRC", symbol: "₡", position: "before" },
  PA: { code: "USD", symbol: "$", position: "before" },
  DO: { code: "DOP", symbol: "RD$", position: "before" },
  GT: { code: "GTQ", symbol: "Q", position: "before" },
  HN: { code: "HNL", symbol: "L", position: "before" },
  NI: { code: "NIO", symbol: "C$", position: "before" },
  SV: { code: "USD", symbol: "$", position: "before" },
  VE: { code: "VES", symbol: "Bs", position: "before" },
  GB: { code: "GBP", symbol: "£", position: "before" },
  EU: { code: "EUR", symbol: "€", position: "before" },
  DE: { code: "EUR", symbol: "€", position: "after" },
  FR: { code: "EUR", symbol: "€", position: "after" },
  ES: { code: "EUR", symbol: "€", position: "after" },
  IT: { code: "EUR", symbol: "€", position: "after" },
  PT: { code: "EUR", symbol: "€", position: "after" },
  NL: { code: "EUR", symbol: "€", position: "after" },
  BE: { code: "EUR", symbol: "€", position: "after" },
  AT: { code: "EUR", symbol: "€", position: "after" },
  IE: { code: "EUR", symbol: "€", position: "before" },
  FI: { code: "EUR", symbol: "€", position: "after" },
  GR: { code: "EUR", symbol: "€", position: "before" },
  CA: { code: "CAD", symbol: "CA$", position: "before" },
  AU: { code: "AUD", symbol: "A$", position: "before" },
  NZ: { code: "NZD", symbol: "NZ$", position: "before" },
  JP: { code: "JPY", symbol: "¥", position: "before" },
  CN: { code: "CNY", symbol: "¥", position: "before" },
  KR: { code: "KRW", symbol: "₩", position: "before" },
  IN: { code: "INR", symbol: "₹", position: "before" },
  RU: { code: "RUB", symbol: "₽", position: "after" },
  TR: { code: "TRY", symbol: "₺", position: "before" },
  ZA: { code: "ZAR", symbol: "R", position: "before" },
  NG: { code: "NGN", symbol: "₦", position: "before" },
  EG: { code: "EGP", symbol: "E£", position: "before" },
  SA: { code: "SAR", symbol: "﷼", position: "after" },
  AE: { code: "AED", symbol: "د.إ", position: "after" },
  IL: { code: "ILS", symbol: "₪", position: "before" },
  TH: { code: "THB", symbol: "฿", position: "before" },
  ID: { code: "IDR", symbol: "Rp", position: "before" },
  MY: { code: "MYR", symbol: "RM", position: "before" },
  PH: { code: "PHP", symbol: "₱", position: "before" },
  VN: { code: "VND", symbol: "₫", position: "after" },
  PK: { code: "PKR", symbol: "₨", position: "before" },
  BD: { code: "BDT", symbol: "৳", position: "before" },
  PL: { code: "PLN", symbol: "zł", position: "after" },
  CZ: { code: "CZK", symbol: "Kč", position: "after" },
  HU: { code: "HUF", symbol: "Ft", position: "after" },
  RO: { code: "RON", symbol: "lei", position: "after" },
  SE: { code: "SEK", symbol: "kr", position: "after" },
  NO: { code: "NOK", symbol: "kr", position: "after" },
  DK: { code: "DKK", symbol: "kr", position: "after" },
  CH: { code: "CHF", symbol: "CHF", position: "before" },
  SG: { code: "SGD", symbol: "S$", position: "before" },
  HK: { code: "HKD", symbol: "HK$", position: "before" },
  TW: { code: "TWD", symbol: "NT$", position: "before" },
  KE: { code: "KES", symbol: "KSh", position: "before" },
  GH: { code: "GHS", symbol: "₵", position: "before" },
  UA: { code: "UAH", symbol: "₴", position: "before" },
};

interface LocalCurrencyResult {
  localAmount: number | null;
  localCurrency: string | null;
  localSymbol: string | null;
  localFormatted: string | null;
  loading: boolean;
}

/**
 * Convert a USD amount to the visitor's local currency for display purposes.
 * Uses the free frankfurter.app API (ECB rates, no key needed).
 * Only fetches if country is NOT USD-based.
 */
export function useLocalCurrency(
  usdAmount: number,
  countryCode: string
): LocalCurrencyResult {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const currencyInfo = countryToCurrency[countryCode];
  const targetCurrency = currencyInfo?.code || null;
  const isUsdCountry = !targetCurrency || targetCurrency === "USD";

  useEffect(() => {
    if (isUsdCountry || !targetCurrency) return;

    const cacheKey = `fx_rate_${targetCurrency}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache for 1 hour
      if (Date.now() - parsed.ts < 3600000) {
        setRate(parsed.rate);
        return;
      }
    }

    let cancelled = false;
    setLoading(true);

    const fetchRate = async () => {
      try {
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=USD&to=${targetCurrency}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          const r = data?.rates?.[targetCurrency];
          if (r) {
            setRate(r);
            sessionStorage.setItem(cacheKey, JSON.stringify({ rate: r, ts: Date.now() }));
          }
        }
      } catch {
        // silently fail — USD price is always shown as primary
      }
      if (!cancelled) setLoading(false);
    };

    fetchRate();
    return () => { cancelled = true; };
  }, [targetCurrency, isUsdCountry]);

  if (isUsdCountry || rate === null) {
    return { localAmount: null, localCurrency: null, localSymbol: null, localFormatted: null, loading };
  }

  const localAmount = Math.round(usdAmount * rate * 100) / 100;
  const symbol = currencyInfo!.symbol;
  const position = currencyInfo!.position;

  // Format with appropriate decimal places
  const noDecimalCurrencies = ["JPY", "KRW", "CLP", "PYG", "VND", "HUF", "IDR"];
  const decimals = noDecimalCurrencies.includes(targetCurrency!) ? 0 : 2;
  const formattedNum = localAmount.toFixed(decimals);

  const localFormatted = position === "before"
    ? `${symbol}${formattedNum}`
    : `${formattedNum} ${symbol}`;

  return {
    localAmount,
    localCurrency: targetCurrency,
    localSymbol: symbol,
    localFormatted,
    loading,
  };
}

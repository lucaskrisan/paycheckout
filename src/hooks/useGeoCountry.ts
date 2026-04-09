import { useState, useEffect } from "react";

/**
 * Auto-detect visitor country by IP using free geolocation APIs.
 * Falls back to "US" if detection fails.
 * Caches result in sessionStorage to avoid repeated calls.
 */
export function useGeoCountry(defaultCountry = "US") {
  const [country, setCountry] = useState(defaultCountry);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("geo_country");
    if (cached) {
      setCountry(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const detect = async () => {
      try {
        // Primary: ipapi.co (free, no key needed, 1000 req/day)
        const res = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(4000),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.country_code) {
            sessionStorage.setItem("geo_country", data.country_code);
            setCountry(data.country_code);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fallback
      }

      try {
        // Fallback: ip-api.com (free, 45 req/min)
        const res = await fetch("http://ip-api.com/json/?fields=countryCode", {
          signal: AbortSignal.timeout(4000),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.countryCode) {
            sessionStorage.setItem("geo_country", data.countryCode);
            setCountry(data.countryCode);
            setLoading(false);
            return;
          }
        }
      } catch {
        // use default
      }

      if (!cancelled) setLoading(false);
    };

    detect();
    return () => { cancelled = true; };
  }, []);

  return { country, loading };
}

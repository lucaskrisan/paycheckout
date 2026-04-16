/**
 * Cloudflare Worker geo helper.
 *
 * O endpoint `https://geo.panttera.com.br` (Cloudflare Worker) retorna um JSON
 * com geolocalização baseada no IP do visitante. `bootGeo()` busca esse JSON
 * uma vez por aba (cache em sessionStorage) e popula `window.cfGeo` antes do
 * React montar. Os helpers abaixo lêem `window.cfGeo` de forma 100% síncrona.
 *
 * Em ambientes onde o Worker não responde (timeout/falha), `window.cfGeo` fica
 * `undefined` e tudo segue funcionando com fallbacks vazios.
 */

const GEO_ENDPOINT = "https://geo.panttera.com.br";
const GEO_CACHE_KEY = "cfGeo";
const GEO_TIMEOUT_MS = 1500;

/**
 * Busca geo do Worker e popula `window.cfGeo`. Idempotente e silencioso em erro.
 * Usa cache em sessionStorage pra só fazer 1 request por aba.
 */
export async function bootGeo(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.cfGeo) return;

  // Tenta cache primeiro (sessionStorage)
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CfGeo;
      if (parsed && typeof parsed === "object") {
        window.cfGeo = parsed;
        return;
      }
    }
  } catch {
    // sessionStorage indisponível (modo privado, etc.) — segue pro fetch
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    const res = await fetch(GEO_ENDPOINT, {
      method: "GET",
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const geo = (await res.json()) as CfGeo;
    if (!geo || typeof geo !== "object") return;
    window.cfGeo = geo;
    try {
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geo));
    } catch {
      // ignora — cache é otimização, não requisito
    }
  } catch {
    // Timeout, rede caída, CORS — degradação graciosa
  }
}

export function getCfGeo(): CfGeo | null {
  if (typeof window === "undefined") return null;
  return window.cfGeo ?? null;
}

export function getCountry(fallback = ""): string {
  return (getCfGeo()?.country || fallback).toUpperCase();
}

export function getCurrency(fallback = ""): string {
  return (getCfGeo()?.currency || fallback).toUpperCase();
}

export function getCity(fallback = ""): string {
  return getCfGeo()?.city || fallback;
}

export function getState(fallback = ""): string {
  return getCfGeo()?.regionCode || getCfGeo()?.region || fallback;
}

export function getZip(fallback = ""): string {
  return getCfGeo()?.postal || fallback;
}

/** Versão hash-friendly: lowercase, sem espaços, sem pontuação para Meta CAPI. */
export function normalizeForHash(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/[^\w]/g, "");
}

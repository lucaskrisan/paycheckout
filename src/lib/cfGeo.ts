/**
 * Cloudflare Worker geo helper.
 *
 * The Cloudflare Worker (rodando em app.panttera.com.br/*) injeta
 * `window.cfGeo` no HTML antes do React montar. Em ambientes onde o Worker
 * NÃO roda (preview Lovable, dev local), `window.cfGeo` é `undefined` e os
 * helpers retornam `null`/fallbacks — código segue gracioso, sem quebrar.
 *
 * Ler estes valores é 100% síncrono e zero rede.
 */
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

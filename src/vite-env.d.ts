/// <reference types="vite/client" />

interface CfGeo {
  ip?: string;
  city?: string;
  region?: string;
  regionCode?: string;
  country?: string;
  postal?: string;
  timezone?: string;
  currency?: string;
  latitude?: string;
  longitude?: string;
  source?: string;
}

interface Window {
  cfGeo?: CfGeo;
}

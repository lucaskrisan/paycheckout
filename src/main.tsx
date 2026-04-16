import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  isDynamicImportFailure,
  recoverFromDynamicImportFailure,
  scheduleDynamicImportRecoveryReset,
} from "@/lib/dynamicImportRecovery";
import { bootGeo } from "@/lib/cfGeo";

scheduleDynamicImportRecoveryReset();

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromDynamicImportFailure();
});

window.addEventListener("error", (event) => {
  if (!isDynamicImportFailure(event.error)) return;
  event.preventDefault();
  recoverFromDynamicImportFailure();
});

window.addEventListener("unhandledrejection", (event) => {
  if (!isDynamicImportFailure(event.reason)) return;
  event.preventDefault();
  recoverFromDynamicImportFailure();
});

// Busca geolocalização do Cloudflare Worker antes de montar o React.
// Timeout interno de 1.5s + Promise.race garante que nunca bloqueia o boot.
const geoBootPromise = Promise.race([
  bootGeo(),
  new Promise<void>((resolve) => setTimeout(resolve, 1500)),
]);

geoBootPromise.finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});

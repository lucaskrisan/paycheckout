import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import globalStyles from "./index.css?inline";
import {
  isDynamicImportFailure,
  recoverFromDynamicImportFailure,
  scheduleDynamicImportRecoveryReset,
} from "@/lib/dynamicImportRecovery";
import { cleanupStaleBrowserCaches } from "@/lib/staleCacheCleanup";

const STYLE_TAG_ID = "app-global-styles";

if (typeof document !== "undefined" && !document.getElementById(STYLE_TAG_ID)) {
  const styleTag = document.createElement("style");
  styleTag.id = STYLE_TAG_ID;
  styleTag.textContent = globalStyles;
  document.head.appendChild(styleTag);
}

scheduleDynamicImportRecoveryReset();

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

// Limpeza de Service Workers órfãos e caches antigos do navegador.
// Não bloqueia o boot — roda em background.
cleanupStaleBrowserCaches().then(() => {
  // Registra o SW mínimo do PWA (necessário para `beforeinstallprompt`).
  // Guardado para não rodar em iframe de preview do Lovable (causa stale builds).
  if (!isInIframe && !isPreviewHost && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/pwa-sw.js", { scope: "/" })
      .catch((err) => console.warn("[pwa-sw] register failed:", err));
  }
});

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

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Critical: Root element not found");
}

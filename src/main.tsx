import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const DYNAMIC_IMPORT_RELOAD_KEY = "__dynamic_import_recovery__";
const DYNAMIC_IMPORT_RELOAD_WINDOW_MS = 15_000;

const getErrorMessage = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
};

const isDynamicImportFailure = (value: unknown) => {
  const message = getErrorMessage(value);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message);
};

const recoverFromDynamicImportFailure = () => {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    const raw = sessionStorage.getItem(DYNAMIC_IMPORT_RELOAD_KEY);
    const previousAttempt = raw ? (JSON.parse(raw) as { path?: string; ts?: number }) : null;

    if (
      previousAttempt?.path === currentPath &&
      typeof previousAttempt.ts === "number" &&
      Date.now() - previousAttempt.ts < DYNAMIC_IMPORT_RELOAD_WINDOW_MS
    ) {
      return;
    }

    sessionStorage.setItem(
      DYNAMIC_IMPORT_RELOAD_KEY,
      JSON.stringify({ path: currentPath, ts: Date.now() }),
    );
  } catch {
    // Ignore storage issues and still try a hard reload.
  }

  window.location.reload();
};

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

createRoot(document.getElementById("root")!).render(<App />);

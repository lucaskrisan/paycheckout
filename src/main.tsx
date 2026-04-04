import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  isDynamicImportFailure,
  recoverFromDynamicImportFailure,
  scheduleDynamicImportRecoveryReset,
} from "@/lib/dynamicImportRecovery";

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

createRoot(document.getElementById("root")!).render(<App />);

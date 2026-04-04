import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "recharts",
      "lodash/get",
      "lodash/isEqual",
      "lodash/throttle",
      "lodash/isNil",
      "lodash/isFunction",
      "lodash/isString",
      "lodash/isNumber",
      "lodash/isNaN",
      "lodash/upperFirst",
      "lodash/isObject",
      "lodash/isArray",
      "lodash/isBoolean",
      "lodash/last",
      "lodash/max",
      "lodash/min",
      "lodash/range",
      "lodash/flatMap",
      "lodash/uniqBy",
      "lodash/sortBy",
      "lodash/mapValues",
      "lodash/every",
      "lodash/some",
    ],
  },
});

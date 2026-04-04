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
      "recharts > lodash/get",
      "recharts > lodash/isEqual",
      "recharts > lodash/throttle",
      "recharts > lodash/isNil",
      "recharts > lodash/isFunction",
      "recharts > lodash/isString",
      "recharts > lodash/isNumber",
      "recharts > lodash/isNaN",
      "recharts > lodash/upperFirst",
      "recharts > lodash/isObject",
      "recharts > lodash/isArray",
      "recharts > lodash/isBoolean",
      "recharts > lodash/last",
      "recharts > lodash/max",
      "recharts > lodash/min",
      "recharts > lodash/range",
      "recharts > lodash/flatMap",
      "recharts > lodash/uniqBy",
      "recharts > lodash/sortBy",
      "recharts > lodash/mapValues",
      "recharts > lodash/every",
      "recharts > lodash/some",
    ],
  },
});

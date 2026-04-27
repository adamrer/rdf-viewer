// vite.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: resolve(__dirname, "./index.html"),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
    },
  },
});

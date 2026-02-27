// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        app: './index.html',
      },
    }
  },
  server: {
    open: "./index.html",
    watch: {
      usePolling: true
    }
  }
});

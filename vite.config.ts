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
  // server: {
  //   open: "./view/index.html",
  //   watch: {
  //     usePolling: true
  //   }
  // }
});

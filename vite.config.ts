// vite.config.ts
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    // copy plugins to dist/plugins
    viteStaticCopy({
      targets: [
        {
          src: 'plugins/*',
          dest: 'plugins'
        }
      ]
    })
  ],
  base: './',
})
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // The help page is its own HTML entry so `/help` is a real file
      // (dist/help/index.html) on any static host, with no rewrite rules.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        help: resolve(import.meta.dirname, 'help/index.html'),
      },
    },
  },
})

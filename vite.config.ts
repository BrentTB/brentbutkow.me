/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Installs a working localStorage/sessionStorage. Node 22+ ships an inert native Web Storage global
    // that shadows jsdom's in the Vitest environment, so without this storage-backed tests fail.
    setupFiles: ['./vitest.setup.ts'],
    // Repo tests are colocated under src/. Hook tests in .claude/ run via `npm run test:hooks`
    // (node --test) since they use node:test, which Vite can't bundle.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})

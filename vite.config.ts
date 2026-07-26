/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { prerenderMeta } from './scripts/prerender-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // Pinned, and deliberately not allowed to wander: Vite's fallback walk is 5173 -> 5174 -> 5175, and
    // 5174 belongs to something else on this machine. Failing loudly on a busy port beats quietly taking
    // a port that is already someone's.
    port: 5173,
    strictPort: true,
  },
  plugins: [react(), prerenderMeta()],
  test: {
    environment: 'jsdom',
    // Installs a working localStorage/sessionStorage. Node 22+ ships an inert native Web Storage global
    // that shadows jsdom's in the Vitest environment, so without this storage-backed tests fail.
    setupFiles: ['./vitest.setup.ts'],
    // Repo tests are colocated under src/ and scripts/. Hook tests in .claude/ run via
    // `npm run test:hooks` (node --test) since they use node:test, which Vite can't bundle.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.{ts,tsx}'],
  },
})

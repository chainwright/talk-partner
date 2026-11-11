import { defineConfig } from 'vitest/config';

// The web client lives in web/. The shared core (core/) is imported from there by relative path.
// Firebase web config comes from VITE_FIREBASE_* variables in .env.local (gitignored); see .env.example.
export default defineConfig({
  root: 'web',
  envDir: '..',
  publicDir: 'public',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5179, strictPort: true },
  preview: { port: 5179, strictPort: true },
  test: {
    root: '.',
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});

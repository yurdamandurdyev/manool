import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ integrations: [react()], vite: {
  // Keep build/check dependency optimization from poisoning the running dev server.
  cacheDir: process.env.NODE_ENV === 'production' ? 'node_modules/.vite-production' : 'node_modules/.vite-development',
  plugins: [tailwindcss()]
} });

import { defineConfig } from 'astro/config';
import baseConfig from '../astro.config.mjs';

// A deterministic browser-test server; no HMR resets while measuring 10s dwell.
export default defineConfig({
  ...baseConfig,
  devToolbar: { enabled: false },
  vite: {
    ...baseConfig.vite,
    server: { ...baseConfig.vite?.server, watch: null, hmr: false },
  },
});

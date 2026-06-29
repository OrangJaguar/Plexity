import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { yahooCrumbProxy } from './scripts/yahoo-crumb-proxy.js'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  server: {
    proxy: {
      '/yahoo-finance': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo-finance/, ''),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Veridian/1.0)' },
      },
    },
  },
  plugins: [
    yahooCrumbProxy(),
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
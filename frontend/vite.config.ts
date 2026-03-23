import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime'
    }
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting to optimize bundle loading:
        // - icons: small stable chunk with lucide-preact icons
        // - vendors: core dependencies (preact, wouter)
        manualChunks: (id) => {
          if (id.includes('node_modules/lucide-preact')) {
            return 'icons';
          }
          if (id.includes('/node_modules/preact/') || id.includes('/node_modules/wouter/')) {
            return 'vendors';
          }
        }
      }
    }
  }
})

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
    rollupOptions: {
      output: {
        // Manual chunk splitting to optimize bundle loading:
        // - echarts: loaded only when /deep-dive is accessed (lazy route)
        // - icons: small stable chunk with lucide-preact icons
        // - vendors: core dependencies (preact, wouter, yaml)
        manualChunks: (id) => {
          if (id.includes('node_modules/echarts')) {
            return 'echarts';
          }
          if (id.includes('node_modules/lucide-preact')) {
            return 'icons';
          }
          if (id.includes('node_modules/(preact|wouter|yaml)')) {
            return 'vendors';
          }
        }
      }
    }
  }
})

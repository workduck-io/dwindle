import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },
  server: {
    port: 3000,
  },
  build: {
    minify: false,
    sourcemap: true,
    outDir: 'dist',
  },
  define: {
    'process.env': {},
  },
  plugins: [react(), svgr()],
})

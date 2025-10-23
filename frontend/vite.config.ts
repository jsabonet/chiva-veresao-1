import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    cors: true,
    // Proxy API requests to the Django backend during development
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  // Production build optimizations
  build: {
    sourcemap: mode === 'development',
    target: 'es2019',
    cssCodeSplit: true,
    brotliSize: false,
    rollupOptions: {
      output: {
        // Use smaller chunk names and enable manual chunks if needed later
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      },
      plugins: [
        process.env.ANALYZE === '1' && visualizer({
          filename: 'dist/report.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap'
        })
      ].filter(Boolean)
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

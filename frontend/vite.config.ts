import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean);

  // Enable bundle visualizer only when requested to avoid dependency in prod builds
  if (process.env.ANALYZE === '1') {
    try {
      const mod: any = await import('rollup-plugin-visualizer');
      const visualizer = mod?.visualizer ?? mod.default;
      if (visualizer) {
        plugins.push(
          visualizer({
            filename: 'dist/report.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          })
        );
      }
    } catch (e) {
      // Ignore if plugin is not installed in the environment
    }
  }

  return ({
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
    plugins,
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
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
});

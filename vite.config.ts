import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        proxyTimeout: 60000,  // 60s – prevents ERR_CONNECTION_ABORTED on file uploads
        timeout: 60000,
      },
      "/uploads": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        proxyTimeout: 60000,
        timeout: 60000,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // manualChunks can sometimes cause issues with dynamic imports
        // if not configured correctly. Let Vite handle it naturally.
      },
    },
  },
}));

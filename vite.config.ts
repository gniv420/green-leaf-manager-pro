
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Exclude Node.js built-in modules from being bundled
  optimizeDeps: {
    exclude: ['sqlite3', 'sqlite']
  },
  // Allow Node.js modules to be externalized
  build: {
    commonjsOptions: {
      esmExternals: true,
    },
    rollupOptions: {
      external: ['sqlite3', 'sqlite', 'fs', 'path']
    }
  }
}));

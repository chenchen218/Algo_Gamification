import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // Proxy setup for development mode
  server: {
    proxy: {
      // Proxy API requests to the backend
      "/api": {
        target: "http://localhost:3000/api", // Your backend server address
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""), // Remove /api prefix
      },
    },
  },

  // Build configuration for Vite
  build: {
    target: "esnext", // Ensures it targets browsers that support top-level await
    rollupOptions: {
      input: {
        // Define all the HTML pages you want to bundle
        main: resolve(__dirname, "./index.html"),
      },
    },
  },
});

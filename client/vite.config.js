import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_PROXY || "http://localhost:5000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 3000,
      open: true,
      // In development the browser calls /api on the Vite server, which forwards to Express.
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
    build: {
      target: "es2020",
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Long-lived vendor chunks: app deploys don't invalidate the cached libraries.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("@tanstack") || id.includes("redux") || id.includes("@reduxjs") || id.includes("immer") || id.includes("reselect")) {
              return "vendor-state";
            }
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("axios") || id.includes("react-hot-toast") || id.includes("goober")) return "vendor-utils";
            return "vendor";
          },
        },
      },
    },
  };
});

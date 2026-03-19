import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

function spaFallbackPlugin(): Plugin {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, "dist");
      const indexPath = path.join(distDir, "index.html");
      // 404.html — GitHub Pages SPA routing: serves index.html for any unknown path
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, path.join(distDir, "404.html"));
      }
      // .nojekyll — tells GitHub Pages NOT to run Jekyll processing
      // (required for files/dirs that start with underscore, e.g. _app.js)
      fs.writeFileSync(path.join(distDir, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    spaFallbackPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/jspdf-autotable")) return "vendor-pdf";
          if (id.includes("node_modules/xlsx")) return "vendor-xlsx";
          if (id.includes("node_modules/zod")) return "vendor-zod";
          if (id.includes("node_modules/dompurify")) return "vendor-dompurify";
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory")) return "vendor-charts";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
  },
});

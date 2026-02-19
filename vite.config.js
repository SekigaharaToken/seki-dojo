import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "child_process";

let commitHash = "unknown";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) commitHash = sha.slice(0, 7);
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Deduplicate packages — engine's file: dep has its own copies
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
      "i18next": path.resolve(__dirname, "./node_modules/i18next"),
      "react-i18next": path.resolve(__dirname, "./node_modules/react-i18next"),
    },
    dedupe: ["react", "react-dom", "i18next", "react-i18next"],
  },
  optimizeDeps: {
    // Engine is pre-bundled by esbuild (handles JSX natively).
    // After updating the engine: rm -rf node_modules/.vite && npm run dev
  },
  test: {
    root: path.resolve(__dirname),
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
    pool: "forks",
    include: ["src/**/*.{test,spec}.{js,jsx}", "scripts/**/*.{test,spec}.{js,jsx}"],
    exclude: ["node_modules/**"],
    server: {
      deps: {
        inline: [/@vanilla-extract/, "@sekigahara/engine", /@radix-ui/],
      },
    },
  },
});

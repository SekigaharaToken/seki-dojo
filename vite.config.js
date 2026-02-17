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
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
    pool: "vmThreads",
    include: ["src/**/*.{test,spec}.{js,jsx}", "scripts/**/*.{test,spec}.{js,jsx}"],
  },
});

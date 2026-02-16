/**
 * Environment variable helper — works in both Vite (import.meta.env)
 * and plain Node.js (process.env).
 */
export function getEnv(key, fallback = "") {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] ?? fallback;
  }
  return process.env[key] ?? fallback;
}

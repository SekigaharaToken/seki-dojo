const PREFIX = "dojo:immutable:";

/**
 * Read/write cache for onchain values that never change once set.
 * Uses localStorage with a namespaced prefix.
 */
export function getCached(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCached(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or disabled — silently ignore
  }
}

/**
 * Cache a value only when truthy (one-way latch).
 * Useful for flags like hasClaimed that go false→true permanently.
 */
export function setCachedOnce(key, value) {
  if (value) setCached(key, value);
}

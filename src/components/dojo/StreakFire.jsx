/**
 * Decorative flame icon that scales with streak length.
 * Pure CSS animation — no JS state.
 */
export function StreakFire({ streak = 0 }) {
  if (streak <= 0) return null;

  // Scale intensity: small flame at 1, large at 30+
  const scale = Math.min(1 + streak * 0.02, 1.6);

  return (
    <span
      aria-hidden="true"
      className="inline-block animate-pulse"
      style={{ fontSize: `${scale}em` }}
    >
      🔥
    </span>
  );
}

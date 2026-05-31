/* Lightweight Suspense fallback used while lazy route chunks load.
   Intentionally minimal — PR2 introduces proper Skeleton atoms. */
const RouteFallback = () => (
  <div
    style={{
      minHeight: "60vh",
      display: "grid",
      placeItems: "center",
      color: "var(--fg-muted, #94a3b8)",
      fontFamily: "var(--font-sans, system-ui)",
      fontSize: 14,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}
    role="status"
    aria-live="polite"
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "2px solid var(--border-subtle, rgba(255,255,255,0.08))",
        borderTopColor: "var(--brand-500, #ff8a00)",
        animation: "rf-spin 700ms linear infinite",
      }}
    />
    <style>{`@keyframes rf-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default RouteFallback;

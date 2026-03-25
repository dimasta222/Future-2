export default function TshirtOrderFlyingBadge({ item }) {
  return (
    <div
      style={{
        position: "fixed",
        left: item.startX - 90,
        top: item.startY - 18,
        zIndex: 60,
        pointerEvents: "none",
        "--dx": `${item.dx}px`,
        "--dy": `${item.dy}px`,
        "--lift": `${item.lift}px`,
        animation: "cartFly .9s cubic-bezier(.22,.8,.24,1) forwards",
        willChange: "transform, opacity, filter",
      }}
    >
      <div style={{ maxWidth: 180, padding: "9px 14px", borderRadius: 999, background: "linear-gradient(135deg,rgba(232,67,147,.96),rgba(108,92,231,.96))", boxShadow: "0 16px 38px rgba(232,67,147,.28)", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", backdropFilter: "blur(8px)" }}>
        {item.label}
      </div>
    </div>
  );
}
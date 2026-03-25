export default function TshirtSizeGuideTrigger({ onToggle }) {
  return (
    <div className="cs" style={{ padding: 22, marginBottom: 24, border: "1px solid rgba(255,255,255,.06)" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "none",
          border: "none",
          color: "#f0eef5",
          cursor: "pointer",
          padding: 0,
          fontFamily: "'Outfit',sans-serif",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 6 }}>Спецификация</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>Размерная сетка</div>
          <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 6 }}>Открывает отдельное окно поверх страницы с таблицами размеров.</div>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M9 21H3v-6" />
            <path d="m3 21 11-11" />
          </svg>
        </div>
      </button>
    </div>
  );
}
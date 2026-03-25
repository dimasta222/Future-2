import TshirtSizeGuideTable from "./TshirtSizeGuideTable.jsx";

export default function TshirtSizeGuideModal({ sections, onClose }) {
  return (
    <div
      onClick={onClose}
      className="modal-shell"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(6,6,10,.78)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="cs modal-card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "min(82vh, 920px)",
          overflow: "auto",
          padding: 24,
          border: "1px solid rgba(255,255,255,.08)",
          boxShadow: "0 28px 90px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 8 }}>Спецификация</div>
            <div style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 500 }}>Размерная сетка футболок</div>
            <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 8 }}>Окно открывается поверх страницы. Закрывается по крестику, клику вне окна или клавишей `Esc`.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.04)",
              color: "#f0eef5",
              cursor: "pointer",
              flexShrink: 0,
              fontSize: 20,
              lineHeight: 1,
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            ×
          </button>
        </div>

        <div className="size-guide-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, alignItems: "start" }}>
          {sections.map((section) => (
            <TshirtSizeGuideTable key={section.title} title={section.title} rows={section.rows} />
          ))}
        </div>

        <div style={{ fontSize: 13, color: "rgba(240,238,245,.4)", marginTop: 14 }}>Все параметры указаны в сантиметрах. Если нужна помощь с подбором размера, можно добавить комментарий при заказе.</div>
      </div>
    </div>
  );
}
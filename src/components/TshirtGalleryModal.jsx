export default function TshirtGalleryModal({ galleryModal, onClose, onSelectIndex }) {
  return (
    <div
      onClick={onClose}
      className="modal-shell"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(5,5,9,.84)",
        backdropFilter: "blur(12px)",
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
          width: "min(1180px, 100%)",
          maxHeight: "min(88vh, 980px)",
          overflow: "auto",
          padding: 24,
          border: "1px solid rgba(255,255,255,.08)",
          boxShadow: "0 28px 90px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 8 }}>Фото изделия</div>
            <div style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 500 }}>{galleryModal.title}</div>
            <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 8 }}>Листайте стрелками ← → или переключайте миниатюры ниже.</div>
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

        <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
          <img
            src={galleryModal.slides[galleryModal.activeIndex]?.src}
            alt={galleryModal.slides[galleryModal.activeIndex]?.alt}
            draggable={false}
            style={{ width: "100%", display: "block", maxHeight: "68vh", objectFit: "contain", userSelect: "none", WebkitUserDrag: "none" }}
          />
        </div>

        <div className="gallery-thumb-grid" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {galleryModal.slides.map((slide, index) => {
            const active = galleryModal.activeIndex === index;
            return (
              <button
                key={`${slide.key}-${slide.colorName}`}
                type="button"
                onClick={() => onSelectIndex(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 8,
                  borderRadius: 16,
                  minWidth: 220,
                  border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.06)",
                  background: active ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)",
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  textAlign: "left",
                }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  draggable={false}
                  style={{ width: 66, height: 66, borderRadius: 12, objectFit: "cover", display: "block", userSelect: "none", WebkitUserDrag: "none" }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: "#f0eef5" }}>{slide.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(240,238,245,.45)", marginTop: 4 }}>{slide.colorName}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
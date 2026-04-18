import { useEffect, useCallback } from "react";

export default function TshirtGalleryModal({ galleryModal, onClose, onSelectIndex }) {
  const { slides, activeIndex } = galleryModal;
  const total = slides.length;

  const goPrev = useCallback(() => onSelectIndex((activeIndex - 1 + total) % total), [activeIndex, total, onSelectIndex]);
  const goNext = useCallback(() => onSelectIndex((activeIndex + 1) % total), [activeIndex, total, onSelectIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, onClose]);

  /* Touch swipe */
  let touchStartX = 0;
  const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx > 0 ? goPrev() : goNext();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(0,0,0,.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          cursor: "default",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 2,
            width: 40, height: 40, borderRadius: "50%",
            border: "none", background: "rgba(255,255,255,.1)",
            color: "#fff", cursor: "pointer", fontSize: 22, lineHeight: 1,
            fontFamily: "'Outfit',sans-serif",
          }}
        >×</button>

        {/* Arrow left */}
        {total > 1 && (
          <button
            type="button"
            onClick={goPrev}
            style={{
              position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 2,
              width: 44, height: 44, borderRadius: "50%",
              border: "none", background: "rgba(255,255,255,.1)",
              color: "#fff", cursor: "pointer", fontSize: 22, lineHeight: 1,
              fontFamily: "'Outfit',sans-serif",
            }}
          >‹</button>
        )}

        {/* Photo */}
        <img
          src={slides[activeIndex]?.src}
          alt={slides[activeIndex]?.alt || ""}
          draggable={false}
          style={{
            maxWidth: "92vw",
            maxHeight: "calc(92vh - 80px)",
            objectFit: "contain",
            userSelect: "none",
            WebkitUserDrag: "none",
            borderRadius: 4,
          }}
        />

        {/* Arrow right */}
        {total > 1 && (
          <button
            type="button"
            onClick={goNext}
            style={{
              position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 2,
              width: 44, height: 44, borderRadius: "50%",
              border: "none", background: "rgba(255,255,255,.1)",
              color: "#fff", cursor: "pointer", fontSize: 22, lineHeight: 1,
              fontFamily: "'Outfit',sans-serif",
            }}
          >›</button>
        )}

        {/* Thumbnails */}
        {total > 1 && (
          <div style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 8, zIndex: 2,
          }}>
            {slides.map((slide, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectIndex(i)}
                style={{
                  width: 52, height: 52, padding: 0, borderRadius: 8,
                  border: i === activeIndex ? "2px solid #e84393" : "2px solid rgba(255,255,255,.2)",
                  background: "rgba(0,0,0,.4)",
                  cursor: "pointer", overflow: "hidden",
                  opacity: i === activeIndex ? 1 : 0.6,
                  transition: "all .2s",
                }}
              >
                <img src={slide.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
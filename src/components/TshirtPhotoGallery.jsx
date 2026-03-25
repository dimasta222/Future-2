import { useEffect, useState } from "react";
import { buildOrderedGalleryCandidates, buildTshirtFallbackSlides, loadImageCandidate } from "../shared/textilePreviewHelpers.js";

export default function TshirtPhotoGallery({ itemName, galleryModel, activeColor, activeVariantLabel, onOpen }) {
  const fallbackSlides = buildTshirtFallbackSlides(itemName, galleryModel, activeColor || "Чёрный");
  const [slides, setSlides] = useState(fallbackSlides);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] || slides[0];

  useEffect(() => {
    let cancelled = false;

    const loadSlides = async () => {
      setLoading(true);
      const orderedCandidates = buildOrderedGalleryCandidates(galleryModel, activeColor || "Чёрный", activeVariantLabel);
      const resolvedSlides = [];

      for (let index = 0; index < orderedCandidates.length; index += 1) {
        const candidate = orderedCandidates[index];
        const resolvedSrc = await loadImageCandidate(candidate.sources);
        if (!resolvedSrc) {
          continue;
        }

        resolvedSlides.push({
          key: candidate.key,
          label: candidate.label,
          colorName: activeColor || "Чёрный",
          alt: `${itemName} — ${activeColor || "Чёрный"}, ${candidate.label.toLowerCase()}`,
          src: resolvedSrc,
        });
      }

      if (cancelled) return;
      setSlides(resolvedSlides.length ? resolvedSlides : buildTshirtFallbackSlides(itemName, galleryModel, activeColor || "Чёрный"));
      setActiveIndex(0);
      setLoading(false);
    };

    loadSlides();
    return () => {
      cancelled = true;
    };
  }, [galleryModel, activeColor, activeVariantLabel, itemName]);

  if (!activeSlide) return null;

  return (
    <div className="cs" style={{ padding: 14, marginBottom: 16, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.015)" }}>
      <button
        type="button"
        onClick={() => onOpen?.({
          title: `${itemName} · ${activeSlide.colorName}`,
          activeIndex,
          slides,
        })}
        style={{
          width: "100%",
          padding: 0,
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 18,
          overflow: "hidden",
          cursor: "zoom-in",
          background: "rgba(255,255,255,.02)",
          position: "relative",
        }}
      >
        <img
          src={activeSlide.src}
          alt={activeSlide.alt}
          draggable={false}
          style={{
            width: "100%",
            aspectRatio: "1 / 1.08",
            objectFit: "cover",
            display: "block",
            userSelect: "none",
            WebkitUserDrag: "none",
          }}
        />
        <span style={{ position: "absolute", left: 14, top: 14, padding: "7px 11px", borderRadius: 999, background: "rgba(8,8,12,.72)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, fontWeight: 500, color: "#f0eef5", backdropFilter: "blur(10px)" }}>
          {activeSlide.colorName}
        </span>
        <span style={{ position: "absolute", right: 14, bottom: 14, padding: "7px 11px", borderRadius: 999, background: "rgba(8,8,12,.72)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.85)", backdropFilter: "blur(10px)" }}>
          {loading ? "Загружаем фото…" : "Нажмите для увеличения"}
        </span>
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 12, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={`${slide.key}-${slide.colorName}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              style={{
                padding: 0,
                borderRadius: 14,
                overflow: "hidden",
                minWidth: 86,
                border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.06)",
                background: active ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)",
                cursor: "pointer",
                transition: "all .25s",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                draggable={false}
                style={{ width: 84, height: 84, objectFit: "cover", display: "block", userSelect: "none", WebkitUserDrag: "none" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
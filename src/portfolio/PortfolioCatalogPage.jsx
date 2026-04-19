import { useCallback, useEffect, useMemo, useState } from "react";
import { PORTFOLIO_CATEGORIES, PORTFOLIO_SECTIONS } from "../data/portfolio";

const STYLES = `
::selection{background:#e84393;color:#fff}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#111}
::-webkit-scrollbar-thumb{background:linear-gradient(#e84393,#6c5ce7);border-radius:3px}
.tb{padding:10px 24px;border-radius:50px;border:none;cursor:pointer;font-size:14px;font-weight:400;letter-spacing:.5px;transition:all .3s;font-family:'Outfit',sans-serif}
.ta{background:linear-gradient(135deg,#e84393,#6c5ce7);color:#fff}
.ti{background:rgba(255,255,255,.05);color:rgba(240,238,245,.5)}
.ti:hover{background:rgba(255,255,255,.08);color:rgba(240,238,245,.7)}
.cg{background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:20px;transition:all .5s cubic-bezier(.16,1,.3,1)}
.cg:hover{background:rgba(255,255,255,.06);border-color:rgba(232,67,147,.2);transform:translateY(-6px)}
.lb-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;animation:lbFadeIn .2s ease}
@keyframes lbFadeIn{from{opacity:0}to{opacity:1}}
.lb-img{max-width:90vw;max-height:85vh;border-radius:12px;object-fit:contain;box-shadow:0 24px 80px rgba(0,0,0,.5);animation:lbZoomIn .25s ease}
@keyframes lbZoomIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.lb-btn{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.5);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.lb-btn:hover{background:rgba(255,255,255,.1)}
.lb-close{position:absolute;top:18px;right:18px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.5);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.lb-close:hover{background:rgba(255,255,255,.1)}
.lb-label{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);font-size:15px;font-weight:500;color:rgba(240,238,245,.7);text-align:center;max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-counter{position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:13px;color:rgba(240,238,245,.4)}
`;

function LogoMini() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, position: "relative" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#d4a0c0,#8a3a6a)", position: "absolute", top: 4, left: 0 }} />
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#e84393,#c0247a)", position: "absolute", top: 2, left: 9 }} />
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#3d2e7c)", position: "absolute", top: 6, left: 20 }} />
      </div>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3 }}>FUTURE</span>
    </div>
  );
}

function Lightbox({ items, currentIndex, onClose, onPrev, onNext }) {
  const item = items[currentIndex];
  if (!item) return null;

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        <img className="lb-img" src={item.image} alt={item.label} draggable={false} />
        {items.length > 1 && (
          <>
            <button className="lb-btn" style={{ left: 16 }} onClick={onPrev} aria-label="Предыдущее">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button className="lb-btn" style={{ right: 16 }} onClick={onNext} aria-label="Следующее">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}
        <button className="lb-close" onClick={onClose} aria-label="Закрыть">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div className="lb-label">{item.label}</div>
        {items.length > 1 && <div className="lb-counter">{currentIndex + 1} / {items.length}</div>}
      </div>
    </div>
  );
}

function SectionGrid({ title, items, onImageClick }) {
  if (!items.length) return null;

  return (
    <section style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(24px,3vw,34px)", fontWeight: 600 }}>{title}</h2>
        <span style={{ color: "rgba(240,238,245,.5)", fontSize: 14 }}>{items.length} работ</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 20,
        }}
      >
        {items.map((item, index) => (
          <article
            key={`${title}-${item.label}`}
            className="cg"
            style={{ overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,.18)", cursor: item.image ? "pointer" : "default" }}
            onClick={() => item.image && onImageClick(index)}
          >
            <div
              style={{
                aspectRatio: "4 / 5",
                background: item.gradient || "linear-gradient(135deg,#181824,#0f0f16)",
                overflow: "hidden",
              }}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.label}
                  loading="lazy"
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none", userSelect: "none", WebkitUserDrag: "none" }}
                />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function PortfolioCatalogPage({ onBack }) {
  const [activeCategory, setActiveCategory] = useState("Все");
  const [lightboxState, setLightboxState] = useState(null);

  const visibleSections = useMemo(() => {
    if (activeCategory === "Все") return PORTFOLIO_SECTIONS;
    return PORTFOLIO_SECTIONS.filter((section) => section.category === activeCategory);
  }, [activeCategory]);

  const lightboxItems = useMemo(() => {
    if (!lightboxState) return [];
    const section = visibleSections.find((s) => s.slug === lightboxState.slug);
    return section ? section.items.filter((i) => i.image) : [];
  }, [lightboxState, visibleSections]);

  const openLightbox = useCallback((slug, indexInSection) => {
    const section = visibleSections.find((s) => s.slug === slug);
    if (!section) return;
    const imageItems = section.items.filter((i) => i.image);
    const item = section.items[indexInSection];
    const imageIndex = imageItems.indexOf(item);
    if (imageIndex < 0) return;
    setLightboxState({ slug, index: imageIndex });
  }, [visibleSections]);

  const closeLightbox = useCallback(() => setLightboxState(null), []);

  const lightboxPrev = useCallback(() => {
    setLightboxState((prev) => prev ? { ...prev, index: (prev.index - 1 + lightboxItems.length) % lightboxItems.length } : null);
  }, [lightboxItems.length]);

  const lightboxNext = useCallback(() => {
    setLightboxState((prev) => prev ? { ...prev, index: (prev.index + 1) % lightboxItems.length } : null);
  }, [lightboxItems.length]);

  useEffect(() => {
    if (!lightboxState) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightboxState, closeLightbox, lightboxPrev, lightboxNext]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08080c",
        color: "#f0eef5",
        fontFamily: "'Outfit',sans-serif",
      }}
    >
      <style>{STYLES}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 5% 80px", display: "grid", gap: 36 }}>
        <button type="button" onClick={onBack} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "inherit", padding: 0, font: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          <LogoMini />
        </button>

        <section style={{ display: "grid", gap: 22 }}>
          <div style={{ display: "grid", gap: 12, maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>
              Наши работы
            </span>
            <h1 style={{ margin: 0, fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, lineHeight: 1.1 }}>
              Наши <span style={{ fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>работы</span>
            </h1>
            <p style={{ margin: "8px auto 0", fontSize: 15, lineHeight: 1.75, color: "rgba(240,238,245,.4)", fontWeight: 300, maxWidth: 600 }}>
              Реальные работы нашей студии — от единичных принтов до крупных тиражей.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginTop: 6 }}>
            {PORTFOLIO_CATEGORIES.map((category) => {
              const active = category === activeCategory;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`tb ${active ? "ta" : "ti"}`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ display: "grid", gap: 42 }}>
          {visibleSections.map((section) => (
            <SectionGrid key={section.slug} title={section.category} items={section.items} onImageClick={(index) => openLightbox(section.slug, index)} />
          ))}
        </div>

        {lightboxState && lightboxItems.length > 0 && (
          <Lightbox
            items={lightboxItems}
            currentIndex={lightboxState.index}
            onClose={closeLightbox}
            onPrev={lightboxPrev}
            onNext={lightboxNext}
          />
        )}

        <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.2)" }}>© 2026 Future Studio • СПб • DTF-печать</p>
        </footer>
      </div>
    </div>
  );
}

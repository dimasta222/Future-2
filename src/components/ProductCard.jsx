import { useState, useEffect, useRef, useCallback } from "react";
import { getDefaultTshirtColor, parseColorOptions, normalizeVariantLabel } from "../shared/textileHelpers.js";
import { resolveTextileCatalogPreview, preloadHomepageTshirtPreview, buildHomepageTshirtPlaceholderSvg, svgToDataUri } from "../shared/textilePreviewHelpers.js";

export default function ProductCard({ item, index, type, onOpenDetail }) {
  const hasVariants = item.variants && item.variants.length > 0;
  const firstVariant = hasVariants ? item.variants[0] : null;
  const price = firstVariant?.price || item.price || "";
  const colors = firstVariant?.colors || item.colors || "";
  const colorOptions = parseColorOptions(colors);
  const defaultColor = getDefaultTshirtColor(colorOptions, firstVariant?.defaultColor) || colorOptions[0] || "Чёрный";
  const hasGallery = Boolean(item.galleryModel);
  const densityValue = normalizeVariantLabel(firstVariant?.label) || "180";

  const [colorIndex, setColorIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const intervalRef = useRef(null);

  const activeColor = hovering && colorOptions.length > 1
    ? colorOptions[colorIndex % colorOptions.length]
    : defaultColor;

  const resolvePreview = useCallback((color) => {
    if (!hasGallery) return "";
    return resolveTextileCatalogPreview(item.galleryModel, color, densityValue)
      || svgToDataUri(buildHomepageTshirtPlaceholderSvg({ model: item.galleryModel, colorName: color }));
  }, [hasGallery, item.galleryModel, densityValue]);

  const previewSrc = resolvePreview(activeColor);

  // Preload all color previews
  useEffect(() => {
    if (!hasGallery) return;
    colorOptions.forEach((color) => {
      const src = resolveTextileCatalogPreview(item.galleryModel, color, densityValue);
      preloadHomepageTshirtPreview(src);
    });
  }, [item.galleryModel, densityValue, hasGallery, colorOptions]);

  const defaultIdx = colorOptions.indexOf(defaultColor);
  const tickRef = useRef(0);

  // Auto-cycle colors on hover
  useEffect(() => {
    if (!hovering || colorOptions.length <= 1) return undefined;
    tickRef.current = defaultIdx >= 0 ? defaultIdx : 0;

    const advance = () => {
      tickRef.current += 1;
      setColorIndex(tickRef.current);
    };

    // First switch after 800ms delay, then cycle every 2.5s
    const firstTimer = setTimeout(advance, 800);
    intervalRef.current = setInterval(advance, 2500);

    return () => { clearTimeout(firstTimer); clearInterval(intervalRef.current); };
  }, [hovering]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cs product-card" style={{
      padding: 0, display: "flex", flexDirection: "column",
      opacity: 0, animation: `fadeUp 0.5s ${index * 0.06}s forwards`,
      border: "1px solid rgba(255,255,255,.06)",
      transition: "border-color 0.3s, transform 0.3s",
      cursor: "pointer", overflow: "hidden",
    }}
      onClick={() => onOpenDetail?.(item)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setColorIndex(0); }}
    >
      {/* Photo — auto-cycles colors on hover */}
      <div style={{ aspectRatio: "1 / 1", overflow: "hidden", background: "rgba(255,255,255,.02)", position: "relative" }}>
        {previewSrc ? (
          <img src={previewSrc} alt={`${item.name} — ${activeColor}`} draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity .4s ease" }} />
        ) : item.hidePlaceholder ? null : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(240,238,245,.15)" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Name + Price */}
      <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>{item.name}</h3>
        <span style={{ fontSize: 17, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{price}</span>
      </div>
    </div>
  );
}
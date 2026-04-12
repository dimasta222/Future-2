import { useEffect, useState } from "react";
import FieldRow from "./FieldRow.jsx";
import { CONTROL_STRIP_STYLE } from "../shared/fieldUi.js";
import { getDefaultTshirtColor, getTshirtSizes, normalizeVariantLabel, parseColorOptions, resolveColorSwatch } from "../shared/textileHelpers.js";
import { buildHomepageTshirtPlaceholderSvg, preloadHomepageTshirtPreview, resolveHomepageTshirtPreview, svgToDataUri } from "../shared/textilePreviewHelpers.js";

export default function MainTshirtCard({ item, onOpen }) {
  const hasVariants = item.variants && item.variants.length > 0;
  const [variantIndex, setVariantIndex] = useState(0);
  const currentVariant = hasVariants ? item.variants[variantIndex] || item.variants[0] : null;
  const sizeOptions = getTshirtSizes(item);
  const material = currentVariant?.material || item.material || "";
  const variantPrice = currentVariant?.price || item.price;
  const densityLabel = currentVariant?.label || "";
  const colorOptions = currentVariant ? parseColorOptions(currentVariant.colors) : parseColorOptions(item.colors);
  const defaultColor = getDefaultTshirtColor(colorOptions, currentVariant?.defaultColor) || colorOptions[0] || "Чёрный";
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const previewColor = colorOptions.includes(selectedColor) ? selectedColor : defaultColor;
  const densityValue = normalizeVariantLabel(densityLabel) || densityLabel || "180";
  const previewSrc = resolveHomepageTshirtPreview(item.galleryModel || "classic", previewColor, densityValue)
    || svgToDataUri(buildHomepageTshirtPlaceholderSvg({ model: item.galleryModel || "classic", colorName: previewColor }));
  const priceLabel = variantPrice;
  const densityVariants = hasVariants && item.variants.length
    ? item.variants
    : [{ label: densityLabel || "180 г/м²", colors: item.colors || "" }];
  const previewPreloadKey = densityVariants.map((variant) => `${variant.label}:${variant.colors || item.colors || ""}`).join("|");

  useEffect(() => {
    const model = item.galleryModel || "classic";
    previewPreloadKey.split("|").filter(Boolean).forEach((entry) => {
      const [variantLabel, variantColorsValue = ""] = entry.split(":");
      const variantColors = parseColorOptions(variantColorsValue || item.colors || "");
      variantColors.forEach((color) => {
        const src = resolveHomepageTshirtPreview(model, color, variantLabel);
        preloadHomepageTshirtPreview(src);
      });
    });
  }, [item.galleryModel, item.colors, previewPreloadKey]);

  return (
    <div className="main-card main-showcase-card" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      <div className="main-showcase-shell">
        <div className="main-card-header" style={{ marginBottom: 16, gap: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ fontSize: "clamp(11px, 3vw, 17px)", fontWeight: 500, whiteSpace: "nowrap" }}>{item.name}</h3>
          <span style={{ fontSize: "clamp(11px, 3vw, 16px)", fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap", lineHeight: 1.1 }}>{priceLabel}</span>
        </div>

        <div className="main-showcase-meta">
          <FieldRow label="Плотность">
            <div style={{ ...CONTROL_STRIP_STYLE, gap: 6, justifyContent: "flex-end", marginLeft: "auto" }}>
              {densityVariants.map((variant, index) => (
                <button
                  key={`${item.name}-${variant.label}-${index}`}
                  type="button"
                  onClick={() => {
                    if (!hasVariants) return;
                    const nextVariant = item.variants[index];
                    const nextColorOptions = parseColorOptions(nextVariant?.colors || "");
                    const nextDefaultColor = getDefaultTshirtColor(nextColorOptions, nextVariant?.defaultColor) || nextColorOptions[0] || "Чёрный";
                    setVariantIndex(index);
                    setSelectedColor(nextDefaultColor);
                  }}
                  style={{
                    minWidth: 0,
                    flexShrink: 1,
                    padding: "7px 9px",
                    borderRadius: 9,
                    cursor: densityVariants.length > 1 ? "pointer" : "default",
                    fontSize: 12,
                    fontWeight: variantIndex === index ? 600 : 400,
                    fontFamily: "'Outfit',sans-serif",
                    background: variantIndex === index ? "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))" : "rgba(255,255,255,.03)",
                    color: variantIndex === index ? "#e84393" : "rgba(240,238,245,.45)",
                    border: variantIndex === index ? "1px solid rgba(232,67,147,.25)" : "1px solid rgba(255,255,255,.06)",
                    transition: "all .3s",
                  }}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </FieldRow>

          <FieldRow label="Материал">
            <div className="field-value" style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,238,245,.65)", textAlign: "right", marginLeft: "auto" }}>{material}</div>
          </FieldRow>
        </div>

        <div className="main-showcase-stage">
          <div className="main-showcase-media">
            <img
              src={previewSrc}
              alt={`${item.name} — ${previewColor}`}
              draggable={false}
              className="main-showcase-preview"
              style={{ userSelect: "none", WebkitUserDrag: "none" }}
            />

            <div className="main-showcase-swatches">
              <div className="main-showcase-swatches-title"><span>Цвет •</span><br />{previewColor}</div>
              {colorOptions.map((color) => {
                const swatch = resolveColorSwatch(color);
                const active = previewColor === color;
                return (
                  <button
                    key={`${item.name}-${color}`}
                    type="button"
                    aria-label={`Выбрать цвет ${color}`}
                    onClick={() => setSelectedColor(color)}
                    className={`main-showcase-swatch${active ? " main-showcase-swatch-active" : ""}`}
                    style={{ background: swatch.background }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, marginTop: 14 }}>
          <div>
            <div className="main-showcase-size-label">Размерный ряд</div>
            <div className="main-showcase-size-row">
              {sizeOptions.map((size) => (
                <span key={size} className="main-showcase-size-pill">
                  {size}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onOpen} className="bo" style={{ width: "100%", marginTop: 14, padding: "10px 20px", fontSize: 13 }}>Подробнее</button>
      </div>
    </div>
  );
}
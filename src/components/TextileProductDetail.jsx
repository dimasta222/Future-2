import { useState } from "react";
import TshirtPhotoGallery from "./TshirtPhotoGallery.jsx";
import { getDefaultTshirtColor, getTshirtSizes, parseColorOptions, resolveColorSwatch, normalizeVariantLabel } from "../shared/textileHelpers.js";
import { resolveTextileCatalogPreview, buildHomepageTshirtPlaceholderSvg, svgToDataUri } from "../shared/textilePreviewHelpers.js";

export default function TextileProductDetail({ item, type, onBack, onAddToCart, onOpenGallery }) {
  const hasVariants = item.variants && item.variants.length > 0;
  const [variantIndex, setVariantIndex] = useState(0);
  const activeVariant = hasVariants ? item.variants[variantIndex] : null;
  const material = activeVariant?.material || item.material || "";
  const fabric = activeVariant?.fabric || "";
  const colors = activeVariant?.colors || item.colors || "";
  const price = activeVariant?.price || item.price || "";
  const desc = activeVariant?.desc || item.desc || "";
  const colorOptions = parseColorOptions(colors);
  const initialColor = item._initialColor && colorOptions.includes(item._initialColor) ? item._initialColor : null;
  const defaultColor = initialColor || getDefaultTshirtColor(colorOptions, activeVariant?.defaultColor);
  const sizeOptions = getTshirtSizes(item);
  const hasSizes = sizeOptions.length > 0;

  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);

  const galleryColor = selectedColor || colorOptions[0] || "Чёрный";
  const variantLabel = activeVariant?.label || "";
  const isTshirt = type === "tshirts";
  const hasGallery = Boolean(item.galleryModel);
  const canAdd = hasSizes ? Boolean(selectedSize && selectedQty >= 1) : selectedQty >= 1;

  const handleVariantChange = (index) => {
    const nextVariant = item.variants[index];
    const nextColors = parseColorOptions(nextVariant?.colors || "");
    const nextDefault = getDefaultTshirtColor(nextColors, nextVariant?.defaultColor);
    setVariantIndex(index);
    setSelectedColor(nextDefault);
    setSelectedSize("");
  };

  const handleAdd = (event) => {
    if (!canAdd || !onAddToCart) return;
    const originRect = event.currentTarget.getBoundingClientRect();
    onAddToCart({
      itemName: item.name,
      variantLabel,
      size: selectedSize || item.sizes || "",
      color: selectedColor,
      qty: selectedQty,
      price,
    }, originRect);
  };

  return (
    <div style={{ animation: "fadeUp 0.4s forwards" }}>
      <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "rgba(240,238,245,.5)", cursor: "pointer", padding: "0 0 24px", font: "inherit", fontSize: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Назад к каталогу
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(24px, 4vw, 48px)", alignItems: "start" }} className="product-detail-grid">

        {/* Left: Photo */}
        <div style={{ minWidth: 0 }}>
          {hasGallery ? (
            <TshirtPhotoGallery
              itemName={item.name}
              galleryModel={item.galleryModel}
              activeColor={galleryColor}
              activeVariantLabel={variantLabel}
              onOpen={onOpenGallery}
            />
          ) : (
            <div className="cs" style={{ aspectRatio: "1 / 1.1", display: "grid", placeItems: "center", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20 }}>
              <div style={{ textAlign: "center", color: "rgba(240,238,245,.25)" }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.4 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                <div style={{ marginTop: 12, fontSize: 13 }}>Фото скоро появится</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 500, margin: 0 }}>{item.name}</h2>
            <div style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 700, marginTop: 10, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{price}</div>
          </div>

          {desc && <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.5)", lineHeight: 1.7, margin: 0 }}>{desc}</p>}

          {/* Density selector */}
          {hasVariants && item.variants.length > 1 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Плотность</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.variants.map((v, i) => (
                  <button key={i} type="button" onClick={() => handleVariantChange(i)} style={{
                    padding: "10px 18px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: variantIndex === i ? 600 : 400, fontFamily: "'Outfit',sans-serif",
                    background: variantIndex === i ? "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))" : "rgba(255,255,255,.03)",
                    color: variantIndex === i ? "#e84393" : "rgba(240,238,245,.5)",
                    border: variantIndex === i ? "1px solid rgba(232,67,147,.25)" : "1px solid rgba(255,255,255,.08)",
                    transition: "all .25s",
                  }}>{v.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Color selector — thumbnails for tshirts, circles for others */}
          {colorOptions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Цвет <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>• {selectedColor || "—"}</span></div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {colorOptions.map((color) => {
                  const active = color === selectedColor;
                  const density = normalizeVariantLabel(variantLabel);
                  const thumbSrc = hasGallery
                    ? (resolveTextileCatalogPreview(item.galleryModel, color, density) || svgToDataUri(buildHomepageTshirtPlaceholderSvg({ model: item.galleryModel, colorName: color })))
                    : "";

                  if (thumbSrc) {
                    return (
                      <button key={color} type="button" onClick={() => setSelectedColor(color)} aria-label={color} title={color} style={{
                        width: 64, height: 64, borderRadius: 14, padding: 0, cursor: "pointer", overflow: "hidden",
                        border: active ? "2.5px solid #e84393" : "2px solid rgba(255,255,255,.1)",
                        boxShadow: active ? "0 0 0 3px rgba(232,67,147,.25)" : "none",
                        transition: "all .2s", background: "rgba(255,255,255,.02)",
                      }}>
                        <img src={thumbSrc} alt={color} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    );
                  }

                  const swatch = resolveColorSwatch(color);
                  return (
                    <button key={color} type="button" onClick={() => setSelectedColor(color)} aria-label={color} title={color} style={{
                      width: 44, height: 44, borderRadius: "50%", padding: 0, cursor: "pointer",
                      background: swatch.background,
                      border: active ? "3px solid #e84393" : "2px solid rgba(255,255,255,.12)",
                      boxShadow: active ? "0 0 0 2px rgba(232,67,147,.3)" : "none",
                      transition: "all .2s",
                    }} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size selector */}
          {hasSizes && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Размер</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sizeOptions.map((size) => {
                  const active = size === selectedSize;
                  return (
                    <button key={size} type="button" onClick={() => setSelectedSize(active ? "" : size)} style={{
                      minWidth: 50, padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, fontFamily: "'Outfit',sans-serif",
                      background: active ? "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))" : "rgba(255,255,255,.03)",
                      color: active ? "#f0eef5" : "rgba(240,238,245,.5)",
                      border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.08)",
                      transition: "all .25s",
                    }}>{size}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Qty + Add to cart */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", padding: 4 }}>
              <button type="button" onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: "transparent", color: "#f0eef5", cursor: "pointer", fontSize: 20, fontFamily: "'Outfit',sans-serif" }}>−</button>
              <span style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 600 }}>{selectedQty}</span>
              <button type="button" onClick={() => setSelectedQty(selectedQty + 1)} style={{ width: 44, height: 44, borderRadius: 10, border: "none", background: "transparent", color: "#f0eef5", cursor: "pointer", fontSize: 20, fontFamily: "'Outfit',sans-serif" }}>+</button>
            </div>
            <button type="button" onClick={handleAdd} disabled={!canAdd} style={{
              flex: 1, minWidth: 200, padding: "14px 24px", borderRadius: 14, border: "none", cursor: canAdd ? "pointer" : "not-allowed",
              background: canAdd ? "linear-gradient(135deg,#e84393,#6c5ce7)" : "rgba(255,255,255,.06)",
              color: canAdd ? "#fff" : "rgba(240,238,245,.3)",
              fontSize: 15, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
              transition: "all .25s",
              opacity: canAdd ? 1 : 0.5,
            }}>Добавить в заказ</button>
          </div>

          {!canAdd && hasSizes && <div style={{ fontSize: 12, color: "rgba(240,238,245,.35)", marginTop: -8 }}>Выберите размер для добавления в заказ</div>}

          {/* Specs */}
          <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Состав", material],
                fabric && fabric !== "—" ? ["Полотно", fabric] : null,
                ["Плотность", variantLabel || "—"],
                ["Размеры", item.sizes || "—"],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(240,238,245,.4)" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,238,245,.7)", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Size guide table */}
          {hasSizes && (type === "tshirts" || type === "hoodies" || type === "sweatshirts") && (
            <div style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Таблица размеров</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Outfit',sans-serif" }}>
                  <thead>
                    <tr>
                      {["Размер", "Грудь (см)", "Длина (см)"].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "rgba(240,238,245,.5)", borderBottom: "1px solid rgba(255,255,255,.08)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeOptions.map((size, i) => {
                      const baseChest = type === "tshirts" ? 49 : 54;
                      const baseLength = type === "tshirts" ? 65 : 66;
                      return (
                        <tr key={size} style={{ background: i % 2 === 0 ? "rgba(255,255,255,.015)" : "transparent" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 500, color: "#f0eef5" }}>{size}</td>
                          <td style={{ padding: "8px 12px", color: "rgba(240,238,245,.6)" }}>{baseChest + i * 3}</td>
                          <td style={{ padding: "8px 12px", color: "rgba(240,238,245,.6)" }}>{baseLength + i * 2}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

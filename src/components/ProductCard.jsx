import { useState } from "react";
import FieldRow from "./FieldRow.jsx";
import TG from "./TG.jsx";
import TshirtPhotoGallery from "./TshirtPhotoGallery.jsx";
import { ColorSelector, QtySelector, SizeSelector } from "./TextileSelectors.jsx";
import { CONTROL_STRIP_STYLE } from "../shared/fieldUi.js";
import { buildTelegramOrderLink } from "../shared/textileOrderLinks.js";
import { getDefaultTshirtColor, getTshirtSizes, parseColorOptions } from "../shared/textileHelpers.js";

export default function ProductCard({ item, index, type, onAddTshirtSelection, onOpenGallery }) {
  const [variantIndex, setVariantIndex] = useState(0);
  const hasVariants = item.variants && item.variants.length > 0;
  const isTshirt = type === "tshirts";
  const activeVariant = hasVariants ? item.variants[variantIndex] : null;
  const displayVariant = activeVariant;
  const material = hasVariants ? displayVariant?.material : item.material;
  const colors = hasVariants ? (isTshirt ? (activeVariant?.colors || "") : displayVariant?.colors) : item.colors;
  const price = hasVariants && displayVariant?.price ? displayVariant.price : item.price;
  const desc = hasVariants && displayVariant?.desc ? displayVariant.desc : item.desc;
  const sizeOptions = isTshirt ? getTshirtSizes(item) : [];
  const colorOptions = isTshirt ? parseColorOptions(colors) : [];
  const defaultColor = isTshirt ? getDefaultTshirtColor(colorOptions) : "";
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedQty, setSelectedQty] = useState(1);
  const galleryColor = selectedColor || colorOptions[0] || "Чёрный";
  const orderLink = isTshirt
    ? buildTelegramOrderLink({ itemName: item.name, material, price, size: selectedSize, color: selectedColor })
    : "https://t.me/FUTURE_178";
  const variantLabel = activeVariant?.label || "";
  const canAddTshirtSelection = Boolean(isTshirt && variantLabel && selectedSize && selectedQty >= 1);

  const handleAddTshirtSelection = (event) => {
    if (!onAddTshirtSelection || !canAddTshirtSelection) return;
    const originRect = event.currentTarget.getBoundingClientRect();
    onAddTshirtSelection({
      itemName: item.name,
      variantLabel,
      size: selectedSize,
      color: selectedColor,
      qty: selectedQty,
      price,
    }, originRect);
  };

  return (
    <div className="cs product-card" style={{
      padding: 32, display: "flex", flexDirection: "column",
      opacity: 0, animation: `fadeUp 0.6s ${index * 0.08}s forwards`,
      border: "1px solid rgba(255,255,255,.06)",
      transition: "border-color 0.4s, transform 0.4s",
    }}
      onMouseEnter={event => { event.currentTarget.style.borderColor = "rgba(232,67,147,.2)"; }}
      onMouseLeave={event => { event.currentTarget.style.borderColor = "rgba(255,255,255,.06)"; }}>
      <div className="product-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 500 }}>{item.name}</h3>
        <span className="price-pill" style={{ background: "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))", padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 600, color: "#e84393", whiteSpace: "nowrap" }}>{price}</span>
      </div>
      {isTshirt && (
        <TshirtPhotoGallery
          itemName={item.name}
          galleryModel={item.galleryModel || "oversize"}
          activeColor={galleryColor}
          activeVariantLabel={variantLabel}
          onOpen={onOpenGallery}
        />
      )}
      <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.5)", lineHeight: 1.7, marginBottom: 18, flex: 1 }}>{desc}</p>

      {hasVariants && isTshirt && (
        <div style={{ marginBottom: 14 }}>
          <FieldRow label="Плотность">
            <div style={{ ...CONTROL_STRIP_STYLE, gap: 6 }}>
              {item.variants.map((variant, variantItemIndex) => (
                <button key={variantItemIndex} onClick={() => {
                  const nextVariant = item.variants[variantItemIndex];
                  const nextDefaultColor = getDefaultTshirtColor(parseColorOptions(nextVariant?.colors || ""));
                  setVariantIndex(variantItemIndex);
                  setSelectedSize("");
                  setSelectedColor(nextDefaultColor);
                }}
                  style={{
                    minWidth: 110,
                    flexShrink: 0,
                    padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                    fontSize: 13, fontWeight: variantIndex === variantItemIndex ? 600 : 400, fontFamily: "'Outfit',sans-serif",
                    background: variantIndex === variantItemIndex ? "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))" : "rgba(255,255,255,.03)",
                    color: variantIndex === variantItemIndex ? "#e84393" : "rgba(240,238,245,.45)",
                    border: variantIndex === variantItemIndex ? "1px solid rgba(232,67,147,.25)" : "1px solid rgba(255,255,255,.06)",
                    transition: "all .3s",
                  }}>
                  {variant.label}
                </button>
              ))}
            </div>
          </FieldRow>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldRow label="Материал">
          <div className="field-value" style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,238,245,.65)", textAlign: "right", marginLeft: "auto" }}>{material}</div>
        </FieldRow>
        {isTshirt ? (
          <>
            <SizeSelector options={sizeOptions} value={selectedSize} onChange={setSelectedSize} />
            <ColorSelector options={colorOptions} value={selectedColor} onChange={setSelectedColor} />
            <QtySelector value={selectedQty} onChange={setSelectedQty} />
          </>
        ) : (
          [["Цвета", colors], ["Размеры", item.sizes]].map(([label, value]) => (
            <FieldRow key={label} label={label}>
              <div className="field-value" style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,238,245,.65)", textAlign: "right", marginLeft: "auto" }}>{value}</div>
            </FieldRow>
          ))
        )}
      </div>
      {isTshirt ? (
        <>
          <div style={{ minHeight: 18, marginTop: 14, fontSize: 12, color: "rgba(240,238,245,.4)", textAlign: "center", opacity: canAddTshirtSelection ? 0 : 1, transition: "opacity .2s ease" }}>
            {canAddTshirtSelection ? " " : "Для заказа выберите размер."}
          </div>
          <button onClick={handleAddTshirtSelection} className="btg" disabled={!canAddTshirtSelection} style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex", padding: "12px 24px", fontSize: 14, opacity: canAddTshirtSelection ? 1 : 0.45, cursor: canAddTshirtSelection ? "pointer" : "not-allowed", filter: canAddTshirtSelection ? "none" : "grayscale(.15)" }}>
            + Добавить в заказ
          </button>
        </>
      ) : (
        <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex", padding: "12px 24px", fontSize: 14 }}>
          <TG /> Заказать
        </a>
      )}
    </div>
  );
}
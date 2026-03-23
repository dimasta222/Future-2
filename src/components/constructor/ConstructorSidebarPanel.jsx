function SidebarTitle({ children }) {
  return (
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.02em" }}>{children}</div>
  );
}

function SidebarFieldRow({ label, children, minHeight = 56 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,.02)", borderRadius: 14, minHeight, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.36)", textTransform: "uppercase", letterSpacing: 1.1, lineHeight: 1.25, overflowWrap: "anywhere" }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function ConstructorSidebarPanel({
  activeTab,
  products,
  product,
  productKey,
  onProductChange,
  size,
  onSizeChange,
  qty,
  onQtyChange,
  color,
  onColorChange,
  resolveColorSwatch,
  handleUploadChange,
  uploadDesign,
  handleUploadRemove,
  uploadScale,
  handleUploadScaleChange,
  centerUploadPosition,
  textValue,
  onTextValueChange,
  textSize,
  onTextSizeChange,
  textWeight,
  onTextWeightChange,
  textColor,
  onTextColorChange,
  textUppercase,
  onTextUppercaseChange,
  presetPrints,
  presetKey,
  onPresetKeyChange,
  selectedPreset,
  presetScale,
  onPresetScaleChange,
}) {
  if (activeTab === "textile") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <SidebarTitle>Текстиль</SidebarTitle>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(240,238,245,.42)" }}>
          Здесь собраны все футболки из каталога: модели, плотности, материалы, доступные цвета и актуальные цены.
        </div>
        <SidebarFieldRow label="Текстиль" minHeight={96}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8 }}>
            {products.map((item) => {
              const active = item.key === productKey;
              return <button key={item.key} type="button" onClick={() => onProductChange(item.key)} style={{ width: "100%", textAlign: "left", padding: 12, borderRadius: 14, border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 16, fontWeight: 600, color: "#f0eef5", overflowWrap: "anywhere" }}>{item.displayName}</div><div style={{ fontSize: 13, color: "rgba(240,238,245,.5)", marginTop: 4 }}>{item.material}</div></div><div style={{ fontSize: 14, fontWeight: 600, color: "#e84393", whiteSpace: "nowrap" }}>{item.priceLabel}</div></div></button>;
            })}
          </div>
        </SidebarFieldRow>
        <SidebarFieldRow label="Размер" minHeight={74}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {product.sizes.map((option) => {
              const active = option === size;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSizeChange(active ? "" : option)}
                  style={{
                    flex: "0 0 auto",
                    minWidth: 46,
                    padding: "6px 10px",
                    borderRadius: 9,
                    border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
                    background: active ? "linear-gradient(135deg,rgba(232,67,147,.16),rgba(108,92,231,.16))" : "rgba(255,255,255,.03)",
                    color: active ? "#f0eef5" : "rgba(240,238,245,.56)",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all .25s",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </SidebarFieldRow>
        <SidebarFieldRow label="Цвет" minHeight={74}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {product.colors.map((option) => {
              const active = option === color;
              const swatch = resolveColorSwatch(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onColorChange(active ? "" : option)}
                  aria-label={`Выбрать цвет ${option}`}
                  title={option}
                  style={{
                    flex: "0 0 auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 9px 6px 6px",
                    borderRadius: 999,
                    border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
                    background: active ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)",
                    cursor: "pointer",
                    transition: "all .25s",
                    fontFamily: "'Outfit',sans-serif",
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: swatch.background, border: `1px solid ${swatch.border}` }} />
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? "#f0eef5" : "rgba(240,238,245,.56)", whiteSpace: "nowrap" }}>{option}</span>
                </button>
              );
            })}
          </div>
        </SidebarFieldRow>
        <SidebarFieldRow label="Количество" minHeight={68}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {[
              { label: "−", next: Math.max(1, qty - 1) },
              { label: "+", next: qty + 1 },
            ].map((control, index) => (
              <button
                key={control.label}
                type="button"
                onClick={() => onQtyChange(control.next)}
                style={{
                  order: index === 0 ? 0 : 2,
                  width: 32,
                  height: 32,
                  flex: "0 0 32px",
                  borderRadius: 9,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.03)",
                  color: "#f0eef5",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {control.label}
              </button>
            ))}
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(event) => onQtyChange(Math.max(1, Number(event.target.value) || 1))}
              className="inf"
              style={{ order: 1, flex: "1 1 auto", minWidth: 0, width: "100%", padding: "7px 8px", textAlign: "center", fontSize: 15, fontWeight: 600 }}
            />
            <span style={{ flex: "0 0 auto", fontSize: 14, color: "rgba(240,238,245,.45)", whiteSpace: "nowrap" }}>шт</span>
          </div>
        </SidebarFieldRow>
      </div>
    );
  }

  if (activeTab === "upload") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <SidebarTitle>Загрузить</SidebarTitle>
        <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 220, borderRadius: 20, border: "1.5px dashed rgba(255,255,255,.12)", background: "rgba(255,255,255,.02)", cursor: "pointer", textAlign: "center", padding: 20 }}>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUploadChange} style={{ display: "none" }} />
          <div style={{ fontSize: 16, fontWeight: 500 }}>Выберите макет для нанесения</div>
          <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", maxWidth: 320 }}>PNG, JPG, WEBP или SVG. После загрузки макет сразу появится на футболке в центральном превью.</div>
        </label>
        {uploadDesign ? <><SidebarFieldRow label="Файл"><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 14, color: "rgba(240,238,245,.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: "1 1 160px" }}>{uploadDesign.name}</span><button type="button" onClick={handleUploadRemove} className="bo" style={{ padding: "8px 14px", fontSize: 13 }}>Удалить</button></div></SidebarFieldRow><SidebarFieldRow label="Масштаб"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="35" max="100" value={uploadScale} onChange={handleUploadScaleChange} style={{ width: "100%" }} /><span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{uploadScale}%</span></div></SidebarFieldRow><SidebarFieldRow label="Позиция"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ fontSize: 13, color: "rgba(240,238,245,.48)", overflowWrap: "anywhere" }}>Перетаскивайте макет мышкой прямо в зоне печати.</span><button type="button" onClick={centerUploadPosition} className="bo" style={{ padding: "8px 14px", fontSize: 13 }}>По центру</button></div></SidebarFieldRow></> : null}
      </div>
    );
  }

  if (activeTab === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <SidebarTitle>Текст</SidebarTitle>
        <textarea className="inf" rows={4} placeholder="Например: FUTURE TEAM" value={textValue} onChange={(event) => onTextValueChange(event.target.value)} style={{ resize: "vertical", minHeight: 118, fontSize: 14 }} />
        <SidebarFieldRow label="Размер текста"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="18" max="72" value={textSize} onChange={(event) => onTextSizeChange(Number(event.target.value))} style={{ width: "100%" }} /><span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textSize}px</span></div></SidebarFieldRow>
        <SidebarFieldRow label="Насыщенность"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[400, 500, 700, 800].map((weight) => <button key={weight} type="button" onClick={() => onTextWeightChange(weight)} className={`tb ${textWeight === weight ? "ta" : "ti"}`} style={{ padding: "9px 14px" }}>{weight}</button>)}</div></SidebarFieldRow>
        <SidebarFieldRow label="Цвет текста"><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{[["#ffffff", "Белый"], ["#111111", "Чёрный"], ["#e84393", "Розовый"], ["#6c5ce7", "Фиолетовый"]].map(([hex, label]) => <button key={hex} type="button" onClick={() => onTextColorChange(hex)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px 7px 7px", borderRadius: 999, border: textColor === hex ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)", background: textColor === hex ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: hex, border: "1px solid rgba(255,255,255,.18)" }} /><span style={{ fontSize: 13, color: "rgba(240,238,245,.7)" }}>{label}</span></button>)}</div></SidebarFieldRow>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(240,238,245,.65)", cursor: "pointer" }}><input type="checkbox" checked={textUppercase} onChange={(event) => onTextUppercaseChange(event.target.checked)} />Автоматически переводить текст в верхний регистр</label>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <SidebarTitle>Готовые принты</SidebarTitle>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>
        {presetPrints.map((item) => {
          const active = presetKey === item.key;
          return <button key={item.key} type="button" onClick={() => onPresetKeyChange(active ? "" : item.key)} style={{ width: "100%", padding: 12, borderRadius: 18, border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}><img src={item.src} alt={item.label} draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 14, objectFit: "cover", display: "block" }} /><div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", marginTop: 10 }}>{item.label}</div></button>;
        })}
      </div>
      {selectedPreset ? <SidebarFieldRow label="Масштаб"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="24" max="80" value={presetScale} onChange={(event) => onPresetScaleChange(Number(event.target.value))} style={{ width: "100%" }} /><span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{presetScale}%</span></div></SidebarFieldRow> : null}
    </div>
  );
}
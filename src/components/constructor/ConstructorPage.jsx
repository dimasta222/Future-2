import { useState } from "react";
import LogoMini from "../LogoMini.jsx";
import ConstructorOrderPanel from "./ConstructorOrderPanel.jsx";
import ConstructorPreviewPanel from "./ConstructorPreviewPanel.jsx";
import ConstructorSidebarPanel from "./ConstructorSidebarPanel.jsx";
import ConstructorTabsNav from "./ConstructorTabsNav.jsx";
import { buildConstructorTelegramLink, CONSTRUCTOR_TABS, getConstructorTextGradient, readFileAsDataUrl, readImageSize } from "./constructorConfig.js";
import useConstructorState from "../../hooks/useConstructorState.js";
import STYLES from "../../shared/appStyles.js";
import { resolveColorSwatch } from "../../shared/textileHelpers.js";
import { buildTshirtMockupSvg, svgToDataUri } from "../../shared/textilePreviewHelpers.js";

function ToolChip({ active = false, onClick, children, disabled = false, minWidth, fullWidth = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: fullWidth ? "100%" : "auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth,
        minHeight: 40,
        padding: "0 12px",
        borderRadius: 14,
        border: active ? "1px solid rgba(232,67,147,.42)" : "1px solid rgba(255,255,255,.08)",
        background: disabled
          ? "rgba(255,255,255,.02)"
          : active
            ? "linear-gradient(135deg,rgba(232,67,147,.18),rgba(108,92,231,.18))"
            : "linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025))",
        color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5",
        boxShadow: active ? "0 10px 22px rgba(232,67,147,.12)" : "inset 0 1px 0 rgba(255,255,255,.03)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .2s ease",
      }}
    >
      {children}
    </button>
  );
}

function FontToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 19 12 5l6 14" />
      <path d="M8.5 14h7" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h12" />
      <path d="M4 10h16" />
      <path d="M4 14h10" />
      <path d="M4 18h14" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6h12" />
      <path d="M4 10h16" />
      <path d="M7 14h10" />
      <path d="M5 18h14" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h12" />
      <path d="M4 10h16" />
      <path d="M10 14h10" />
      <path d="M6 18h14" />
    </svg>
  );
}

function SpacingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16" />
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="M12 4v16" />
    </svg>
  );
}

function EffectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.8 4.7L18 9.5l-4.2 1.7L12 16l-1.8-4.8L6 9.5l4.2-1.8L12 3Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c-5 0-9 3.6-9 8.2 0 4.3 3.5 7.8 7.8 7.8H13a1.9 1.9 0 0 0 0-3.8h-.8a1.9 1.9 0 0 1 0-3.9H15a6 6 0 0 0 0-12h-3Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TextQuickToolbar({
  activeTextToolPanel,
  onTextToolPanelChange,
  textFontLabel,
  textFillMode,
  textColor,
  textGradientCss,
  textSize,
  onTextSizeChange,
  textAlign,
  onTextAlignChange,
  disabled = false,
}) {
  const changeTextSize = (delta) => {
    if (disabled) return;
    onTextSizeChange(Math.min(96, Math.max(18, textSize + delta)));
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 14, width: "100%", minWidth: 0, flexWrap: "nowrap" }}>
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <ToolChip active={activeTextToolPanel === "font"} onClick={() => onTextToolPanelChange("font")} disabled={disabled} minWidth={0} fullWidth>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, maxWidth: "100%" }}>
          <FontToolIcon />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{textFontLabel}</span>
        </span>
        </ToolChip>
      </div>

      <ToolChip active={activeTextToolPanel === "color"} onClick={() => onTextToolPanelChange("color")} disabled={disabled} minWidth={48}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <PaletteIcon />
          <span style={{ width: 18, height: 18, borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: textFillMode === "gradient" ? textGradientCss : textColor, boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)" }} />
        </span>
      </ToolChip>

      <div style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 6px", minHeight: 40, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: disabled ? "rgba(255,255,255,.02)" : "linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)" }}>
        <button type="button" onClick={() => changeTextSize(-2)} disabled={disabled} style={{ width: 26, height: 26, border: "none", borderRadius: 8, background: "rgba(255,255,255,.04)", color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5", cursor: disabled ? "not-allowed" : "pointer", font: "inherit", fontSize: 18, lineHeight: 1 }}>-</button>
        <span style={{ minWidth: 34, textAlign: "center", fontSize: 15, fontWeight: 700, color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5" }}>{textSize}</span>
        <button type="button" onClick={() => changeTextSize(2)} disabled={disabled} style={{ width: 26, height: 26, border: "none", borderRadius: 8, background: "rgba(255,255,255,.04)", color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5", cursor: disabled ? "not-allowed" : "pointer", font: "inherit", fontSize: 18, lineHeight: 1 }}>+</button>
        <span style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.08)", margin: "0 2px" }} />
          {[
            ["left", <AlignLeftIcon key="left-icon" />, "Слева"],
            ["center", <AlignCenterIcon key="center-icon" />, "По центру"],
            ["right", <AlignRightIcon key="right-icon" />, "Справа"],
          ].map(([alignKey, icon, label]) => (
            <button
              key={alignKey}
              type="button"
              onClick={() => onTextAlignChange(alignKey)}
              disabled={disabled}
              aria-label={label}
              title={label}
              style={{
                width: 30,
                height: 30,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                border: "none",
                background: textAlign === alignKey ? "linear-gradient(135deg,rgba(232,67,147,.18),rgba(108,92,231,.16))" : "transparent",
                color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5",
                boxShadow: textAlign === alignKey ? "0 8px 18px rgba(232,67,147,.1)" : "none",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {icon}
            </button>
          ))}
      </div>

      <ToolChip active={activeTextToolPanel === "intervals"} onClick={() => onTextToolPanelChange("intervals")} disabled={disabled} minWidth={108}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <SpacingIcon />
          <span>Интервалы</span>
        </span>
      </ToolChip>

      <ToolChip active={activeTextToolPanel === "effects"} onClick={() => onTextToolPanelChange("effects")} disabled={disabled} minWidth={96}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <EffectsIcon />
          <span>Эффекты</span>
        </span>
      </ToolChip>
    </div>
  );
}

export default function ConstructorPage({ onBack, products, presetPrints }) {
  const {
    activeTab,
    setActiveTab,
    productKey,
    side,
    setSide,
    color,
    size,
    setSize,
    qty,
    setQty,
    layers,
    activeLayer,
    activeLayerId,
    activeUploadLayer,
    activeTextLayer,
    activePresetLayer,
    draggingLayerId,
    editingTextLayerId,
    setTextValue,
    textSize,
    setTextSize,
    textFillMode,
    textColor,
    setTextColor,
    textGradientKey,
    setTextGradientKey,
    textFontKey,
    textFontLabel,
    setTextFontKey,
    setTextBoxWidth,
    textLineHeight,
    setTextLineHeight,
    textLetterSpacing,
    setTextLetterSpacing,
    textAlign,
    setTextAlign,
    textStrokeWidth,
    setTextStrokeWidth,
    textStrokeColor,
    setTextStrokeColor,
    textShadowEnabled,
    setTextShadowEnabled,
    textShadowMode,
    setTextShadowMode,
    textShadowColor,
    setTextShadowColor,
    textShadowOffsetX,
    setTextShadowOffsetX,
    textShadowOffsetY,
    setTextShadowOffsetY,
    textShadowBlur,
    setTextShadowBlur,
    presetKey,
    setPresetKey,
    presetScale,
    setPresetScale,
    printAreaRef,
    product,
    printArea,
    previewSrc,
    canSubmitOrder,
    currentTotal,
    orderMeta,
    telegramLink,
    handleProductChange,
    handleColorChange,
    handleUploadChange,
    handleUploadScaleChange,
    handleUploadRemove,
    handleLayerPointerDown,
    centerActiveLayerPosition,
    setEditingTextLayerId,
    addTextLayer,
    addPresetLayer,
    focusLayer,
    removeLayer,
    removeActiveLayer,
    duplicateActiveLayer,
    moveActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    getPresetByKey,
  } = useConstructorState({
    products,
    presetPrints,
    buildPreviewSrc: ({ product: currentProduct, color: currentColor, side: currentSide }) => svgToDataUri(buildTshirtMockupSvg({ model: currentProduct.model, colorName: currentColor, view: currentSide, showViewLabel: false, showHeader: false })),
    buildTelegramLink: buildConstructorTelegramLink,
    readFileAsDataUrl,
    readImageSize,
  });

  const [activeTextToolPanel, setActiveTextToolPanel] = useState("font");
  const showTextQuickToolbar = activeTab === "text" && Boolean(activeTextLayer);
  const activeTextGradient = getConstructorTextGradient(textGradientKey);

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh" }}>
      <style>{STYLES}</style>

      <div className="page-shell" style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 0 56px" }}>
        <button type="button" onClick={onBack} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "inherit", padding: 0, font: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          <LogoMini />
        </button>

        <div style={{ textAlign: "center", margin: "34px auto 28px", maxWidth: 860 }}>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Новая страница</span>
          <h1 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 200, marginTop: 12 }}>
            Конструктор <span style={{ fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>футболок</span>
          </h1>
          <p style={{ color: "rgba(240,238,245,.45)", fontWeight: 300, fontSize: 15, marginTop: 10, lineHeight: 1.75 }}>
            На этой странице собрана вся информация по футболкам: модели, плотности, материалы, цвета, цены и настройка макета перед отправкой заказа менеджеру.
          </p>
        </div>

        <div className="constructor-shell" style={{ display: "grid", gridTemplateColumns: "minmax(260px,20vw) minmax(0,1fr) minmax(260px,20vw)", gap: 24, alignItems: "start", width: "100%", padding: "0 18px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, justifySelf: "start", width: "100%", minWidth: 0 }}>
            <ConstructorTabsNav tabs={CONSTRUCTOR_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
            <ConstructorSidebarPanel activeTab={activeTab} onTabChange={setActiveTab} products={products} product={product} productKey={productKey} onProductChange={handleProductChange} size={size} onSizeChange={setSize} qty={qty} onQtyChange={setQty} color={color} onColorChange={handleColorChange} resolveColorSwatch={resolveColorSwatch} layers={layers} activeLayer={activeLayer} activeLayerId={activeLayerId} activeUploadLayer={activeUploadLayer} activeTextLayer={activeTextLayer} activeTextToolPanel={activeTextToolPanel} activePresetLayer={activePresetLayer} onLayerSelect={focusLayer} onAddTextLayer={addTextLayer} onAddPresetLayer={addPresetLayer} onDuplicateActiveLayer={duplicateActiveLayer} onRemoveLayer={removeLayer} onRemoveActiveLayer={removeActiveLayer} onMoveLayer={moveActiveLayer} onToggleLayerVisibility={toggleLayerVisibility} onToggleLayerLock={toggleLayerLock} handleUploadChange={handleUploadChange} handleUploadRemove={handleUploadRemove} uploadScale={activeUploadLayer?.scale || 78} handleUploadScaleChange={handleUploadScaleChange} centerActiveLayerPosition={centerActiveLayerPosition} textFillMode={textFillMode} textColor={textColor} onTextColorChange={setTextColor} textGradientKey={textGradientKey} onTextGradientKeyChange={setTextGradientKey} textFontKey={textFontKey} onTextFontKeyChange={setTextFontKey} textLineHeight={textLineHeight} onTextLineHeightChange={setTextLineHeight} textLetterSpacing={textLetterSpacing} onTextLetterSpacingChange={setTextLetterSpacing} textStrokeWidth={textStrokeWidth} onTextStrokeWidthChange={setTextStrokeWidth} textStrokeColor={textStrokeColor} onTextStrokeColorChange={setTextStrokeColor} textShadowEnabled={textShadowEnabled} onTextShadowEnabledChange={setTextShadowEnabled} textShadowMode={textShadowMode} onTextShadowModeChange={setTextShadowMode} textShadowColor={textShadowColor} onTextShadowColorChange={setTextShadowColor} textShadowOffsetX={textShadowOffsetX} onTextShadowOffsetXChange={setTextShadowOffsetX} textShadowOffsetY={textShadowOffsetY} onTextShadowOffsetYChange={setTextShadowOffsetY} textShadowBlur={textShadowBlur} onTextShadowBlurChange={setTextShadowBlur} presetPrints={presetPrints} presetKey={presetKey} onPresetKeyChange={setPresetKey} presetScale={presetScale} onPresetScaleChange={setPresetScale} />
          </div>

          <div style={{ minWidth: 0 }}>
            {showTextQuickToolbar ? (
              <TextQuickToolbar
                activeTextToolPanel={activeTextToolPanel}
                onTextToolPanelChange={setActiveTextToolPanel}
                textFontLabel={textFontLabel}
                textFillMode={textFillMode}
                textColor={textColor}
                textGradientCss={activeTextGradient.css}
                textSize={textSize}
                onTextSizeChange={setTextSize}
                textAlign={textAlign}
                onTextAlignChange={setTextAlign}
                disabled={false}
              />
            ) : null}
            <ConstructorPreviewPanel side={side} onSideChange={setSide} previewSrc={previewSrc} productName={product.name} color={color} printAreaRef={printAreaRef} printArea={printArea} layers={layers} activeLayerId={activeLayerId} draggingLayerId={draggingLayerId} editingTextLayerId={editingTextLayerId} onLayerPointerDown={handleLayerPointerDown} onActiveTextValueChange={setTextValue} onActiveTextBoxWidthChange={setTextBoxWidth} onEditingTextLayerChange={setEditingTextLayerId} getPresetByKey={getPresetByKey} getTextGradientByKey={getConstructorTextGradient} />
          </div>

          <ConstructorOrderPanel currentTotal={currentTotal} orderMeta={orderMeta} canSubmitOrder={canSubmitOrder} telegramLink={telegramLink} />
        </div>
      </div>
    </div>
  );
}
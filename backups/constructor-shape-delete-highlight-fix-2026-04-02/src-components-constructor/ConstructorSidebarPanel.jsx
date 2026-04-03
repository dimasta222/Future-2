import { useEffect, useId, useRef, useState } from "react";
import { buildConstructorShapeSvg, CONSTRUCTOR_SHAPE_BASIC_COLORS, CONSTRUCTOR_SHAPE_CATEGORIES, CONSTRUCTOR_SHAPES, CONSTRUCTOR_TEXT_FONTS, CONSTRUCTOR_TEXT_GRADIENTS, CONSTRUCTOR_TEXT_SOLID_COLORS, getConstructorShape, getConstructorTextGradient } from "./constructorConfig.js";
import { svgToDataUri } from "../../shared/textilePreviewHelpers.js";

const FONT_GROUP_LABELS = {
  sans: "Базовые",
  display: "Акцентные",
  script: "Рукописные",
  mono: "Моно",
};

const EN_TO_RU_LAYOUT_MAP = {
  q: "й",
  w: "ц",
  e: "у",
  r: "к",
  t: "е",
  y: "н",
  u: "г",
  i: "ш",
  o: "щ",
  p: "з",
  "[": "х",
  "]": "ъ",
  a: "ф",
  s: "ы",
  d: "в",
  f: "а",
  g: "п",
  h: "р",
  j: "о",
  k: "л",
  l: "д",
  ";": "ж",
  "'": "э",
  z: "я",
  x: "ч",
  c: "с",
  v: "м",
  b: "и",
  n: "т",
  m: "ь",
  ",": "б",
  ".": "ю",
  "/": ".",
};

const RU_TO_EN_LAYOUT_MAP = Object.fromEntries(Object.entries(EN_TO_RU_LAYOUT_MAP).map(([enChar, ruChar]) => [ruChar, enChar]));

function convertKeyboardLayout(value, layoutMap) {
  return value
    .split("")
    .map((char) => layoutMap[char] || char)
    .join("");
}

function buildFontSearchVariants(value) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return [];

  return Array.from(new Set([
    normalizedValue,
    convertKeyboardLayout(normalizedValue, EN_TO_RU_LAYOUT_MAP),
    convertKeyboardLayout(normalizedValue, RU_TO_EN_LAYOUT_MAP),
  ].filter(Boolean)));
}

function SidebarTitle({ children }) {
  return (
    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.02em" }}>{children}</div>
  );
}

function SidebarFieldRow({ label, children, minHeight = 56 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,.02)", borderRadius: 14, minHeight, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.36)", textTransform: "uppercase", letterSpacing: 1.1, lineHeight: 1.25, overflowWrap: "break-word", wordBreak: "normal" }}>{label}</span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled = false, variant = "default" }) {
  const primary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: primary ? "10px 14px" : "8px 12px",
        borderRadius: 10,
        border: primary ? "1px solid rgba(232,67,147,.38)" : "1px solid rgba(255,255,255,.08)",
        background: disabled
          ? "rgba(255,255,255,.02)"
          : primary
            ? "linear-gradient(135deg, rgba(232,67,147,.94), rgba(108,92,231,.94))"
            : "rgba(255,255,255,.04)",
        color: disabled ? "rgba(240,238,245,.28)" : "#f0eef5",
        boxShadow: primary && !disabled ? "0 12px 28px rgba(232,67,147,.22)" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: primary ? 14 : 13,
        fontWeight: primary ? 600 : 500,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function getTextLayerDisplayLabel(layer, maxLength = 28) {
  const normalizedValue = layer.value.replace(/\s+/g, " ").trim();
  if (!normalizedValue) return layer.name;
  if (normalizedValue.length <= maxLength) return normalizedValue;
  return `${normalizedValue.slice(0, maxLength).trimEnd()}...`;
}

function moveArrayItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function VisibilityIcon({ visible }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {visible ? null : <path d="M4 20 20 4" />}
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5h.01" />
      <path d="M9 12h.01" />
      <path d="M9 19h.01" />
      <path d="M15 5h.01" />
      <path d="M15 12h.01" />
      <path d="M15 19h.01" />
    </svg>
  );
}

function LayerIconButton({ onClick, ariaLabel, title, children, variant = "default" }) {
  const destructive = variant === "destructive";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={ariaLabel}
      title={title}
      style={{
        width: 40,
        height: 40,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: destructive ? "1px solid rgba(232,67,147,.22)" : "1px solid rgba(255,255,255,.08)",
        background: destructive ? "rgba(232,67,147,.08)" : "rgba(255,255,255,.03)",
        color: destructive ? "rgba(255,194,222,.86)" : "rgba(240,238,245,.7)",
        cursor: "pointer",
        fontFamily: "inherit",
        flex: "0 0 auto",
      }}
    >
      {children}
    </button>
  );
}

function LayerPreview({ layer, presetPrints }) {
  if (layer.type === "upload") {
    return <img src={layer.src} alt={layer.uploadName || layer.name} draggable={false} style={{ maxWidth: 58, maxHeight: 72, objectFit: "contain", display: "block", filter: layer.visible ? "none" : "grayscale(1) opacity(.6)" }} />;
  }

  if (layer.type === "preset") {
    const preset = presetPrints.find((item) => item.key === layer.presetKey) || null;
    return preset ? <img src={preset.src} alt={preset.label} draggable={false} style={{ maxWidth: 112, maxHeight: 72, objectFit: "contain", display: "block", filter: layer.visible ? "none" : "grayscale(1) opacity(.6)" }} /> : null;
  }

  if (layer.type === "shape") {
    const shape = getConstructorShape(layer.shapeKey);

    return (
      <div style={{ width: "min(156px, 100%)", maxWidth: "100%", height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShapeOptionPreview
          shape={shape}
          fillMode={layer.fillMode || "solid"}
          color={layer.color || "#ffffff"}
          gradientKey={layer.gradientKey || "future-pulse"}
          strokeStyle={layer.strokeStyle || "none"}
          strokeColor={layer.strokeColor || "transparent"}
          strokeWidth={layer.strokeWidth || 0}
          plain
        />
      </div>
    );
  }

  const previewText = getTextLayerDisplayLabel(layer, 56);
  return (
    <div style={{ width: "100%", padding: "6px 12px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: layer.fontFamily || "inherit", fontWeight: layer.weight || 700, fontStyle: layer.italic ? "italic" : "normal", fontSize: Math.max(14, Math.min(18, (layer.size || 36) * 0.4)), lineHeight: Math.min(1.25, layer.lineHeight || 1.05), letterSpacing: `${Math.max(-0.5, Math.min(4, (layer.letterSpacing || 0) * 0.35))}px`, color: layer.visible ? (layer.color || "#ffffff") : "rgba(240,238,245,.5)", textTransform: layer.uppercase ? "uppercase" : "none", whiteSpace: "pre-wrap", overflow: "hidden", overflowWrap: "anywhere", textDecorationLine: `${layer.underline ? "underline " : ""}${layer.strikethrough ? "line-through" : ""}`.trim() || "none", WebkitTextStroke: (layer.strokeWidth || 0) > 0 ? `${Math.min(1.2, layer.strokeWidth * 0.35)}px ${layer.strokeColor || "#111111"}` : "0 transparent", textShadow: layer.shadowEnabled ? `${(layer.shadowOffsetX || 0) * 0.35}px ${(layer.shadowOffsetY || 2) * 0.35}px ${Math.max(1, (layer.shadowBlur || 14) * 0.2)}px ${layer.shadowColor || "#111111"}` : "none" }}>
      {previewText === layer.name ? "T" : previewText}
    </div>
  );
}

function getLayerCardTitle(layer, presetPrints) {
  if (layer.type === "upload") return layer.uploadName || layer.name;
  if (layer.type === "text") return getTextLayerDisplayLabel(layer, 44);
  if (layer.type === "preset") return presetPrints.find((item) => item.key === layer.presetKey)?.label || layer.name;
  if (layer.type === "shape") return getConstructorShape(layer.shapeKey)?.label || layer.name;
  return layer.name;
}

function EmptyLayerState({ title, description, actionLabel, onAction }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(240,238,245,.45)" }}>{description}</div>
      {actionLabel && onAction ? <ActionButton onClick={onAction}>{actionLabel}</ActionButton> : null}
    </div>
  );
}

function highlightFontLabel(label, query) {
  if (!query) return label;

  const normalizedLabel = label.toLowerCase();
  const startIndex = normalizedLabel.indexOf(query);
  if (startIndex === -1) return label;

  const endIndex = startIndex + query.length;

  return (
    <>
      {label.slice(0, startIndex)}
      <span style={{ background: "rgba(232,67,147,.22)", color: "#ffffff", borderRadius: 4, padding: "0 2px" }}>
        {label.slice(startIndex, endIndex)}
      </span>
      {label.slice(endIndex)}
    </>
  );
}

function FontOptionButton({ font, active, onClick, onFocus, onMouseEnter, highlightQuery = "", keyboardActive = false, optionRef = null }) {
  return (
    <button
      ref={optionRef}
      type="button"
      role="option"
      id={font.optionId}
      aria-selected={keyboardActive}
      tabIndex={-1}
      onClick={onClick}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 14,
        border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
        background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)",
        boxShadow: keyboardActive ? "0 0 0 1px rgba(255,255,255,.18), 0 10px 22px rgba(0,0,0,.16)" : "none",
        cursor: "pointer",
        color: "inherit",
        fontFamily: "inherit",
        minWidth: 0,
      }}
    >
      <span style={{ display: "block", fontSize: 15, lineHeight: 1.3, fontFamily: font.family, color: "#f0eef5", whiteSpace: "normal", overflowWrap: "break-word", wordBreak: "normal" }}>
        {highlightFontLabel(font.label, highlightQuery)}
      </span>
    </button>
  );
}

function ShapeOptionPreview({ shape, fillMode = "solid", color = "#ffffff", gradientKey = "future-pulse", strokeStyle = "none", strokeColor = "transparent", strokeWidth = 0, plain = false }) {
  const gradient = getConstructorTextGradient(gradientKey);
  const shapeSrc = svgToDataUri(buildConstructorShapeSvg({
    shape,
    fillMode,
    color,
    gradient,
    strokeStyle,
    strokeColor,
    strokeWidth,
  }));

  return <img src={shapeSrc} alt={shape.label} draggable={false} style={{ width: plain ? "auto" : "100%", height: plain ? "100%" : "auto", maxWidth: "100%", aspectRatio: plain ? "auto" : "1 / 1", borderRadius: plain ? 0 : 14, objectFit: "contain", display: "block", margin: "0 auto", background: plain ? "transparent" : "radial-gradient(circle at top, rgba(255,255,255,.08), rgba(255,255,255,.02))" }} />;
}

function CirclePalette({ colors, value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
      {colors.map(([hex, label]) => {
        const active = value === hex;

        return (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            aria-label={label}
            title={label}
            style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 999, border: active ? "2px solid rgba(130,78,240,.96)" : "2px solid rgba(0,0,0,.06)", background: hex, boxShadow: active ? "0 0 0 3px rgba(130,78,240,.18)" : "none", cursor: "pointer" }}
          />
        );
      })}
    </div>
  );
}

function ShapeEffectCard({ title, active = false, previewType, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: "100%", padding: 10, borderRadius: 18, border: active ? "2px solid rgba(130,78,240,.96)" : "1px solid rgba(255,255,255,.08)", background: active ? "rgba(130,78,240,.08)" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "inherit" }}
    >
      <div style={{ position: "relative", height: 98, borderRadius: 14, background: "rgba(255,255,255,.02)", overflow: "hidden", marginBottom: 10 }}>
        {previewType === "drop-shadow" ? (
          <>
            <span style={{ position: "absolute", left: "50%", top: "50%", width: 54, height: 54, borderRadius: 16, background: "#824ef0", transform: "translate(-50%, -50%)" }} />
            <span style={{ position: "absolute", left: "calc(50% + 12px)", top: "calc(50% + 10px)", width: 54, height: 54, borderRadius: 16, background: "#824ef0", opacity: .26, transform: "translate(-50%, -50%)" }} />
          </>
        ) : previewType === "distort" ? (
          <>
            <span style={{ position: "absolute", left: "calc(50% - 14px)", top: "calc(50% + 8px)", width: 54, height: 54, borderRadius: 16, background: "#ed5bb7", transform: "translate(-50%, -50%)" }} />
            <span style={{ position: "absolute", left: "calc(50% + 14px)", top: "calc(50% - 8px)", width: 54, height: 54, borderRadius: 16, background: "#1cb8d8", opacity: .88, transform: "translate(-50%, -50%)" }} />
            <span style={{ position: "absolute", left: "50%", top: "50%", width: 54, height: 54, borderRadius: 16, background: "#824ef0", transform: "translate(-50%, -50%)" }} />
          </>
        ) : (
          <span style={{ position: "absolute", left: "50%", top: "50%", width: 54, height: 54, borderRadius: 16, background: "#824ef0", transform: "translate(-50%, -50%)" }} />
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5" }}>{title}</div>
    </button>
  );
}

function ClosableShapePanelHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <SidebarTitle>{title}</SidebarTitle>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть панель и вернуться к набору фигур"
        title="Закрыть"
        style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#f0eef5", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "inherit" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6 18 18" />
          <path d="M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

function ShapeSelectTile({ shape, active = false, onClick, compact = false }) {
  const plain = !compact;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: compact ? 72 : "100%",
        minWidth: compact ? 72 : 0,
        padding: compact ? 4 : 0,
        borderRadius: compact ? 14 : 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        flexShrink: 0,
        boxShadow: !compact && active ? "0 0 0 1px rgba(232,67,147,.42)" : "none",
      }}
    >
      <ShapeOptionPreview shape={shape} fillMode="solid" color="#ffffff" gradientKey="future-pulse" strokeStyle="none" strokeColor="transparent" strokeWidth={0} plain={plain} />
    </button>
  );
}

function ShapeCategoryStrip({ category, shapes, activeShapeKey, onShapePick, onShowAll }) {
  return (
    <div style={{ display: "grid", gap: 6, padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f0eef5" }}>{category.label}</div>
        <button type="button" onClick={onShowAll} style={{ border: "none", background: "none", color: "rgba(240,238,245,.82)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: 0 }}>
          Показать все
        </button>
      </div>

      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "thin" }}>
        {shapes.map((shape) => <ShapeSelectTile key={shape.key} shape={shape} active={activeShapeKey === shape.key} onClick={() => onShapePick(shape.key)} compact />)}
        <button type="button" onClick={onShowAll} aria-label={`Открыть категорию ${category.label}`} style={{ width: 40, minWidth: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#f0eef5", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ConstructorSidebarPanel({
  activeTab,
  onTabChange,
  side,
  printArea,
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
  layers,
  activeLayer,
  _activeLayerId,
  selectedLayerIds = [],
  isMultiSelection = false,
  activeUploadLayer,
  activeTextLayer,
  activeTextMetricsCm,
  activeTextToolPanel,
  activePresetLayer,
  activeShapeLayer,
  activeShapeToolPanel,
  shapeCatalogMode = "add",
  onShapeCatalogModeChange,
  onShapeToolPanelChange,
  _onLayerSelect,
  onLayerActivate,
  onLayerEditOpen,
  onLayerReorder,
  onAddTextLayer,
  onAddPresetLayer,
  onAddShapeLayer,
  onDuplicateActiveLayer,
  onRemoveLayer,
  onRemoveActiveLayer,
  onMoveLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  handleUploadChange,
  handleUploadRemove,
  uploadWidthCm,
  uploadHeightCm,
  handleUploadScaleChange,
  centerActiveLayerPosition,
  textFillMode,
  textColor,
  onTextColorChange,
  textGradientKey,
  onTextGradientKeyChange,
  textFontKey,
  onTextFontKeyChange,
  textLineHeight,
  onTextLineHeightChange,
  textLetterSpacing,
  onTextLetterSpacingChange,
  textStrokeWidth,
  onTextStrokeWidthChange,
  textStrokeColor,
  onTextStrokeColorChange,
  textShadowEnabled,
  onTextShadowEnabledChange,
  textShadowColor,
  onTextShadowColorChange,
  textShadowOffsetX,
  onTextShadowOffsetXChange,
  textShadowOffsetY,
  onTextShadowOffsetYChange,
  textShadowBlur,
  onTextShadowBlurChange,
  presetPrints,
  presetKey,
  onPresetKeyChange,
  presetWidthCm,
  presetHeightCm,
  onPresetWidthCmChange,
  shapeKey,
  onShapeKeyChange,
  shapeFillMode,
  shapeColor,
  onShapeColorChange,
  shapeGradientKey,
  onShapeGradientKeyChange,
  shapeStrokeStyle,
  shapeStrokeColor,
  onShapeStrokeColorChange,
  shapeEffectType,
  onShapeEffectTypeChange,
  shapeEffectAngle,
  onShapeEffectAngleChange,
  shapeEffectDistance,
  onShapeEffectDistanceChange,
  shapeEffectColor,
  onShapeEffectColorChange,
  shapeDistortionColorA,
  onShapeDistortionColorAChange,
  shapeDistortionColorB,
  onShapeDistortionColorBChange,
  shapeWidthCm,
  shapeHeightCm,
  onShapeWidthCmChange,
}) {
  const fontListId = useId();
  const fontOptionRefs = useRef({});
  const [fontSearch, setFontSearch] = useState("");
  const [keyboardFontKey, setKeyboardFontKey] = useState(null);
  const [expandedShapeCategoryKey, setExpandedShapeCategoryKey] = useState(null);
  const [activeShapeEffectColorTarget, setActiveShapeEffectColorTarget] = useState("shadow");
  const [draggedLayerId, setDraggedLayerId] = useState(null);
  const currentTextToolPanel = activeTextToolPanel || "font";
  const currentShapeToolPanel = activeShapeToolPanel || "edit";
  const physicalPrintAreaLabel = `${printArea?.physicalWidthCm || 40} × ${printArea?.physicalHeightCm || 50} см`;
  const fontSearchVariants = buildFontSearchVariants(fontSearch);
  const orderedTextLayers = [...layers].filter((layer) => layer.type === "text").reverse();
  const orderedLayers = [...layers].reverse();
  const filteredTextFonts = CONSTRUCTOR_TEXT_FONTS.map((font) => {
    if (!fontSearchVariants.length) {
      return { ...font, labelMatchQuery: "" };
    }

    const fontLabel = font.label.toLowerCase();
    const fontFamily = font.family.toLowerCase();
    const matchedVariant = fontSearchVariants.find((variant) => fontLabel.includes(variant) || fontFamily.includes(variant));

    if (!matchedVariant) return null;

    return {
      ...font,
      labelMatchQuery: fontLabel.includes(matchedVariant) ? matchedVariant : "",
      optionId: `${fontListId}-${font.key}`,
    };
  }).filter(Boolean);
  const activeTextFont = filteredTextFonts.find((font) => font.key === textFontKey) || null;
  const groupedTextFonts = filteredTextFonts.reduce((groups, font) => {
    if (font.key === activeTextFont?.key) return groups;

    const nextGroupKey = font.group || "sans";
    if (!groups[nextGroupKey]) {
      groups[nextGroupKey] = [];
    }

    groups[nextGroupKey].push(font);
    return groups;
  }, {});
  const groupedTextFontEntries = Object.entries(groupedTextFonts);
  const keyboardVisibleFonts = activeTextFont
    ? [activeTextFont, ...groupedTextFontEntries.flatMap(([, fonts]) => fonts)]
    : groupedTextFontEntries.flatMap(([, fonts]) => fonts);
  const currentKeyboardFontKey = keyboardVisibleFonts.some((font) => font.key === keyboardFontKey)
    ? keyboardFontKey
    : keyboardVisibleFonts[0]?.key || null;

  useEffect(() => {
    if (!currentKeyboardFontKey) return;
    fontOptionRefs.current[currentKeyboardFontKey]?.scrollIntoView({ block: "nearest" });
  }, [currentKeyboardFontKey]);

  const reorderDisplayedLayers = (movedLayerId, targetLayerId) => {
    if (!movedLayerId || !targetLayerId || movedLayerId === targetLayerId) return;

    const currentIds = orderedLayers.map((layer) => layer.id);
    const fromIndex = currentIds.indexOf(movedLayerId);
    const toIndex = currentIds.indexOf(targetLayerId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const nextDisplayedIds = moveArrayItem(currentIds, fromIndex, toIndex);
    onLayerReorder(nextDisplayedIds.reverse());
  };

  const handleFontSelect = (fontKey) => {
    onTextFontKeyChange(fontKey);
    setFontSearch("");
    setKeyboardFontKey(fontKey);
  };

  const handleFontSearchKeyDown = (event) => {
    if (!keyboardVisibleFonts.length) return;

    const activeIndex = keyboardVisibleFonts.findIndex((font) => font.key === currentKeyboardFontKey);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = activeIndex >= 0 ? (activeIndex + 1) % keyboardVisibleFonts.length : 0;
      setKeyboardFontKey(keyboardVisibleFonts[nextIndex].key);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = activeIndex >= 0 ? (activeIndex - 1 + keyboardVisibleFonts.length) % keyboardVisibleFonts.length : keyboardVisibleFonts.length - 1;
      setKeyboardFontKey(keyboardVisibleFonts[nextIndex].key);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const nextFont = keyboardVisibleFonts.find((font) => font.key === currentKeyboardFontKey) || keyboardVisibleFonts[0];
      if (nextFont) {
        handleFontSelect(nextFont.key);
      }
    }
  };

  const normalizeHexColor = (value) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) return null;

    const withHash = normalizedValue.startsWith("#") ? normalizedValue : `#${normalizedValue}`;
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : null;
  };

  const renderFreeColorControl = ({ fieldKey, value, onChange, helperText }) => (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 12, alignItems: "center" }}>
        <label style={{ width: 42, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: normalizeHexColor(value) || "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16)" }}>
          <input type="color" value={normalizeHexColor(value) || "#ffffff"} onChange={(event) => onChange(event.target.value)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
        </label>
        <input
          key={`${fieldKey}-${value || "#ffffff"}`}
          className="inf"
          type="text"
          inputMode="text"
          placeholder="#ffffff"
          defaultValue={value || "#ffffff"}
          onChange={(event) => {
            const normalizedHex = normalizeHexColor(event.target.value);
            if (normalizedHex) onChange(normalizedHex);
          }}
          onBlur={(event) => {
            const normalizedHex = normalizeHexColor(event.target.value);
            if (normalizedHex) {
              event.target.value = normalizedHex;
              onChange(normalizedHex);
              return;
            }

            event.target.value = value || "#ffffff";
          }}
          style={{ minHeight: 42, fontSize: 14, textTransform: "lowercase" }}
        />
      </div>
      {helperText ? <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(240,238,245,.42)" }}>{helperText}</div> : null}
    </div>
  );

  const shapeCategoryGroups = CONSTRUCTOR_SHAPE_CATEGORIES.map((category) => ({
    ...category,
    items: CONSTRUCTOR_SHAPES.filter((shape) => shape.category === category.key),
  })).filter((category) => category.items.length > 0);
  const expandedShapeCategory = currentShapeToolPanel === "edit"
    ? shapeCategoryGroups.find((category) => category.key === expandedShapeCategoryKey) || null
    : null;
  const currentShapeEffectColorTarget = shapeEffectType === "distort"
    ? (activeShapeEffectColorTarget === "distort-a" || activeShapeEffectColorTarget === "distort-b" ? activeShapeEffectColorTarget : "distort-a")
    : "shadow";
  const currentShapeEffectColorValue = currentShapeEffectColorTarget === "distort-a"
    ? shapeDistortionColorA
    : currentShapeEffectColorTarget === "distort-b"
      ? shapeDistortionColorB
      : shapeEffectColor;
  const safeShapeWidthCm = Number.isFinite(Number(shapeWidthCm)) ? Number(shapeWidthCm) : 0;
  const safeShapeHeightCm = Number.isFinite(Number(shapeHeightCm)) ? Number(shapeHeightCm) : 0;
  const handleShapeEffectColorChange = (nextColor) => {
    if (currentShapeEffectColorTarget === "distort-a") {
      onShapeDistortionColorAChange(nextColor);
      return;
    }

    if (currentShapeEffectColorTarget === "distort-b") {
      onShapeDistortionColorBChange(nextColor);
      return;
    }

    onShapeEffectColorChange(nextColor);
  };

  if (activeTab === "textile") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <SidebarFieldRow label="Текстиль" minHeight={96}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8 }}>
            {products.map((item) => {
              const active = item.key === productKey;
              return <button key={item.key} type="button" onClick={() => onProductChange(item.key)} style={{ width: "100%", textAlign: "left", padding: 12, borderRadius: 14, border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 16, fontWeight: 600, color: "#f0eef5", overflowWrap: "break-word", wordBreak: "normal" }}>{item.displayName}</div><div style={{ fontSize: 13, color: "rgba(240,238,245,.5)", marginTop: 4 }}>{item.material}</div></div><div style={{ fontSize: 14, fontWeight: 600, color: "#e84393", whiteSpace: "nowrap" }}>{item.priceLabel}</div></div></button>;
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

  if (activeTab === "layers") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <SidebarTitle>Слои</SidebarTitle>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(240,238,245,.42)" }}>
          Один клик выделяет слой для перемещения в превью, Shift + клик добавляет его к текущему выделению, двойной клик открывает его раздел.
        </div>
        {layers.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {orderedLayers.map((layer) => {
              const active = selectedLayerIds.includes(layer.id);
              const layerTitle = getLayerCardTitle(layer, presetPrints);

              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(event) => {
                    setDraggedLayerId(layer.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", layer.id);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (draggedLayerId) {
                      reorderDisplayedLayers(draggedLayerId, layer.id);
                    }
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={() => setDraggedLayerId(null)}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: active ? "1px solid rgba(232,67,147,.32)" : "1px solid rgba(255,255,255,.08)",
                    background: draggedLayerId === layer.id ? "linear-gradient(135deg,rgba(108,92,231,.18),rgba(232,67,147,.12))" : active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)",
                    color: "inherit",
                    cursor: draggedLayerId === layer.id ? "grabbing" : "grab",
                    minHeight: 92,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(240,238,245,.36)" }}>
                      <DragHandleIcon />
                    </div>
                    <button
                      type="button"
                      onClick={(event) => onLayerActivate(layer.id, event)}
                      onDoubleClick={() => onLayerEditOpen(layer.id)}
                      style={{ width: "100%", padding: 0, border: "none", background: "none", color: "inherit", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <div style={{ minHeight: 62, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
                        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
                          <LayerPreview layer={layer} presetPrints={presetPrints} />
                        </div>
                      </div>
                    </button>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifySelf: "end", flex: "0 0 auto" }}>
                      <LayerIconButton onClick={() => onToggleLayerVisibility(layer.id)} ariaLabel={layer.visible ? `Скрыть слой ${layerTitle}` : `Показать слой ${layerTitle}`} title={layer.visible ? "Скрыть слой" : "Показать слой"}>
                        <VisibilityIcon visible={layer.visible} />
                      </LayerIconButton>
                      <LayerIconButton onClick={() => onRemoveLayer(layer.id)} ariaLabel={`Удалить слой ${layerTitle}`} title="Удалить слой" variant="destructive">
                        <DeleteIcon />
                      </LayerIconButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyLayerState title="Слои пока пустые" description="Добавьте текст, принт или макет. После этого каждый элемент появится отдельным слоем с собственными настройками." actionLabel="Добавить текст" onAction={onAddTextLayer} />
        )}
        <SidebarFieldRow label="Активный слой" minHeight={120}>
          {isMultiSelection ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f0eef5" }}>Выбрано объектов: {selectedLayerIds.length}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionButton onClick={onDuplicateActiveLayer}>Дублировать</ActionButton>
                <ActionButton onClick={onRemoveActiveLayer}>Удалить</ActionButton>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(240,238,245,.45)" }}>Перетаскивайте выделенные объекты вместе на превью. Для добавления слоя к выделению используйте Shift + клик.</div>
            </div>
          ) : activeLayer ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f0eef5" }}>{getLayerCardTitle(activeLayer, presetPrints)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionButton onClick={() => onToggleLayerVisibility(activeLayer.id)}>{activeLayer.visible ? "Скрыть" : "Показать"}</ActionButton>
                <ActionButton onClick={() => onToggleLayerLock(activeLayer.id)}>{activeLayer.locked ? "Разблокировать" : "Заблокировать"}</ActionButton>
                <ActionButton onClick={onDuplicateActiveLayer}>Дублировать</ActionButton>
                <ActionButton onClick={onRemoveActiveLayer}>Удалить</ActionButton>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionButton onClick={() => onMoveLayer("down")}>Ниже</ActionButton>
                <ActionButton onClick={() => onMoveLayer("up")}>Выше</ActionButton>
                <ActionButton onClick={centerActiveLayerPosition}>По центру</ActionButton>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(240,238,245,.45)" }}>
              Выберите слой из списка, чтобы управлять его порядком и состоянием.
            </div>
          )}
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
          <div style={{ fontSize: 16, fontWeight: 500 }}>Добавить новый слой-макет</div>
          <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", maxWidth: 320 }}>PNG, JPG, WEBP или SVG. Каждый загруженный файл становится отдельным слоем и появляется в центре превью.</div>
        </label>
        {activeUploadLayer ? <><SidebarFieldRow label="Активный слой"><div style={{ display: "grid", gap: 8 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{activeUploadLayer.name}</div><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 14, color: "rgba(240,238,245,.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: "1 1 160px" }}>{activeUploadLayer.uploadName}</span><button type="button" onClick={handleUploadRemove} className="bo" style={{ padding: "8px 14px", fontSize: 13 }}>Удалить слой</button></div></div></SidebarFieldRow><SidebarFieldRow label="Ширина печати"><div style={{ display: "grid", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="1" max={printArea?.physicalWidthCm || 40} step="0.1" value={uploadWidthCm} onChange={handleUploadScaleChange} style={{ width: "100%" }} /><span style={{ minWidth: 72, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{uploadWidthCm.toFixed(1)} см</span></div><div style={{ fontSize: 12, color: "rgba(240,238,245,.48)" }}>Высота пересчитывается автоматически по пропорциям файла: {uploadHeightCm.toFixed(1)} см. Максимальная зона для стороны «{side === "front" ? "Спереди" : "Сзади"}» — {physicalPrintAreaLabel}.</div></div></SidebarFieldRow><SidebarFieldRow label="Позиция"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ fontSize: 13, color: "rgba(240,238,245,.48)", overflowWrap: "anywhere" }}>Перетаскивайте слой мышкой прямо в зоне печати или верните его в центр одной кнопкой.</span><button type="button" onClick={centerActiveLayerPosition} className="bo" style={{ padding: "8px 14px", fontSize: 13 }}>По центру</button></div></SidebarFieldRow></> : <EmptyLayerState title="Нет активного слоя-макета" description="Сначала добавьте файл или выберите уже существующий слой во вкладке «Слои»." actionLabel="Открыть слои" onAction={() => onTabChange("layers")} />}
      </div>
    );
  }

  if (activeTab === "text") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <SidebarTitle>Текст</SidebarTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton onClick={onAddTextLayer} variant="primary">+ Новый текстовый слой</ActionButton>
        </div>
        {orderedTextLayers.length ? (
          <SidebarFieldRow label="Текстовые слои" minHeight={96}>
            <div style={{ display: "grid", gap: 8 }}>
              {orderedTextLayers.map((layer) => {
                const active = selectedLayerIds.includes(layer.id);
                const textLayerLabel = getTextLayerDisplayLabel(layer);

                return (
                  <div
                    key={layer.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto auto",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={(event) => onLayerActivate(layer.id, event)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: active ? "1px solid rgba(232,67,147,.34)" : "1px solid rgba(255,255,255,.08)",
                        background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)",
                        color: "inherit",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                        <span style={{ flex: "0 0 auto", width: 8, height: 8, borderRadius: "50%", background: active ? "#e84393" : "rgba(255,255,255,.18)", boxShadow: active ? "0 0 0 4px rgba(232,67,147,.12)" : "none" }} />
                        <span style={{ flex: "1 1 auto", minWidth: 0, fontSize: 13.5, lineHeight: 1.3, fontWeight: 600, color: layer.visible ? "rgba(240,238,245,.82)" : "rgba(240,238,245,.42)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {textLayerLabel}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLayerVisibility(layer.id)}
                      aria-label={layer.visible ? `Скрыть слой ${layer.name}` : `Показать слой ${layer.name}`}
                      title={layer.visible ? "Скрыть слой" : "Показать слой"}
                      style={{
                        width: 40,
                        height: 40,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        border: layer.visible ? "1px solid rgba(108,92,231,.24)" : "1px solid rgba(255,255,255,.08)",
                        background: layer.visible ? "rgba(108,92,231,.12)" : "rgba(255,255,255,.03)",
                        color: layer.visible ? "#d9d1ff" : "rgba(240,238,245,.56)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <VisibilityIcon visible={layer.visible} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveLayer(layer.id)}
                      aria-label={`Удалить слой ${layer.name}`}
                      title="Удалить слой"
                      style={{
                        width: 40,
                        height: 40,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        border: "1px solid rgba(232,67,147,.22)",
                        background: "rgba(232,67,147,.08)",
                        color: "rgba(255,194,222,.86)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          </SidebarFieldRow>
        ) : null}
        {activeTextLayer ? (
          <>
            <SidebarFieldRow label="Размер текста в см" minHeight={72}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 10, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)", marginBottom: 4 }}>Фактический размер текста</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f0eef5", whiteSpace: "nowrap" }}>
                    {activeTextMetricsCm ? `${activeTextMetricsCm.contentWidthCm} × ${activeTextMetricsCm.contentHeightCm} см` : "..."}
                  </div>
                </div>
              </div>
            </SidebarFieldRow>

            {currentTextToolPanel === "font" ? (
              <SidebarFieldRow label="Шрифт" minHeight={96}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: fontSearch ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)", gap: 8, alignItems: "center" }}>
                    <input
                      className="inf"
                      type="search"
                      placeholder="Поиск шрифта"
                      value={fontSearch}
                      onChange={(event) => setFontSearch(event.target.value)}
                      onKeyDown={handleFontSearchKeyDown}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={filteredTextFonts.length > 0}
                      aria-controls={fontListId}
                      aria-activedescendant={keyboardVisibleFonts.find((font) => font.key === currentKeyboardFontKey)?.optionId}
                      style={{ minHeight: 42, fontSize: 14 }}
                    />
                    {fontSearch ? (
                      <button
                        type="button"
                        onClick={() => setFontSearch("")}
                        style={{ minHeight: 42, padding: "0 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "rgba(240,238,245,.72)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
                      >
                        Очистить
                      </button>
                    ) : null}
                  </div>

                  {filteredTextFonts.length ? (
                    <div id={fontListId} role="listbox" aria-label="Список шрифтов" style={{ display: "grid", gap: 10, maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
                      {activeTextFont ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                            Выбранный шрифт
                          </div>
                          <FontOptionButton
                            font={activeTextFont}
                            active
                            keyboardActive={currentKeyboardFontKey === activeTextFont.key}
                            highlightQuery={activeTextFont.labelMatchQuery || ""}
                            optionRef={(node) => {
                              fontOptionRefs.current[activeTextFont.key] = node;
                            }}
                            onFocus={() => setKeyboardFontKey(activeTextFont.key)}
                            onMouseEnter={() => setKeyboardFontKey(activeTextFont.key)}
                            onClick={() => handleFontSelect(activeTextFont.key)}
                          />
                        </div>
                      ) : null}

                      {groupedTextFontEntries.map(([groupKey, fonts]) => (
                        <div key={groupKey} style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                            {FONT_GROUP_LABELS[groupKey] || groupKey}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
                            {fonts.map((font) => (
                              <FontOptionButton
                                key={font.key}
                                font={font}
                                active={textFontKey === font.key}
                                keyboardActive={currentKeyboardFontKey === font.key}
                                highlightQuery={font.labelMatchQuery || ""}
                                optionRef={(node) => {
                                  fontOptionRefs.current[font.key] = node;
                                }}
                                onFocus={() => setKeyboardFontKey(font.key)}
                                onMouseEnter={() => setKeyboardFontKey(font.key)}
                                onClick={() => handleFontSelect(font.key)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", fontSize: 13, lineHeight: 1.5, color: "rgba(240,238,245,.46)" }}>
                      По запросу ничего не найдено. Уточните название шрифта.
                    </div>
                  )}

                </div>
              </SidebarFieldRow>
            ) : null}

            {currentTextToolPanel === "color" ? (
              <SidebarFieldRow label="Цвет" minHeight={164}>
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                      Свободный выбор
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                      <label style={{ width: 48, height: 48, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: textFillMode === "gradient" ? getConstructorTextGradient(textGradientKey).css : textColor, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,.16)" }}>
                        <input type="color" value={normalizeHexColor(textColor) || "#ffffff"} onChange={(event) => onTextColorChange(event.target.value)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.92)", textShadow: "0 1px 8px rgba(0,0,0,.24)" }}>HEX</span>
                      </label>
                      <input
                        key={`${activeTextLayer?.id || "text"}-${textColor || "#ffffff"}`}
                        className="inf"
                        type="text"
                        inputMode="text"
                        placeholder="#ffffff"
                        defaultValue={textColor || "#ffffff"}
                        onChange={(event) => {
                          const normalizedHex = normalizeHexColor(event.target.value);
                          if (normalizedHex) onTextColorChange(normalizedHex);
                        }}
                        onBlur={(event) => {
                          const normalizedHex = normalizeHexColor(event.target.value);
                          if (normalizedHex) {
                            event.target.value = normalizedHex;
                            onTextColorChange(normalizedHex);
                            return;
                          }

                          event.target.value = textColor || "#ffffff";
                        }}
                        style={{ minHeight: 46, fontSize: 14, textTransform: "lowercase" }}
                      />
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(240,238,245,.42)" }}>
                      Нажмите на круг, чтобы открыть палитру, или введите HEX-код вручную.
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                      Сплошные цвета
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 8 }}>
                      {CONSTRUCTOR_TEXT_SOLID_COLORS.map(([hex, label]) => {
                        const active = textFillMode === "solid" && textColor === hex;

                        return (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => onTextColorChange(hex)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, padding: "9px 10px", borderRadius: 14, border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.08)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, background: hex, border: "1px solid rgba(255,255,255,.16)" }} />
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "rgba(240,238,245,.76)" }}>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                      Градиенты по умолчанию
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(152px, 1fr))", gap: 8 }}>
                      {CONSTRUCTOR_TEXT_GRADIENTS.map((gradient) => {
                        const active = textFillMode === "gradient" && textGradientKey === gradient.key;

                        return (
                          <button
                            key={gradient.key}
                            type="button"
                            onClick={() => onTextGradientKeyChange(gradient.key)}
                            style={{ display: "grid", gap: 8, minWidth: 0, padding: 10, borderRadius: 14, border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.08)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12))" : "rgba(255,255,255,.03)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          >
                            <span style={{ display: "block", width: "100%", height: 30, borderRadius: 10, background: gradient.css, border: "1px solid rgba(255,255,255,.16)" }} />
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "rgba(240,238,245,.76)" }}>{gradient.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SidebarFieldRow>
            ) : null}

            {currentTextToolPanel === "intervals" ? (
              <SidebarFieldRow label="Интервалы" minHeight={132}>
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.4, color: "rgba(240,238,245,.42)", textTransform: "uppercase", letterSpacing: 1.1 }}>Межстрочный интервал</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <input type="range" min="0.85" max="1.8" step="0.05" value={textLineHeight} onChange={(event) => onTextLineHeightChange(Number(event.target.value))} style={{ width: "100%" }} />
                      <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textLineHeight}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.4, color: "rgba(240,238,245,.42)", textTransform: "uppercase", letterSpacing: 1.1 }}>Межбуквенный интервал</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <input type="range" min="-1" max="12" step="0.5" value={textLetterSpacing} onChange={(event) => onTextLetterSpacingChange(Number(event.target.value))} style={{ width: "100%" }} />
                      <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textLetterSpacing}px</span>
                    </div>
                  </div>
                </div>
              </SidebarFieldRow>
            ) : null}

            {currentTextToolPanel === "effects" ? (
              <>
                <SidebarFieldRow label="Обводка">
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <input type="range" min="0" max="6" step="0.5" value={textStrokeWidth} onChange={(event) => onTextStrokeWidthChange(Number(event.target.value))} style={{ width: "100%" }} />
                      <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textStrokeWidth}px</span>
                    </div>
                    {renderFreeColorControl({ fieldKey: "stroke", value: textStrokeColor, onChange: onTextStrokeColorChange, helperText: "Выберите цвет обводки через палитру или введите HEX-код." })}
                  </div>
                </SidebarFieldRow>

                <SidebarFieldRow label="Тень">
                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(240,238,245,.65)", cursor: "pointer" }}>
                      <input type="checkbox" checked={textShadowEnabled} onChange={(event) => onTextShadowEnabledChange(event.target.checked)} />Включить тень
                    </label>
                    {textShadowEnabled ? (
                      <>
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(240,238,245,.42)" }}>
                          Мягкая тень остаётся с blur и более плавным краем.
                        </div>
                        {renderFreeColorControl({ fieldKey: "shadow", value: textShadowColor, onChange: onTextShadowColorChange, helperText: "Выберите цвет тени через палитру или введите HEX-код." })}
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{ width: 22, fontSize: 13, color: "rgba(240,238,245,.48)" }}>X</span>
                          <input type="range" min="-24" max="24" step="1" value={textShadowOffsetX} onChange={(event) => onTextShadowOffsetXChange(Number(event.target.value))} style={{ width: "100%" }} />
                          <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textShadowOffsetX}px</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{ width: 22, fontSize: 13, color: "rgba(240,238,245,.48)" }}>Y</span>
                          <input type="range" min="-24" max="24" step="1" value={textShadowOffsetY} onChange={(event) => onTextShadowOffsetYChange(Number(event.target.value))} style={{ width: "100%" }} />
                          <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textShadowOffsetY}px</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{ width: 22, fontSize: 13, color: "rgba(240,238,245,.48)" }}>B</span>
                          <input type="range" min="0" max="32" step="1" value={textShadowBlur} onChange={(event) => onTextShadowBlurChange(Number(event.target.value))} style={{ width: "100%" }} />
                          <span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textShadowBlur}px</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(240,238,245,.42)" }}>
                        Включите тень, чтобы настроить цвет, смещение и blur.
                      </div>
                    )}
                  </div>
                </SidebarFieldRow>
              </>
            ) : null}

            <ActionButton onClick={centerActiveLayerPosition}>Поставить текст по центру базовой позиции</ActionButton>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Нет активного текстового слоя</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(240,238,245,.45)" }}>
              Создайте новый текстовый слой или выберите уже существующий во вкладке «Слои».
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === "shapes") {
    const handleShapePick = (nextShapeKey) => {
      if (shapeCatalogMode === "replace" && activeShapeLayer) {
        onShapeKeyChange(nextShapeKey);
        return;
      }

      onAddShapeLayer(nextShapeKey);
    };

    const activeShapeMeta = activeShapeLayer ? getConstructorShape(activeShapeLayer.shapeKey) : null;
    const activeShapeIsLine = activeShapeMeta?.category === "lines";

    const renderShapeSizeControl = () => (
      activeShapeLayer ? (
        <SidebarFieldRow label="Размер печати">
          <div style={{ display: "grid", gap: 10 }}>
            {activeShapeIsLine ? (
              <>
                <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 10, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)", marginBottom: 4 }}>Фактический размер линии</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f0eef5", whiteSpace: "nowrap" }}>{safeShapeWidthCm.toFixed(1)} × {safeShapeHeightCm.toFixed(1)} см</div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(240,238,245,.48)" }}>Длина и угол линии меняются боковыми хэндлами на превью: тянете один конец в любую точку печатного поля, второй конец остаётся зафиксирован. Толщина меняется через «Обводка» → «Толщина». Максимальная зона — {physicalPrintAreaLabel}.</div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <input type="range" min="1" max={printArea?.physicalWidthCm || 40} step="0.1" value={safeShapeWidthCm} onChange={(event) => onShapeWidthCmChange(Number(event.target.value))} style={{ width: "100%" }} />
                  <span style={{ minWidth: 72, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{safeShapeWidthCm.toFixed(1)} см</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(240,238,245,.48)" }}>Текущий размер фигуры: {safeShapeWidthCm.toFixed(1)} × {safeShapeHeightCm.toFixed(1)} см. Максимальная зона — {physicalPrintAreaLabel}.</div>
              </>
            )}
            <ActionButton onClick={centerActiveLayerPosition}>Вернуть фигуру в центр</ActionButton>
          </div>
        </SidebarFieldRow>
      ) : null
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        {currentShapeToolPanel === "edit"
          ? <SidebarTitle>Фигуры</SidebarTitle>
          : <ClosableShapePanelHeader title="Фигуры" onClose={() => {
            setExpandedShapeCategoryKey(null);
            onShapeCatalogModeChange?.("add");
            onShapeToolPanelChange("edit");
          }} />}

        {currentShapeToolPanel === "edit" ? (
          <>
            {expandedShapeCategory ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="button" onClick={() => setExpandedShapeCategoryKey(null)} aria-label="Вернуться к спискам фигур" style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#f0eef5", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.02em" }}>{expandedShapeCategory.label}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 6 }}>
                  {expandedShapeCategory.items.map((shape) => <ShapeSelectTile key={shape.key} shape={shape} active={shapeCatalogMode === "replace" && activeShapeLayer ? shape.key === shapeKey : false} onClick={() => handleShapePick(shape.key)} />)}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8, maxHeight: "calc(100vh - 280px)", overflowY: "auto", paddingRight: 2 }}>
                {shapeCategoryGroups.map((category) => <ShapeCategoryStrip key={category.key} category={category} shapes={category.items} activeShapeKey={shapeCatalogMode === "replace" && activeShapeLayer ? shapeKey : null} onShapePick={handleShapePick} onShowAll={() => setExpandedShapeCategoryKey(category.key)} />)}
              </div>
            )}

            {renderShapeSizeControl()}
          </>
        ) : null}

        {currentShapeToolPanel === "color" ? (
          activeShapeLayer ? (
            <>
              <SidebarFieldRow label="Основной цвет" minHeight={164}>
                <div style={{ display: "grid", gap: 16 }}>
                  {renderFreeColorControl({ fieldKey: "shape-fill", value: shapeColor, onChange: onShapeColorChange, helperText: "Палитра или HEX для основной фигуры." })}
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                      Основные цвета
                    </div>
                    <CirclePalette colors={CONSTRUCTOR_SHAPE_BASIC_COLORS} value={shapeColor} onChange={onShapeColorChange} />
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                      Градиенты
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(152px, 1fr))", gap: 8 }}>
                      {CONSTRUCTOR_TEXT_GRADIENTS.map((gradient) => {
                        const active = shapeFillMode === "gradient" && shapeGradientKey === gradient.key;

                        return (
                          <button
                            key={gradient.key}
                            type="button"
                            onClick={() => onShapeGradientKeyChange(gradient.key)}
                            style={{ display: "grid", gap: 8, minWidth: 0, padding: 10, borderRadius: 14, border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.08)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12))" : "rgba(255,255,255,.03)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          >
                            <span style={{ display: "block", width: "100%", height: 30, borderRadius: 10, background: gradient.css, border: "1px solid rgba(255,255,255,.16)" }} />
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "rgba(240,238,245,.76)" }}>{gradient.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SidebarFieldRow>
            </>
          ) : (
            <EmptyLayerState title="Нет активной фигуры" description="Выберите слой фигуры, чтобы настроить её цвет." actionLabel="Открыть выбор фигур" onAction={() => {
              setExpandedShapeCategoryKey(null);
              onShapeCatalogModeChange?.("add");
              onShapeToolPanelChange("edit");
            }} />
          )
        ) : null}

        {currentShapeToolPanel === "stroke-color" ? (
          activeShapeLayer ? (
            shapeStrokeStyle !== "none" ? (
              <SidebarFieldRow label="Цвет обводки" minHeight={164}>
                <div style={{ display: "grid", gap: 16 }}>
                  {renderFreeColorControl({ fieldKey: "shape-stroke", value: shapeStrokeColor, onChange: onShapeStrokeColorChange, helperText: "Палитра или HEX для внутренней обводки фигуры." })}
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                      Основные цвета
                    </div>
                    <CirclePalette colors={CONSTRUCTOR_SHAPE_BASIC_COLORS} value={shapeStrokeColor} onChange={onShapeStrokeColorChange} />
                  </div>
                </div>
              </SidebarFieldRow>
            ) : (
              <EmptyLayerState title="Обводка отключена" description="Сначала включите один из режимов обводки в toolbar, затем здесь можно будет менять её цвет." actionLabel={null} onAction={null} />
            )
          ) : (
            <EmptyLayerState title="Нет активной фигуры" description="Выберите слой фигуры, чтобы настроить цвет обводки." actionLabel="Открыть выбор фигур" onAction={() => {
              setExpandedShapeCategoryKey(null);
              onShapeCatalogModeChange?.("add");
              onShapeToolPanelChange("edit");
            }} />
          )
        ) : null}

        {currentShapeToolPanel === "effects" ? (
          activeShapeLayer ? (
            <>
              <SidebarFieldRow label="Эффекты" minHeight={148}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                  <ShapeEffectCard title="Падающая тень" previewType="drop-shadow" active={shapeEffectType === "drop-shadow"} onClick={() => { setActiveShapeEffectColorTarget("shadow"); onShapeEffectTypeChange(shapeEffectType === "drop-shadow" ? "none" : "drop-shadow"); }} />
                  <ShapeEffectCard title="Искажение" previewType="distort" active={shapeEffectType === "distort"} onClick={() => { setActiveShapeEffectColorTarget("distort-a"); onShapeEffectTypeChange(shapeEffectType === "distort" ? "none" : "distort"); }} />
                </div>
              </SidebarFieldRow>

              {shapeEffectType !== "none" ? (
                <>
                  <SidebarFieldRow label="Направление">
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <input type="range" min="-180" max="180" step="1" value={shapeEffectAngle} onChange={(event) => onShapeEffectAngleChange(Number(event.target.value))} style={{ width: "100%" }} />
                      <span style={{ minWidth: 58, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{shapeEffectAngle}°</span>
                    </div>
                  </SidebarFieldRow>

                  <SidebarFieldRow label="Смещение">
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <input type="range" min="0" max="40" step="1" value={shapeEffectDistance} onChange={(event) => onShapeEffectDistanceChange(Number(event.target.value))} style={{ width: "100%" }} />
                      <span style={{ minWidth: 58, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{shapeEffectDistance}</span>
                    </div>
                  </SidebarFieldRow>

                  <SidebarFieldRow label={shapeEffectType === "drop-shadow" ? "Цвет" : "Цвета"}>
                    <div style={{ display: "grid", gap: 14 }}>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {shapeEffectType === "drop-shadow" ? (
                          <button
                            type="button"
                            onClick={() => setActiveShapeEffectColorTarget("shadow")}
                            style={{ width: 52, height: 52, borderRadius: 999, border: currentShapeEffectColorTarget === "shadow" ? "2px solid rgba(130,78,240,.96)" : "2px solid rgba(255,255,255,.08)", background: shapeEffectColor, cursor: "pointer", boxShadow: currentShapeEffectColorTarget === "shadow" ? "0 0 0 3px rgba(130,78,240,.18)" : "none" }}
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveShapeEffectColorTarget("distort-a")}
                              style={{ width: 52, height: 52, borderRadius: 999, border: currentShapeEffectColorTarget === "distort-a" ? "2px solid rgba(130,78,240,.96)" : "2px solid rgba(255,255,255,.08)", background: shapeDistortionColorA, cursor: "pointer", boxShadow: currentShapeEffectColorTarget === "distort-a" ? "0 0 0 3px rgba(130,78,240,.18)" : "none" }}
                            />
                            <button
                              type="button"
                              onClick={() => setActiveShapeEffectColorTarget("distort-b")}
                              style={{ width: 52, height: 52, borderRadius: 999, border: currentShapeEffectColorTarget === "distort-b" ? "2px solid rgba(130,78,240,.96)" : "2px solid rgba(255,255,255,.08)", background: shapeDistortionColorB, cursor: "pointer", boxShadow: currentShapeEffectColorTarget === "distort-b" ? "0 0 0 3px rgba(130,78,240,.18)" : "none" }}
                            />
                          </>
                        )}
                      </div>

                      {renderFreeColorControl({ fieldKey: `shape-effect-${currentShapeEffectColorTarget}`, value: currentShapeEffectColorValue, onChange: handleShapeEffectColorChange, helperText: shapeEffectType === "drop-shadow" ? "HEX или палитра для цвета падающей тени." : "HEX или палитра для выбранного цвета искажения." })}

                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 11, lineHeight: 1.2, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(240,238,245,.38)" }}>
                          Основные цвета
                        </div>
                        <CirclePalette colors={CONSTRUCTOR_SHAPE_BASIC_COLORS} value={currentShapeEffectColorValue} onChange={handleShapeEffectColorChange} />
                      </div>
                    </div>
                  </SidebarFieldRow>
                </>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(240,238,245,.45)", padding: "0 4px" }}>
                  Выберите «Падающую тень» или «Искажение», чтобы настроить направление, смещение и цвет эффекта.
                </div>
              )}
            </>
          ) : (
            <EmptyLayerState title="Нет активной фигуры" description="Выберите слой фигуры, чтобы добавить падающую тень или искажение." actionLabel="Открыть выбор фигур" onAction={() => {
              setExpandedShapeCategoryKey(null);
              onShapeCatalogModeChange?.("add");
              onShapeToolPanelChange("edit");
            }} />
          )
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <SidebarTitle>Готовые принты</SidebarTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ActionButton onClick={onAddPresetLayer}>Новый слой-принт</ActionButton>
        <ActionButton onClick={() => onTabChange("layers")}>Управление слоями</ActionButton>
      </div>
      {activePresetLayer ? <><SidebarFieldRow label="Активный слой"><div style={{ display: "grid", gap: 6 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{activePresetLayer.name}</div><div style={{ fontSize: 13, color: "rgba(240,238,245,.46)" }}>Каждый принт живёт в своём слое и может занимать собственную позицию и размер в сантиметрах.</div></div></SidebarFieldRow><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 12 }}>{presetPrints.map((item) => { const active = presetKey === item.key; return <button key={item.key} type="button" onClick={() => onPresetKeyChange(item.key)} style={{ width: "100%", padding: 12, borderRadius: 18, border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}><img src={item.src} alt={item.label} draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 14, objectFit: "cover", display: "block" }} /><div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", marginTop: 10 }}>{item.label}</div></button>; })}</div><SidebarFieldRow label="Размер печати"><div style={{ display: "grid", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="1" max={printArea?.physicalWidthCm || 40} step="0.1" value={presetWidthCm} onChange={(event) => onPresetWidthCmChange(Number(event.target.value))} style={{ width: "100%" }} /><span style={{ minWidth: 72, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{presetWidthCm.toFixed(1)} см</span></div><div style={{ fontSize: 12, color: "rgba(240,238,245,.48)" }}>Текущий размер принта: {presetWidthCm.toFixed(1)} × {presetHeightCm.toFixed(1)} см. Максимальная зона — {physicalPrintAreaLabel}.</div></div></SidebarFieldRow><ActionButton onClick={centerActiveLayerPosition}>Вернуть принт в центр</ActionButton></> : <EmptyLayerState title="Нет активного слоя-принта" description="Создайте новый слой с готовым принтом или выберите уже существующий слой во вкладке «Слои»." actionLabel="Добавить слой-принт" onAction={onAddPresetLayer} />}
    </div>
  );
}

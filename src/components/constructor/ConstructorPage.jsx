import { useEffect, useRef, useState } from "react";
import LogoMini from "../LogoMini.jsx";
import ConstructorOrderPanel from "./ConstructorOrderPanel.jsx";
import ConstructorPreviewPanel from "./ConstructorPreviewPanel.jsx";
import ConstructorSidebarPanel from "./ConstructorSidebarPanel.jsx";
import ConstructorTabsNav from "./ConstructorTabsNav.jsx";
import { buildConstructorTelegramLink, CONSTRUCTOR_TABS, getConstructorTextGradient, readFileAsDataUrl, readImageSize } from "./constructorConfig.js";
import useConstructorState from "../../hooks/useConstructorState.js";
import STYLES from "../../shared/appStyles.js";
import { normalizeColorName } from "../../shared/textileHelpers.js";
import { resolveColorSwatch } from "../../shared/textileHelpers.js";
import { buildTshirtMockupSvg, svgToDataUri } from "../../shared/textilePreviewHelpers.js";

const TEXT_FONT_SIZE_STEP = 1;

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
        minHeight: 34,
        padding: "0 10px",
        borderRadius: 12,
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
        fontSize: 12,
        transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease, transform .2s ease",
      }}
    >
      {children}
    </button>
  );
}

function ToolbarToggleButton({ active = false, onClick, children, tooltip, disabled = false, unavailable = false, minWidth = 32 }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const blocked = disabled || unavailable;

  return (
    <button
      type="button"
      onClick={blocked ? undefined : onClick}
      disabled={disabled}
      aria-label={tooltip}
      aria-pressed={blocked ? false : active}
      aria-disabled={blocked}
      onMouseEnter={() => {
        setShowTooltip(true);
      }}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      style={{
        position: "relative",
        minWidth,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 6px",
        borderRadius: 8,
        border: "none",
        background: blocked
          ? "rgba(255,255,255,.02)"
          : active
            ? "linear-gradient(135deg,rgba(232,67,147,.18),rgba(108,92,231,.16))"
            : "transparent",
        color: blocked ? "rgba(240,238,245,.28)" : "#f0eef5",
        boxShadow: active && !blocked ? "0 8px 18px rgba(232,67,147,.1)" : "none",
        cursor: blocked ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: blocked ? 0.62 : 1,
      }}
    >
      {showTooltip ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            left: "50%",
            bottom: "calc(100% + 10px)",
            transform: "translateX(-50%)",
            padding: "6px 8px",
            borderRadius: 10,
            background: "rgba(13,13,18,.96)",
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 14px 34px rgba(0,0,0,.3)",
            color: "#f0eef5",
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {tooltip}
        </span>
      ) : null}
      {children}
    </button>
  );
}

function FontToolIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 19 12 5l6 14" />
      <path d="M8.5 14h7" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h12" />
      <path d="M4 10h16" />
      <path d="M4 14h10" />
      <path d="M4 18h14" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6h12" />
      <path d="M4 10h16" />
      <path d="M7 14h10" />
      <path d="M5 18h14" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h12" />
      <path d="M4 10h16" />
      <path d="M10 14h10" />
      <path d="M6 18h14" />
    </svg>
  );
}

function SpacingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16" />
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="M12 4v16" />
    </svg>
  );
}

function EffectsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.8 4.7L18 9.5l-4.2 1.7L12 16l-1.8-4.8L6 9.5l4.2-1.8L12 3Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c-5 0-9 3.6-9 8.2 0 4.3 3.5 7.8 7.8 7.8H13a1.9 1.9 0 0 0 0-3.8h-.8a1.9 1.9 0 0 1 0-3.9H15a6 6 0 0 0 0-12h-3Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShapeEditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6h8v8H6z" />
      <path d="M14 10h4v8h-8v-4" />
    </svg>
  );
}

function ShapeEffectsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h9v9H7z" />
      <path d="M10 10h9v9h-9" opacity=".75" />
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
  minTextFontSize,
  maxTextFontSize,
  textWeight,
  onTextWeightChange,
  textFontSupportsBold,
  textBoldWeight,
  textRegularWeight,
  textItalic,
  onTextItalicChange,
  textFontSupportsItalic,
  textUnderline,
  onTextUnderlineChange,
  textStrikethrough,
  onTextStrikethroughChange,
  textUppercase,
  onTextUppercaseChange,
  textAlign,
  onTextAlignChange,
  disabled = false,
}) {
  const [textSizeInput, setTextSizeInput] = useState(String(Math.round(textSize)));
  const boldActive = textFontSupportsBold && textWeight >= textBoldWeight;

  useEffect(() => {
    setTextSizeInput(String(Math.round(textSize)));
  }, [textSize]);

  const changeTextSize = (delta) => {
    if (disabled) return;
    onTextSizeChange(textSize + delta);
  };

  const commitTextSizeInput = (rawValue) => {
    if (disabled) return;

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      setTextSizeInput(String(Math.round(textSize)));
      return;
    }

    const clampedValue = Math.min(maxTextFontSize, Math.max(minTextFontSize, parsedValue));
    setTextSizeInput(String(Math.round(clampedValue)));
    onTextSizeChange(clampedValue);
  };

  const toggleBold = () => {
    if (disabled || !textFontSupportsBold) return;
    onTextWeightChange(boldActive ? textRegularWeight : textBoldWeight);
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 6, marginBottom: 14, width: "100%", minWidth: 0, flexWrap: "nowrap" }}>
      <div style={{ flex: "1 1 180px", minWidth: 150 }}>
        <ToolChip active={activeTextToolPanel === "font"} onClick={() => onTextToolPanelChange("font")} disabled={disabled} minWidth={0} fullWidth>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%" }}>
          <FontToolIcon />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, fontSize: 12 }}>{textFontLabel}</span>
        </span>
        </ToolChip>
      </div>

      <ToolChip active={activeTextToolPanel === "color"} onClick={() => onTextToolPanelChange("color")} disabled={disabled} minWidth={40}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <PaletteIcon />
            <span style={{ width: 14, height: 14, borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: textFillMode === "gradient" ? textGradientCss : textColor, boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)" }} />
        </span>
      </ToolChip>

      <div style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 1, padding: "4px 4px", minHeight: 34, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: disabled ? "rgba(255,255,255,.02)" : "linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)" }}>
          <ToolbarToggleButton active={boldActive} onClick={toggleBold} disabled={disabled} unavailable={!textFontSupportsBold} tooltip={textFontSupportsBold ? "Жирный" : "Жирный недоступен для текущего шрифта"}>
            <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 800 }}>B</span>
          </ToolbarToggleButton>
          <ToolbarToggleButton active={textFontSupportsItalic && textItalic} onClick={() => onTextItalicChange(!textItalic)} disabled={disabled} unavailable={!textFontSupportsItalic} tooltip={textFontSupportsItalic ? "Курсив" : "Курсив недоступен для текущего шрифта"}>
            <span style={{ fontSize: 16, lineHeight: 1, fontStyle: "italic" }}>I</span>
          </ToolbarToggleButton>
          <ToolbarToggleButton active={textUnderline} onClick={() => onTextUnderlineChange(!textUnderline)} disabled={disabled} tooltip="Подчеркнуть">
            <span style={{ fontSize: 15, lineHeight: 1, textDecorationLine: "underline", textUnderlineOffset: "0.14em" }}>U</span>
          </ToolbarToggleButton>
          <ToolbarToggleButton active={textStrikethrough} onClick={() => onTextStrikethroughChange(!textStrikethrough)} disabled={disabled} tooltip="Зачеркивание">
            <span style={{ fontSize: 15, lineHeight: 1, textDecorationLine: "line-through", textDecorationThickness: "0.08em" }}>S</span>
          </ToolbarToggleButton>
          <ToolbarToggleButton active={textUppercase} onClick={() => onTextUppercaseChange(!textUppercase)} disabled={disabled} tooltip="Прописные буквы" minWidth={32}>
            <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 600, letterSpacing: "-.04em" }}>aA</span>
          </ToolbarToggleButton>
      </div>

      <div style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 2, padding: "4px 4px", minHeight: 34, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: disabled ? "rgba(255,255,255,.02)" : "linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.025))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)" }}>
        <button type="button" onClick={() => changeTextSize(-TEXT_FONT_SIZE_STEP)} disabled={disabled} style={{ width: 22, height: 22, border: "none", borderRadius: 7, background: "rgba(255,255,255,.04)", color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5", cursor: disabled ? "not-allowed" : "pointer", font: "inherit", fontSize: 15, lineHeight: 1 }}>-</button>
        <input
          type="number"
          min={minTextFontSize}
          max={maxTextFontSize}
          step={TEXT_FONT_SIZE_STEP}
          value={textSizeInput}
          disabled={disabled}
          onChange={(event) => {
            const nextValue = event.target.value;
            setTextSizeInput(nextValue);
            if (nextValue === "") return;
            const parsedValue = Number(nextValue);
            if (Number.isFinite(parsedValue)) {
              onTextSizeChange(parsedValue);
            }
          }}
          onBlur={(event) => commitTextSizeInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          style={{ width: 54, minWidth: 54, height: 24, padding: "0 6px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5", font: "inherit", fontSize: 12, fontWeight: 700, textAlign: "center", outline: "none" }}
        />
        <button type="button" onClick={() => changeTextSize(TEXT_FONT_SIZE_STEP)} disabled={disabled} style={{ width: 22, height: 22, border: "none", borderRadius: 7, background: "rgba(255,255,255,.04)", color: disabled ? "rgba(240,238,245,.3)" : "#f0eef5", cursor: disabled ? "not-allowed" : "pointer", font: "inherit", fontSize: 15, lineHeight: 1 }}>+</button>
        <span style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.08)", margin: "0 1px" }} />
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
                width: 24,
                height: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
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

      <ToolChip active={activeTextToolPanel === "intervals"} onClick={() => onTextToolPanelChange("intervals")} disabled={disabled} minWidth={84}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <SpacingIcon />
          <span>Интервалы</span>
        </span>
      </ToolChip>

      <ToolChip active={activeTextToolPanel === "effects"} onClick={() => onTextToolPanelChange("effects")} disabled={disabled} minWidth={70}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <EffectsIcon />
          <span>Эффекты</span>
        </span>
      </ToolChip>
    </div>
  );
}

function ShapeQuickToolbar({
  activeShapeToolPanel,
  onShapeToolPanelChange,
  shapeCatalogMode,
  shapeColor,
  shapeStrokeStyle,
  shapeStrokeColor,
  strokePopoverAnchorRef,
  onToggleStrokePopover,
  isStrokePopoverOpen,
  disabled = false,
}) {
  return (
    <div className="constructor-shape-toolbar" style={{ display: "flex", alignItems: "stretch", gap: 6, marginBottom: 14, width: "100%", minWidth: 0, flexWrap: "nowrap" }}>
      <div className="constructor-shape-toolbar-main" style={{ flex: "1 1 180px", minWidth: 150 }}>
        <ToolChip active={shapeCatalogMode === "replace"} onClick={() => onShapeToolPanelChange("edit")} disabled={disabled} minWidth={0} fullWidth>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%" }}>
            <ShapeEditIcon />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, fontSize: 12 }}>Редактировать</span>
          </span>
        </ToolChip>
      </div>

      <ToolChip active={activeShapeToolPanel === "color"} onClick={() => onShapeToolPanelChange("color")} disabled={disabled} minWidth={86}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <PaletteIcon />
          <span style={{ width: 14, height: 14, borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: shapeColor, boxShadow: "inset 0 1px 0 rgba(255,255,255,.18)" }} />
          <span>Цвет</span>
        </span>
      </ToolChip>

      <div ref={strokePopoverAnchorRef} style={{ display: "inline-flex" }}>
        <ToolChip active={isStrokePopoverOpen} onClick={onToggleStrokePopover} disabled={disabled} minWidth={104}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h16" />
            </svg>
            <span>Обводка</span>
          </span>
        </ToolChip>
      </div>

      {shapeStrokeStyle !== "none" ? (
        <ToolChip active={activeShapeToolPanel === "stroke-color"} onClick={() => onShapeToolPanelChange("stroke-color")} disabled={disabled} minWidth={40}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 15, height: 15, borderRadius: 999, border: `4px solid ${shapeStrokeColor}`, background: "transparent", boxSizing: "border-box", boxShadow: "0 0 0 1px rgba(255,255,255,.12)" }} />
          </span>
        </ToolChip>
      ) : null}

      <ToolChip active={activeShapeToolPanel === "effects"} onClick={() => onShapeToolPanelChange("effects")} disabled={disabled} minWidth={108}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ShapeEffectsIcon />
          <span>Эффекты</span>
        </span>
      </ToolChip>
    </div>
  );
}

function StrokeSampleIcon({ type, active }) {
  const stroke = active ? "#824ef0" : "rgba(240,238,245,.78)";

  if (type === "none") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.8" />
        <path d="M6 18 18 6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "dashed") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3" />
        <path d="M4 12h16" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3" />
        <path d="M4 17h16" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3" />
      </svg>
    );
  }

  if (type === "dotted") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.8 4.2" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h16" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShapeStrokePopover({ shapeStrokeStyle, onShapeStrokeStyleChange, shapeStrokeWidth, onShapeStrokeWidthChange, popoverLeft = 0 }) {
  const items = [
    ["none", "Отключить"],
    ["single", "Сплошная линия"],
    ["dashed", "Пунктир"],
    ["dotted", "Точки"],
  ];

  return (
    <div className="constructor-shape-popover" style={{ position: "absolute", left: popoverLeft, top: "calc(100% + 8px)", zIndex: 12, width: 332, maxWidth: "min(100%, 332px)", padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,16,22,.96)", boxShadow: "0 18px 44px rgba(0,0,0,.26)" }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
          {items.map(([type, label]) => {
            const active = shapeStrokeStyle === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => onShapeStrokeStyleChange(type)}
                aria-label={label}
                title={label}
                style={{ height: 40, borderRadius: 10, border: active ? "1px solid rgba(130,78,240,.96)" : "1px solid rgba(255,255,255,.08)", background: active ? "rgba(130,78,240,.12)" : "rgba(255,255,255,.03)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <StrokeSampleIcon type={type} active={active} />
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: "rgba(240,238,245,.72)", textTransform: "uppercase", letterSpacing: ".08em" }}>Толщина</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 56px", gap: 10, alignItems: "center" }}>
            <input type="range" min="1" max="24" step="1" value={shapeStrokeWidth} onChange={(event) => onShapeStrokeWidthChange(Number(event.target.value))} disabled={shapeStrokeStyle === "none"} style={{ width: "100%" }} />
            <div style={{ minHeight: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", fontSize: 13, color: "#f0eef5" }}>{shapeStrokeWidth}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConstructorPage({ onBack, products, presetPrints }) {
  const [activeTextMetricsCm, setActiveTextMetricsCm] = useState(null);
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
    sideLayers,
    activeLayer,
    activeLayerId,
    activeUploadLayer,
    activeTextLayer,
    activePresetLayer,
    activeShapeLayer,
    draggingLayerId,
    activeSnapGuides,
    editingTextLayerId,
    setTextValue,
    textSize,
    setTextSize,
    minTextFontSize,
    maxTextFontSize,
    textFillMode,
    textColor,
    setTextColor,
    textGradientKey,
    setTextGradientKey,
    textWeight,
    setTextWeight,
    textFontSupportsBold,
    textBoldWeight,
    textRegularWeight,
    textItalic,
    setTextItalic,
    textFontSupportsItalic,
    textUnderline,
    setTextUnderline,
    textStrikethrough,
    setTextStrikethrough,
    textUppercase,
    setTextUppercase,
    textFontKey,
    textFontLabel,
    setTextFontKey,
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
    presetWidthCm,
    presetHeightCm,
    setPresetWidthCm,
    shapeKey,
    setShapeKey,
    shapeFillMode,
    shapeColor,
    setShapeColor,
    shapeGradientKey,
    setShapeGradientKey,
    shapeStrokeStyle,
    setShapeStrokeStyle,
    shapeStrokeWidth,
    setShapeStrokeWidth,
    shapeStrokeColor,
    setShapeStrokeColor,
    shapeEffectType,
    setShapeEffectType,
    shapeEffectAngle,
    setShapeEffectAngle,
    shapeEffectDistance,
    setShapeEffectDistance,
    shapeEffectColor,
    setShapeEffectColor,
    shapeDistortionColorA,
    setShapeDistortionColorA,
    shapeDistortionColorB,
    setShapeDistortionColorB,
    shapeWidthCm,
    shapeHeightCm,
    setShapeWidthCm,
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
    uploadWidthCm,
    uploadHeightCm,
    handleUploadScaleChange,
    handleUploadRemove,
    handleLayerPointerDown,
    applyLayerResize,
    centerActiveLayerPosition,
    setEditingTextLayerId,
    selectLayer,
    openLayerEditor,
    addTextLayer,
    addPresetLayer,
    addShapeLayer,
    removeLayer,
    removeActiveLayer,
    duplicateActiveLayer,
    moveActiveLayer,
    reorderLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    getPresetByKey,
    getShapeByKey,
  } = useConstructorState({
    products,
    presetPrints,
    buildPreviewSrc: ({ product: currentProduct, color: currentColor, side: currentSide, size: currentSize }) => {
      const sizeSupportsRealMockup = currentProduct.printAreas?.[currentSide]?.mockupSizes?.includes(currentSize);
      const canUseRealMockup = currentProduct.model === "oversize"
        && normalizeColorName(currentColor) === "черный"
        && sizeSupportsRealMockup;
      return canUseRealMockup && currentProduct.printAreas?.[currentSide]?.mockupSrc
        ? currentProduct.printAreas[currentSide].mockupSrc
        : svgToDataUri(buildTshirtMockupSvg({ model: currentProduct.model, colorName: currentColor, view: currentSide, showViewLabel: false, showHeader: false }));
    },
    buildTelegramLink: buildConstructorTelegramLink,
    readFileAsDataUrl,
    readImageSize,
  });

  const [activeTextToolPanel, setActiveTextToolPanel] = useState("font");
  const [activeShapeToolPanel, setActiveShapeToolPanel] = useState("edit");
  const [shapeCatalogMode, setShapeCatalogMode] = useState("add");
  const [showShapeStrokePopover, setShowShapeStrokePopover] = useState(false);
  const shapeToolbarOverlayRef = useRef(null);
  const shapeStrokeButtonRef = useRef(null);
  const [shapeStrokePopoverLeft, setShapeStrokePopoverLeft] = useState(0);
  const showTextQuickToolbar = activeTab === "text" && Boolean(activeTextLayer);
  const showShapeQuickToolbar = Boolean(activeShapeLayer);
  const activeTextGradient = getConstructorTextGradient(textGradientKey);
  const effectiveShapeCatalogMode = activeTab === "shapes" ? shapeCatalogMode : "add";

  const resetShapeReplaceMode = ({ showShapeCatalog = false } = {}) => {
    setShapeCatalogMode("add");
    setShowShapeStrokePopover(false);

    if (showShapeCatalog) {
      setActiveShapeToolPanel("edit");
    }
  };

  const handleLayerActivate = (layerId) => {
    resetShapeReplaceMode({ showShapeCatalog: activeTab === "shapes" });
    selectLayer(layerId);
  };

  const handleLayerEditOpen = (layerId) => {
    const targetLayer = layers.find((layer) => layer.id === layerId) || null;
    resetShapeReplaceMode({ showShapeCatalog: targetLayer?.type === "shape" || activeTab === "shapes" });
    openLayerEditor(layerId);
  };

  const handlePreviewLayerPointerDown = (layerId, event) => {
    resetShapeReplaceMode({ showShapeCatalog: activeTab === "shapes" });
    handleLayerPointerDown(layerId, event);
  };

  const handlePreviewBackgroundPointerDown = () => {
    resetShapeReplaceMode({ showShapeCatalog: activeTab === "shapes" || Boolean(activeShapeLayer) });
    selectLayer(null);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key !== "Backspace" && event.key !== "Delete") || !activeLayer) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
      }
      event.preventDefault();
      removeActiveLayer();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLayer, removeActiveLayer]);

  const previewTopOverlay = showTextQuickToolbar ? (
    <TextQuickToolbar
      activeTextToolPanel={activeTextToolPanel}
      onTextToolPanelChange={setActiveTextToolPanel}
      textFontLabel={textFontLabel}
      textFillMode={textFillMode}
      textColor={textColor}
      textGradientCss={activeTextGradient.css}
      textSize={textSize}
      onTextSizeChange={setTextSize}
      minTextFontSize={minTextFontSize}
      maxTextFontSize={maxTextFontSize}
      textWeight={textWeight}
      onTextWeightChange={setTextWeight}
      textFontSupportsBold={textFontSupportsBold}
      textBoldWeight={textBoldWeight}
      textRegularWeight={textRegularWeight}
      textItalic={textItalic}
      onTextItalicChange={setTextItalic}
      textFontSupportsItalic={textFontSupportsItalic}
      textUnderline={textUnderline}
      onTextUnderlineChange={setTextUnderline}
      textStrikethrough={textStrikethrough}
      onTextStrikethroughChange={setTextStrikethrough}
      textUppercase={textUppercase}
      onTextUppercaseChange={setTextUppercase}
      textAlign={textAlign}
      onTextAlignChange={setTextAlign}
      disabled={false}
    />
  ) : showShapeQuickToolbar ? (
    <div ref={shapeToolbarOverlayRef} style={{ position: "relative" }}>
      <ShapeQuickToolbar
        activeShapeToolPanel={activeShapeToolPanel}
        onShapeToolPanelChange={(nextPanel) => {
          if (nextPanel === "edit") {
            setActiveTab("shapes");
            setShapeCatalogMode("replace");
          }
          setActiveShapeToolPanel(nextPanel);
          setShowShapeStrokePopover(false);
        }}
        shapeCatalogMode={effectiveShapeCatalogMode}
        shapeColor={shapeColor}
        shapeStrokeStyle={shapeStrokeStyle}
        shapeStrokeColor={shapeStrokeColor}
        strokePopoverAnchorRef={shapeStrokeButtonRef}
        onToggleStrokePopover={() => setShowShapeStrokePopover((currentValue) => !currentValue)}
        isStrokePopoverOpen={showShapeStrokePopover}
        disabled={false}
      />
      {showShapeStrokePopover ? (
        <ShapeStrokePopover
          shapeStrokeStyle={shapeStrokeStyle}
          onShapeStrokeStyleChange={setShapeStrokeStyle}
          shapeStrokeWidth={shapeStrokeWidth}
          onShapeStrokeWidthChange={setShapeStrokeWidth}
          popoverLeft={shapeStrokePopoverLeft}
        />
      ) : null}
    </div>
  ) : null;

  useEffect(() => {
    if (!showShapeStrokePopover) return undefined;

    const syncStrokePopoverPosition = () => {
      if (!shapeToolbarOverlayRef.current || !shapeStrokeButtonRef.current) return;

      const overlayWidth = shapeToolbarOverlayRef.current.offsetWidth || 0;
      const buttonLeft = shapeStrokeButtonRef.current.offsetLeft || 0;
      const maxLeft = Math.max(0, overlayWidth - 332);
      setShapeStrokePopoverLeft(Math.min(buttonLeft, maxLeft));
    };

    syncStrokePopoverPosition();

    const handlePointerDownOutside = (event) => {
      if (shapeToolbarOverlayRef.current?.contains(event.target)) return;
      setShowShapeStrokePopover(false);
    };

    window.addEventListener("resize", syncStrokePopoverPosition);
    window.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      window.removeEventListener("resize", syncStrokePopoverPosition);
      window.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, [showShapeStrokePopover]);

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh" }}>
      <style>{STYLES}</style>

      <div className="page-shell" style={{ maxWidth: 1680, margin: "0 auto", padding: "28px 16px 56px" }}>
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

        <div className="constructor-shell" style={{ display: "grid", gridTemplateColumns: "minmax(236px,272px) minmax(0,1fr) minmax(236px,288px)", gap: 18, alignItems: "start", width: "100%", padding: 0, boxSizing: "border-box" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, justifySelf: "start", width: "100%", minWidth: 0 }}>
            <ConstructorTabsNav tabs={CONSTRUCTOR_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
            <ConstructorSidebarPanel activeTab={activeTab} onTabChange={setActiveTab} side={side} printArea={printArea} products={products} product={product} productKey={productKey} onProductChange={handleProductChange} size={size} onSizeChange={setSize} qty={qty} onQtyChange={setQty} color={color} onColorChange={handleColorChange} resolveColorSwatch={resolveColorSwatch} layers={sideLayers} activeLayer={activeLayer} activeLayerId={activeLayerId} activeUploadLayer={activeUploadLayer} activeTextLayer={activeTextLayer} activeTextMetricsCm={activeTextMetricsCm} activeTextToolPanel={activeTextToolPanel} activePresetLayer={activePresetLayer} activeShapeLayer={activeShapeLayer} activeShapeToolPanel={activeShapeToolPanel} shapeCatalogMode={effectiveShapeCatalogMode} onShapeCatalogModeChange={setShapeCatalogMode} onShapeToolPanelChange={setActiveShapeToolPanel} onLayerSelect={handleLayerEditOpen} onLayerActivate={handleLayerActivate} onLayerEditOpen={handleLayerEditOpen} onLayerReorder={(nextLayerIds) => reorderLayers(nextLayerIds, side)} onAddTextLayer={addTextLayer} onAddPresetLayer={addPresetLayer} onAddShapeLayer={addShapeLayer} onDuplicateActiveLayer={duplicateActiveLayer} onRemoveLayer={removeLayer} onRemoveActiveLayer={removeActiveLayer} onMoveLayer={moveActiveLayer} onToggleLayerVisibility={toggleLayerVisibility} onToggleLayerLock={toggleLayerLock} handleUploadChange={handleUploadChange} handleUploadRemove={handleUploadRemove} uploadWidthCm={uploadWidthCm} uploadHeightCm={uploadHeightCm} handleUploadScaleChange={handleUploadScaleChange} centerActiveLayerPosition={centerActiveLayerPosition} textFillMode={textFillMode} textColor={textColor} onTextColorChange={setTextColor} textGradientKey={textGradientKey} onTextGradientKeyChange={setTextGradientKey} textFontKey={textFontKey} onTextFontKeyChange={setTextFontKey} textLineHeight={textLineHeight} onTextLineHeightChange={setTextLineHeight} textLetterSpacing={textLetterSpacing} onTextLetterSpacingChange={setTextLetterSpacing} textStrokeWidth={textStrokeWidth} onTextStrokeWidthChange={setTextStrokeWidth} textStrokeColor={textStrokeColor} onTextStrokeColorChange={setTextStrokeColor} textShadowEnabled={textShadowEnabled} onTextShadowEnabledChange={setTextShadowEnabled} textShadowColor={textShadowColor} onTextShadowColorChange={setTextShadowColor} textShadowOffsetX={textShadowOffsetX} onTextShadowOffsetXChange={setTextShadowOffsetX} textShadowOffsetY={textShadowOffsetY} onTextShadowOffsetYChange={setTextShadowOffsetY} textShadowBlur={textShadowBlur} onTextShadowBlurChange={setTextShadowBlur} presetPrints={presetPrints} presetKey={presetKey} onPresetKeyChange={setPresetKey} presetWidthCm={presetWidthCm} presetHeightCm={presetHeightCm} onPresetWidthCmChange={setPresetWidthCm} shapeKey={shapeKey} onShapeKeyChange={setShapeKey} shapeFillMode={shapeFillMode} shapeColor={shapeColor} onShapeColorChange={setShapeColor} shapeGradientKey={shapeGradientKey} onShapeGradientKeyChange={setShapeGradientKey} shapeStrokeStyle={shapeStrokeStyle} onShapeStrokeStyleChange={setShapeStrokeStyle} shapeStrokeWidth={shapeStrokeWidth} onShapeStrokeWidthChange={setShapeStrokeWidth} shapeStrokeColor={shapeStrokeColor} onShapeStrokeColorChange={setShapeStrokeColor} shapeEffectType={shapeEffectType} onShapeEffectTypeChange={setShapeEffectType} shapeEffectAngle={shapeEffectAngle} onShapeEffectAngleChange={setShapeEffectAngle} shapeEffectDistance={shapeEffectDistance} onShapeEffectDistanceChange={setShapeEffectDistance} shapeEffectColor={shapeEffectColor} onShapeEffectColorChange={setShapeEffectColor} shapeDistortionColorA={shapeDistortionColorA} onShapeDistortionColorAChange={setShapeDistortionColorA} shapeDistortionColorB={shapeDistortionColorB} onShapeDistortionColorBChange={setShapeDistortionColorB} shapeWidthCm={shapeWidthCm} shapeHeightCm={shapeHeightCm} onShapeWidthCmChange={setShapeWidthCm} />
          </div>

          <div style={{ minWidth: 0, position: "sticky", top: 18, alignSelf: "start" }}>
            <ConstructorPreviewPanel side={side} onSideChange={setSide} topOverlay={previewTopOverlay} previewSrc={previewSrc} productName={product.name} color={color} printAreaRef={printAreaRef} printArea={printArea} layers={sideLayers} activeLayerId={activeLayerId} draggingLayerId={draggingLayerId} activeSnapGuides={activeSnapGuides} editingTextLayerId={editingTextLayerId} onLayerPointerDown={handlePreviewLayerPointerDown} onLayerEditOpen={handleLayerEditOpen} onPreviewBackgroundPointerDown={handlePreviewBackgroundPointerDown} onActiveTextValueChange={setTextValue} onEditingTextLayerChange={setEditingTextLayerId} onLayerResize={applyLayerResize} onActiveTextMetricsChange={setActiveTextMetricsCm} onRemoveLayer={removeLayer} getPresetByKey={getPresetByKey} getShapeByKey={getShapeByKey} getTextGradientByKey={getConstructorTextGradient} />
          </div>

          <ConstructorOrderPanel currentTotal={currentTotal} orderMeta={orderMeta} canSubmitOrder={canSubmitOrder} telegramLink={telegramLink} />
        </div>
      </div>
    </div>
  );
}

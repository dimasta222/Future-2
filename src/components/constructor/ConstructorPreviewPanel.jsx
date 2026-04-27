import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildConstructorShapeSvg, getConstructorLineVisualMetrics, getConstructorTextFont } from "./constructorConfig.js";
import { resizeLayer } from "../../utils/constructor/resize/resizeLayer.js";
import { getShapeFrameMetricsPx } from "../../utils/constructor/shapeFrame.js";
import { measureTextInkBboxPx } from "../../utils/textInkBbox.js";
import { measureTextPdfInkBboxCm } from "../../utils/textPdfBbox.js";

const DEFAULT_TEXT_SHADOW = {
  light: "0 2px 14px rgba(0,0,0,.16)",
  dark: "0 2px 14px rgba(0,0,0,.32)",
};

const LOGICAL_PRINT_PX_PER_CM = 10;
const MIN_MARQUEE_DRAG_DISTANCE = 4;
const RESIZE_SNAP_THRESHOLD_PX = 2;
const RESIZE_HANDLE_SIZE = 8;
const RESIZE_HANDLE_HALF_OFFSET = 5;
const RESIZE_MIDDLE_HANDLE_LONG_SIDE = 14;
const RESIZE_MIDDLE_HANDLE_SHORT_SIDE = 4;
const RESIZE_MIDDLE_HANDLE_SHORT_OFFSET = 3;

const RESIZE_HANDLES = [
  { key: "nw", x: -1, y: -1, cursor: "nwse-resize", style: { left: -RESIZE_HANDLE_HALF_OFFSET, top: -RESIZE_HANDLE_HALF_OFFSET } },
  { key: "n", x: 0, y: -1, cursor: "ns-resize", style: { left: "50%", top: -RESIZE_MIDDLE_HANDLE_SHORT_OFFSET, transform: "translateX(-50%)" } },
  { key: "ne", x: 1, y: -1, cursor: "nesw-resize", style: { right: -RESIZE_HANDLE_HALF_OFFSET, top: -RESIZE_HANDLE_HALF_OFFSET } },
  { key: "e", x: 1, y: 0, cursor: "ew-resize", style: { right: -RESIZE_MIDDLE_HANDLE_SHORT_OFFSET, top: "50%", transform: "translateY(-50%)" } },
  { key: "se", x: 1, y: 1, cursor: "nwse-resize", style: { right: -RESIZE_HANDLE_HALF_OFFSET, bottom: -RESIZE_HANDLE_HALF_OFFSET } },
  { key: "s", x: 0, y: 1, cursor: "ns-resize", style: { left: "50%", bottom: -RESIZE_MIDDLE_HANDLE_SHORT_OFFSET, transform: "translateX(-50%)" } },
  { key: "sw", x: -1, y: 1, cursor: "nesw-resize", style: { left: -RESIZE_HANDLE_HALF_OFFSET, bottom: -RESIZE_HANDLE_HALF_OFFSET } },
  { key: "w", x: -1, y: 0, cursor: "ew-resize", style: { left: -RESIZE_MIDDLE_HANDLE_SHORT_OFFSET, top: "50%", transform: "translateY(-50%)" } },
];

const TEXT_RESIZE_HANDLE_KEYS = new Set(["nw", "ne", "se", "sw", "e", "w"]);
const LINE_SHAPE_HANDLE_KEYS = new Set(["e", "w"]);
const MIDDLE_RESIZE_HANDLE_KEYS = new Set(["n", "e", "s", "w"]);
const DEFAULT_TEXT_LINE_HEIGHT = 1.05;

const textMeasureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const textMeasureContext = textMeasureCanvas?.getContext("2d") || null;

function getResizeHandleAnchorStyle(handleKey, anchorPoint) {
  if (!anchorPoint) return null;

  const x = Math.max(0, Math.min(100, Number(anchorPoint.x) || 0));
  const y = Math.max(0, Math.min(100, Number(anchorPoint.y) || 0));
  const isMiddleHandle = MIDDLE_RESIZE_HANDLE_KEYS.has(handleKey);
  const isVerticalMiddleHandle = handleKey === "e" || handleKey === "w";

  if (!isMiddleHandle) {
    return {
      left: `calc(${x}% - ${RESIZE_HANDLE_HALF_OFFSET}px)`,
      top: `calc(${y}% - ${RESIZE_HANDLE_HALF_OFFSET}px)`,
      right: "auto",
      bottom: "auto",
      transform: "none",
    };
  }

  return {
    left: `calc(${x}% - ${isVerticalMiddleHandle ? RESIZE_MIDDLE_HANDLE_SHORT_OFFSET : RESIZE_MIDDLE_HANDLE_LONG_SIDE / 2}px)`,
    top: `calc(${y}% - ${isVerticalMiddleHandle ? RESIZE_MIDDLE_HANDLE_LONG_SIDE / 2 : RESIZE_MIDDLE_HANDLE_SHORT_OFFSET}px)`,
    right: "auto",
    bottom: "auto",
    transform: "none",
  };
}

function getTextDecorationLine(layer) {
  const decorationLines = [];
  if (layer.underline) decorationLines.push("underline");
  if (layer.strikethrough) decorationLines.push("line-through");
  return decorationLines.length ? decorationLines.join(" ") : "none";
}

function getDirectionalOffset(angle, distance) {
  const radians = ((Number(angle) || 0) * Math.PI) / 180;
  const radius = Number(distance) || 0;

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function measureCanvasTextWidth(text, letterSpacing = 0) {
  if (!textMeasureContext) return 0;

  const value = String(text || "");
  if (!value.length) return 0;

  return textMeasureContext.measureText(value).width + Math.max(0, value.length - 1) * letterSpacing;
}

function wrapTextToWidth(text, maxWidthPx, letterSpacing = 0) {
  const manualLines = String(text || "").replace(/\r/g, "").split("\n");
  const lines = [];
  const safeMaxWidthPx = Math.max(1, maxWidthPx);

  manualLines.forEach((manualLine) => {
    if (!manualLine.length) {
      lines.push("");
      return;
    }

    let currentLine = "";

    for (const character of manualLine) {
      const candidate = `${currentLine}${character}`;
      const candidateWidth = measureCanvasTextWidth(candidate, letterSpacing);

      if (currentLine && candidateWidth > safeMaxWidthPx) {
        lines.push(currentLine);
        currentLine = character;
        continue;
      }

      currentLine = candidate;
    }

    lines.push(currentLine);
  });

  return lines.length ? lines : [""];
}

// Возвращает массив строк (как DOM их реально перенёс), используя Range над
// контейнером с текстом. Walks по символам и группирует по top-координате.
function sliceTextByDomLines(node, fullText) {
  if (typeof document === "undefined" || !node || !fullText) return null;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let n = walker.nextNode();
  while (n) { textNodes.push(n); n = walker.nextNode(); }
  if (!textNodes.length) return null;

  const range = document.createRange();
  const lines = [];
  let currentLine = "";
  let currentTop = null;
  const tolerance = 2;

  const positionToNodeOffset = (globalIdx) => {
    let remain = globalIdx;
    for (const tn of textNodes) {
      const len = tn.textContent.length;
      if (remain <= len) return { node: tn, offset: remain };
      remain -= len;
    }
    return null;
  };

  const totalLen = textNodes.reduce((sum, tn) => sum + tn.textContent.length, 0);
  for (let i = 0; i < totalLen; i++) {
    const start = positionToNodeOffset(i);
    const end = positionToNodeOffset(i + 1);
    if (!start || !end) continue;
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const rects = range.getClientRects();
    let charTop = null;
    for (const r of rects) {
      if (r.width > 0 && r.height > 0) {
        charTop = r.top;
        break;
      }
    }
    const ch = fullText[i] ?? "";
    if (ch === "\n") {
      lines.push(currentLine);
      currentLine = "";
      currentTop = null;
      continue;
    }
    if (charTop == null) {
      currentLine += ch;
      continue;
    }
    if (currentTop == null || Math.abs(charTop - currentTop) < tolerance) {
      currentLine += ch;
      currentTop = currentTop ?? charTop;
    } else {
      lines.push(currentLine);
      currentLine = ch;
      currentTop = charTop;
    }
  }
  if (currentLine.length || lines.length === 0) lines.push(currentLine);
  return lines.length ? lines : null;
}

function getTextContentMetricsPx({
  text,
  fontFamily,
  fontSize,
  fontWeight,
  fontStyle,
  lineHeight,
  letterSpacing,
  boxWidthPx,
}) {
  const safeFontSize = Math.max(1, Number(fontSize) || 1);
  const safeLineHeight = Math.max(0.5, Number(lineHeight) || DEFAULT_TEXT_LINE_HEIGHT);
  const safeBoxWidthPx = Math.max(1, Number(boxWidthPx) || 1);
  const resolvedText = String(text || "");
  
  if (!textMeasureContext) {
    const fallbackWidth = resolvedText.length
      ? Math.min(safeBoxWidthPx, resolvedText.length * safeFontSize * 0.56)
      : 0;
    const fallbackHeight = resolvedText.length
      ? Math.max(1, safeFontSize)
      : 0;

    return {
      contentWidthPx: Number(fallbackWidth.toFixed(2)),
      contentHeightPx: Number(fallbackHeight.toFixed(2)),
    };
  }

  textMeasureContext.font = `${fontStyle} ${fontWeight} ${safeFontSize}px ${fontFamily}`;
  const lines = wrapTextToWidth(resolvedText, safeBoxWidthPx, letterSpacing);
  const lineWidths = lines.map((line) => measureCanvasTextWidth(line, letterSpacing));
  const sampleMetrics = textMeasureContext.measureText(resolvedText || "Hg");
  const glyphHeightPx = Math.max(1, (sampleMetrics.actualBoundingBoxAscent || safeFontSize * 0.72) + (sampleMetrics.actualBoundingBoxDescent || safeFontSize * 0.18));
  const lineHeightPx = safeFontSize * safeLineHeight;
  const fallbackContentWidthPx = resolvedText.length
    ? Math.min(safeBoxWidthPx, Math.max(...lineWidths, 0))
    : 0;
  const fallbackContentHeightPx = resolvedText.length
    ? Math.max(1, glyphHeightPx + Math.max(0, lines.length - 1) * lineHeightPx)
    : 0;

  let contentWidthPx = fallbackContentWidthPx;
  let contentHeightPx = fallbackContentHeightPx;
  if (resolvedText.length) {
    const ink = measureTextInkBboxPx({
      text: resolvedText,
      fontFamily,
      fontSize: safeFontSize,
      fontWeight,
      fontStyle,
      lineHeight: safeLineHeight,
      letterSpacing,
      boxWidthPx: safeBoxWidthPx,
      textAlign: "center",
    });
    if (ink && ink.inkWidthPx > 0 && ink.inkHeightPx > 0) {
      contentWidthPx = Math.min(safeBoxWidthPx, ink.inkWidthPx);
      contentHeightPx = Math.max(1, ink.inkHeightPx);
    }
  }

  return {
    contentWidthPx: Number(contentWidthPx.toFixed(2)),
    contentHeightPx: Number(contentHeightPx.toFixed(2)),
  };
}

function selectAllEditableText(target) {
  if (!target || typeof window === "undefined" || typeof document === "undefined") return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(target);
  selection.removeAllRanges();
  selection.addRange(range);
}

function focusElementWithoutScroll(target) {
  if (!target) return;

  if (typeof target.focus === "function") {
    try {
      target.focus({ preventScroll: true });
      return;
    } catch {
      target.focus();
    }
  }
}

function isSelectAllShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  return key === "a" && (event.metaKey || event.ctrlKey) && !event.altKey;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildClampedSelectionRect(startPoint, currentPoint, bounds) {
  const startX = clamp(startPoint.x, bounds.left, bounds.right);
  const startY = clamp(startPoint.y, bounds.top, bounds.bottom);
  const currentX = clamp(currentPoint.x, bounds.left, bounds.right);
  const currentY = clamp(currentPoint.y, bounds.top, bounds.bottom);

  const left = Math.min(startX, currentX);
  const right = Math.max(startX, currentX);
  const top = Math.min(startY, currentY);
  const bottom = Math.max(startY, currentY);

  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function rectsIntersect(firstRect, secondRect) {
  if (!firstRect || !secondRect) return false;

  return !(
    firstRect.right < secondRect.left
    || firstRect.left > secondRect.right
    || firstRect.bottom < secondRect.top
    || firstRect.top > secondRect.bottom
  );
}

function snapEdgeToGuides(edgePx, guidePositions, thresholdPx = RESIZE_SNAP_THRESHOLD_PX) {
  let best = null;

  guidePositions.forEach((guide) => {
    const distance = Math.abs(guide - edgePx);
    if (distance > thresholdPx) return;
    if (!best || distance < best.distance) {
      best = { guide, delta: guide - edgePx, distance };
    }
  });

  return best;
}

function normalizeRotationDeg(value) {
  const n = Number(value) || 0;
  return ((n % 360) + 360) % 360;
}


export default function ConstructorPreviewPanel({
  side,
  onSideChange,
  previewSrc,
  productName,
  color,
  printAreaRef,
  printArea,
  layers,
  activeLayerId,
  selectedLayerIds = [],
  draggingLayerId,
  activeSnapGuides = [],
  editingTextLayerId,
  onLayerPointerDown,
  onLayerEditOpen,
  onPreviewBackgroundPointerDown,
  onMarqueeSelectLayerIds,
  onActiveTextValueChange,
  onEditingTextLayerChange,
  onLayerResize,
  onActiveTextMetricsChange,
  onRuntimeTextLayerBoundsChange,
  getShapeByKey,
  getTextGradientByKey,
  setActiveSnapGuides,
  getCombinedSnapGuidesPx,
}) {
  const [resizingLayerId, setResizingLayerId] = useState(null);
  const [rotatingLayerId, setRotatingLayerId] = useState(null);
  const [hoveredLayerId, setHoveredLayerId] = useState(null);
  const [marqueeSelection, setMarqueeSelection] = useState(null);
  const [printAreaPixelSize, setPrintAreaPixelSize] = useState({ width: 0, height: 0 });
  // Тик инвалидируется когда textInkBbox видит, что какой-то шрифт догрузился
  // в FontFaceSet — нужно перепересчитать ink-метрики (они были с fallback).
  const [, setFontReloadTick] = useState(0);
  useEffect(() => {
    const handler = () => setFontReloadTick((n) => n + 1);
    window.addEventListener("textInkBboxFontLoaded", handler);
    return () => window.removeEventListener("textInkBboxFontLoaded", handler);
  }, []);
  const editableTextLayerRefs = useRef({});
  const layerNodeRefs = useRef({});
  const textContentLayerRefs = useRef({});
  const textLayerRefs = useRef({});
  const lastFocusedEditingLayerIdRef = useRef(null);
  const activeTextMetricsRef = useRef(null);
  const physicalWidthCm = Math.max(1, Number(printArea?.physicalWidthCm) || 1);
  const physicalHeightCm = Math.max(1, Number(printArea?.physicalHeightCm) || 1);
  // Baseline (XS) physical width/height — используется для стабильных измерений
  // wrap / ink-bbox текста, чтобы перенос строк не менялся между размерами
  // футболок и текст не "прыгал" при переключении.
  const baselinePhysicalWidthCm = Math.max(1, Number(printArea?.baselinePhysicalWidthCm) || physicalWidthCm);
  const activeTextLayer = layers.find((layer) => layer.id === activeLayerId && layer.type === "text") || null;
  const editingLayer = layers.find((layer) => layer.id === editingTextLayerId) || null;
  const editingLayerValue = editingLayer?.value || "";

  useLayoutEffect(() => {
    const node = printAreaRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;

    const updateSize = () => {
      const bounds = node.getBoundingClientRect();
      setPrintAreaPixelSize((currentSize) => {
        const nextSize = {
          width: Number(bounds.width.toFixed(2)),
          height: Number(bounds.height.toFixed(2)),
        };

        if (currentSize.width === nextSize.width && currentSize.height === nextSize.height) {
          return currentSize;
        }

        return nextSize;
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);

    return () => observer.disconnect();
  }, [printAreaRef]);

  useEffect(() => {
    if (!editingTextLayerId) {
      lastFocusedEditingLayerIdRef.current = null;
      return;
    }

    const node = editableTextLayerRefs.current[editingTextLayerId];
    if (!node) return;

    if (node.textContent !== editingLayerValue && document.activeElement !== node) {
      node.textContent = editingLayerValue;
    }

    if (document.activeElement !== node) {
      focusElementWithoutScroll(node);
    }

    if (lastFocusedEditingLayerIdRef.current !== editingTextLayerId) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      lastFocusedEditingLayerIdRef.current = editingTextLayerId;
    }
  }, [editingTextLayerId, editingLayerValue]);

  useLayoutEffect(() => {
    if (draggingLayerId) return undefined;
    if (!activeTextLayer || !printAreaRef.current) {
      const clearFrame = window.requestAnimationFrame(() => {
        if (activeTextMetricsRef.current) {
          activeTextMetricsRef.current = null;
          onActiveTextMetricsChange?.(null);
        }
      });

      return () => window.cancelAnimationFrame(clearFrame);
    }

    const frame = window.requestAnimationFrame(() => {
      const printAreaBounds = printAreaRef.current?.getBoundingClientRect();
      const textLayerNode = textLayerRefs.current[activeTextLayer.id];

      if (!printAreaBounds?.width || !printAreaBounds?.height || !textLayerNode) {
        if (activeTextMetricsRef.current) {
          activeTextMetricsRef.current = null;
          onActiveTextMetricsChange?.(null);
        }
        return;
      }

      const textLayerBounds = textLayerNode.getBoundingClientRect();
      const textRotDeg = normalizeRotationDeg(Number(activeTextLayer.rotationDeg) || 0);
      const boxWidthPx = textRotDeg
        ? Number((printAreaBounds.width * (Math.min(100, Math.max(1, activeTextLayer.textBoxWidth ?? 88)) / 100)).toFixed(2))
        : Number(textLayerBounds.width.toFixed(2));
      const boxHeightPx = textRotDeg
        ? Number(Math.max(textLayerBounds.height, 1).toFixed(2))
        : Number(Math.max(textLayerBounds.height, 1).toFixed(2));
      const layerFont = getConstructorTextFont(activeTextLayer.fontKey);
      const fontWeight = layerFont.supportsBold ? activeTextLayer.weight : (layerFont.regularWeight ?? 400);
      const fontStyle = layerFont.supportsItalic && activeTextLayer.italic ? "italic" : "normal";
      const displayText = activeTextLayer.uppercase ? String(activeTextLayer.value || "").toUpperCase() : String(activeTextLayer.value || "");
      const textMetrics = getTextContentMetricsPx({
        text: displayText,
        fontFamily: activeTextLayer.fontFamily || layerFont.family,
        fontSize: activeTextLayer.size,
        fontWeight,
        fontStyle,
        lineHeight: activeTextLayer.lineHeight,
        letterSpacing: activeTextLayer.letterSpacing,
        boxWidthPx,
      });
      // Используем canvas alpha-scan ink (true glyph ink, как Photoshop Trim),
      // а не DOM Range bbox — последний даёт line-box (с ascender/descender
      // padding шрифта) и расходится со snap-границами других слоёв.
      // linesOverride: даём DOM-перенос строк, чтобы canvas не делал свой
      // (snug-box проблема при разнице sub-pixel).
      const textContentNode = textContentLayerRefs.current[activeTextLayer.id] || null;
      let domLines = null;
      if (!textRotDeg && textContentNode && displayText.trim().length) {
        try {
          const fullText = String(textContentNode.textContent || displayText);
          domLines = sliceTextByDomLines(textContentNode, fullText);
        } catch { /* ignore */ }
      }
      const boxWidthCmForMeasure = textRotDeg
        ? null
        : (boxWidthPx / printAreaBounds.width) * physicalWidthCm;
      const pdfInk = displayText.trim().length
        ? measureTextPdfInkBboxCm({
            layer: activeTextLayer,
            fontFamily: activeTextLayer.fontFamily || layerFont.family,
            fontWeight,
            fontStyle,
            physicalWidthCm,
            baselinePhysicalWidthCm,
            boxWidthCmOverride: boxWidthCmForMeasure,
            linesOverride: domLines,
          })
        : null;
      const pdfInkWidthPx = pdfInk ? (pdfInk.widthCm / physicalWidthCm) * printAreaBounds.width : null;
      const pdfInkHeightPx = pdfInk ? (pdfInk.heightCm / physicalHeightCm) * printAreaBounds.height : null;
      const contentWidthPx = Number(Math.min(
        printAreaBounds.width,
        pdfInkWidthPx ?? textMetrics.contentWidthPx,
      ).toFixed(2));
      const contentHeightPx = Number(Math.min(
        printAreaBounds.height,
        pdfInkHeightPx ?? textMetrics.contentHeightPx,
      ).toFixed(2));
      const nextValue = {
        layerId: activeTextLayer.id,
        boxWidthPx,
        boxHeightPx,
        contentWidthPx,
        contentHeightPx,
        physicalWidthCm,
        physicalHeightCm,
      };
      const currentValue = activeTextMetricsRef.current;
      if (
        currentValue?.layerId === nextValue.layerId
        && currentValue?.boxWidthPx === nextValue.boxWidthPx
        && currentValue?.boxHeightPx === nextValue.boxHeightPx
        && currentValue?.contentWidthPx === nextValue.contentWidthPx
        && currentValue?.contentHeightPx === nextValue.contentHeightPx
        && currentValue?.physicalWidthCm === nextValue.physicalWidthCm
        && currentValue?.physicalHeightCm === nextValue.physicalHeightCm
      ) {
        return;
      }
      activeTextMetricsRef.current = nextValue;

      onActiveTextMetricsChange?.({
        contentWidthCm: Number(((contentWidthPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        contentHeightCm: Number(((contentHeightPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        boxWidthCm: Number(((boxWidthPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        boxHeightCm: Number(((boxHeightPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    activeTextLayer,
    activeTextLayer?.id,
    activeTextLayer?.value,
    activeTextLayer?.size,
    activeTextLayer?.textBoxWidth,
    activeTextLayer?.lineHeight,
    activeTextLayer?.letterSpacing,
    activeTextLayer?.fontKey,
    activeTextLayer?.fontFamily,
    activeTextLayer?.weight,
    activeTextLayer?.italic,
    activeTextLayer?.uppercase,
    activeTextLayer?.strokeWidth,
    activeTextLayer?.textOutlineOnly,
    activeTextLayer?.outlineWidth,
    activeTextLayer?.color,
    activeTextLayer?.textAlign,
    activeTextLayer?.rotationDeg,
    baselinePhysicalWidthCm,
    draggingLayerId,
    editingTextLayerId,
    onActiveTextMetricsChange,
    physicalHeightCm,
    physicalWidthCm,
    printAreaRef,
    resizingLayerId,
  ]);

  useLayoutEffect(() => {
    if (draggingLayerId) return undefined;
    if (!printAreaRef.current) {
      onRuntimeTextLayerBoundsChange?.(side, {});
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const printAreaBounds = printAreaRef.current?.getBoundingClientRect();

      if (!printAreaBounds?.width || !printAreaBounds?.height) {
        onRuntimeTextLayerBoundsChange?.(side, {});
        return;
      }

      const nextBoundsById = {};

      layers.forEach((layer) => {
        if (layer?.type !== "text" || layer.visible === false) return;

        const textContentNode = textContentLayerRefs.current[layer.id];
        if (!textContentNode) return;

        // Считаем true glyph ink через canvas alpha-scan (как Photoshop Trim),
        // используя реальный DOM-перенос строк. Это та же метрика, что в
        // sidebar — sidebar и order card получают одинаковые числа.
        const textRotDeg = normalizeRotationDeg(Number(layer.rotationDeg) || 0);
        const fullText = String(textContentNode.textContent || layer.value || "");
        if (!fullText.trim().length) return;

        const layerFontForRuntime = getConstructorTextFont(layer.fontKey);
        const fontWeightRuntime = layerFontForRuntime.supportsBold ? layer.weight : (layerFontForRuntime.regularWeight ?? 400);
        const fontStyleRuntime = layerFontForRuntime.supportsItalic && layer.italic ? "italic" : "normal";

        const textLayerNode = textLayerRefs.current[layer.id];
        const textLayerBoundsRuntime = textLayerNode ? textLayerNode.getBoundingClientRect() : null;
        const boxWidthPxRuntime = textLayerBoundsRuntime
          ? (textRotDeg
              ? printAreaBounds.width * (Math.min(100, Math.max(1, layer.textBoxWidth ?? 88)) / 100)
              : textLayerBoundsRuntime.width)
          : printAreaBounds.width * (Math.min(100, Math.max(1, layer.textBoxWidth ?? 88)) / 100);
        const boxWidthCmRuntime = textRotDeg ? null : (boxWidthPxRuntime / printAreaBounds.width) * physicalWidthCm;

        let domLinesRuntime = null;
        if (!textRotDeg) {
          try {
            domLinesRuntime = sliceTextByDomLines(textContentNode, fullText);
          } catch { /* ignore */ }
        }

        const pdfInk = measureTextPdfInkBboxCm({
          layer,
          fontFamily: layer.fontFamily || layerFontForRuntime.family,
          fontWeight: fontWeightRuntime,
          fontStyle: fontStyleRuntime,
          physicalWidthCm,
          baselinePhysicalWidthCm,
          boxWidthCmOverride: boxWidthCmRuntime,
          linesOverride: domLinesRuntime,
        });

        if (!pdfInk || pdfInk.widthCm <= 0 || pdfInk.heightCm <= 0) return;

        const centerXCm = ((Number(layer.position?.x) || 50) / 100) * physicalWidthCm;
        const centerYCm = ((Number(layer.position?.y) || 50) / 100) * physicalHeightCm;
        const halfW = pdfInk.widthCm / 2;
        const halfH = pdfInk.heightCm / 2;

        // Реальный размер DOM-обёртки текста — line-box, который CSS
        // фактически разметил под этот слой. Передаём в clamp чтобы
        // он работал по фактическим пикселям, а не по теоретической
        // формуле N_lines × fontSize × lineHeight (которая может
        // расходиться с DOM word-wrap).
        // ВАЖНО: при rotation getBoundingClientRect возвращает AABB вокруг
        // повёрнутой рамки — его НЕЛЬЗЯ передавать как «line-box», иначе
        // clamp в useConstructorState ещё раз свернёт его в AABB через
        // cos/sin и рамка не сможет дойти до края печатной области.
        const domLineBoxWidthCm = (textLayerBoundsRuntime && !textRotDeg)
          ? (textLayerBoundsRuntime.width / printAreaBounds.width) * physicalWidthCm
          : null;
        const domLineBoxHeightCm = (textLayerBoundsRuntime && !textRotDeg)
          ? (textLayerBoundsRuntime.height / printAreaBounds.height) * physicalHeightCm
          : null;

        nextBoundsById[layer.id] = {
          left: Number((centerXCm - halfW).toFixed(3)),
          right: Number((centerXCm + halfW).toFixed(3)),
          top: Number((centerYCm - halfH).toFixed(3)),
          bottom: Number((centerYCm + halfH).toFixed(3)),
          source: "ink-canvas",
          positionX: Number(layer.position?.x) || 50,
          positionY: Number(layer.position?.y) || 50,
          domLineBoxWidthCm,
          domLineBoxHeightCm,
        };
      });

      onRuntimeTextLayerBoundsChange?.(side, nextBoundsById);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    layers,
    draggingLayerId,
    onRuntimeTextLayerBoundsChange,
    physicalHeightCm,
    physicalWidthCm,
    baselinePhysicalWidthCm,
    printAreaRef,
    resizingLayerId,
    side,
  ]);

  const getLayerRenderFrame = (layer) => {
    if (layer.type === "upload") {
      return layer.renderFrame || {
        innerOffsetXPercent: 0,
        innerOffsetYPercent: 0,
        innerWidthPercent: 100,
        innerHeightPercent: 100,
      };
    }

    return null;
  };

  const getLayerRenderSize = (layer) => {
    const widthPercent = ((layer.widthCm || 1) / physicalWidthCm) * 100;
    const pxW = printAreaPixelSize.width;
    const pxH = printAreaPixelSize.height;
    const pxPerCm = pxW > 0 ? pxW / physicalWidthCm : 1;
    const heightPercent = pxH > 0
      ? ((layer.heightCm || 1) * pxPerCm / pxH) * 100
      : ((layer.heightCm || 1) / physicalWidthCm) * 100;
    return { width: `${widthPercent}%`, height: `${heightPercent}%` };
  };

  const getShapeRenderFrame = (layer) => {
    const printAreaWidthPx = Math.max(1, Number(printAreaPixelSize.width) || 0);
    const printAreaHeightPx = Math.max(1, Number(printAreaPixelSize.height) || 0);
    const isLineShape = getShapeByKey(layer.shapeKey)?.category === "lines";
    const logicalPrintAreaWidthPx = Math.max(1, physicalWidthCm * LOGICAL_PRINT_PX_PER_CM);
    const logicalPrintAreaHeightPx = Math.max(1, physicalHeightCm * LOGICAL_PRINT_PX_PER_CM);
    const pxPerCmX = printAreaWidthPx / Math.max(0.001, physicalWidthCm);
    const fallbackWidthPx = (layer.widthCm || 1) * pxPerCmX;
    const fallbackHeightPx = (layer.heightCm || 1) * pxPerCmX;
    const baseWidthPx = isLineShape
      ? (((Number(layer.lineWidthPx) || ((layer.widthCm || 1) * LOGICAL_PRINT_PX_PER_CM)) / logicalPrintAreaWidthPx) * printAreaWidthPx)
      : fallbackWidthPx;
    const baseHeightPx = isLineShape
      ? (((Number(layer.lineHeightPx) || ((layer.heightCm || 1) * LOGICAL_PRINT_PX_PER_CM)) / logicalPrintAreaHeightPx) * printAreaHeightPx)
      : fallbackHeightPx;
    const frameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx,
      baseHeightPx,
    });
    const safeFrameWidthPx = Math.max(1, frameMetrics.frameWidthPx);
    const safeFrameHeightPx = Math.max(1, frameMetrics.frameHeightPx);
    const lineAspectRatio = isLineShape
      ? Math.max(0.2, baseWidthPx / Math.max(1, baseHeightPx))
      : null;
    const lineVisualMetrics = isLineShape
      ? getConstructorLineVisualMetrics(layer.shapeKey, layer.strokeWidth, lineAspectRatio)
      : null;
    const lineScale = isLineShape
      ? Math.max(1, baseHeightPx) / Math.max(1, lineVisualMetrics.layoutHeightPx)
      : 0;
    const lineLeftInsetPx = isLineShape ? lineVisualMetrics.leftInsetPx * lineScale : frameMetrics.leftPaddingPx;
    const lineRightInsetPx = isLineShape ? lineVisualMetrics.rightInsetPx * lineScale : frameMetrics.rightPaddingPx;
    const lineVisibleWidthPx = isLineShape
      ? Math.max(1, baseWidthPx - lineLeftInsetPx - lineRightInsetPx)
      : Math.max(1, frameMetrics.contentWidthPx || baseWidthPx);

    return {
      outerWidth: `${(safeFrameWidthPx / printAreaWidthPx) * 100}%`,
      outerHeight: `${(safeFrameHeightPx / printAreaHeightPx) * 100}%`,
      baseWidthPx: Math.max(1, baseWidthPx),
      baseHeightPx: Math.max(1, baseHeightPx),
      leftPercent: 100 * (lineLeftInsetPx / safeFrameWidthPx),
      rightPercent: 100 * (lineRightInsetPx / safeFrameWidthPx),
      centerYPercent: 100 * ((frameMetrics.topPaddingPx + (Math.max(1, frameMetrics.contentHeightPx || baseHeightPx) / 2)) / safeFrameHeightPx),
      lineLeftInsetPx,
      lineRightInsetPx,
      lineVisibleWidthPx,
      innerStyle: {
        left: `${(frameMetrics.leftPaddingPx / safeFrameWidthPx) * 100}%`,
        top: `${(frameMetrics.topPaddingPx / safeFrameHeightPx) * 100}%`,
        width: `${(Math.max(1, frameMetrics.contentWidthPx || baseWidthPx) / safeFrameWidthPx) * 100}%`,
        height: `${(Math.max(1, frameMetrics.contentHeightPx || baseHeightPx) / safeFrameHeightPx) * 100}%`,
      },
      isLineShape,
      logicalPrintAreaWidthPx,
      logicalPrintAreaHeightPx,
      frameMetrics,
    };
  };

  const handleLayerResizePointerDown = (layer, handle, event) => {
    event.preventDefault();
    event.stopPropagation();

    if (layer.locked || layer.id !== activeLayerId || !printAreaRef.current || !onLayerResize) return;

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const layerNode = layer.type === "text"
      ? textLayerRefs.current[layer.id]
      : node.parentElement;
    if (!layerNode) return;

    const printAreaBounds = printAreaRef.current.getBoundingClientRect();
    const layerBounds = layerNode.getBoundingClientRect();
    if (!printAreaBounds.width || !printAreaBounds.height || !layerBounds.width || !layerBounds.height) return;

    const startPointer = { x: event.clientX, y: event.clientY };
    const startWidthCm = layer.widthCm ?? 0;
    const startHeightCm = layer.heightCm ?? 0;
    const initialShapeRenderFrame = layer.type === "shape" ? getShapeRenderFrame(layer) : null;
    const layerRotationDeg = Number(layer.rotationDeg) || 0;
    let startRenderedWidth = layerBounds.width;
    let startRenderedHeight = layerBounds.height;
    let startBoundsLeft = layerBounds.left - printAreaBounds.left;
    let startBoundsTop = layerBounds.top - printAreaBounds.top;
    let startBoundsRight = startBoundsLeft + startRenderedWidth;
    let startBoundsBottom = startBoundsTop + startRenderedHeight;

    if (initialShapeRenderFrame?.isLineShape) {
      const centerX = (layer.position.x / 100) * printAreaBounds.width;
      const centerY = (layer.position.y / 100) * printAreaBounds.height;
      startRenderedWidth = initialShapeRenderFrame.frameMetrics.frameWidthPx;
      startRenderedHeight = initialShapeRenderFrame.frameMetrics.frameHeightPx;
      startBoundsLeft = centerX - (startRenderedWidth / 2);
      startBoundsTop = centerY - (startRenderedHeight / 2);
      startBoundsRight = startBoundsLeft + startRenderedWidth;
      startBoundsBottom = startBoundsTop + startRenderedHeight;
    } else if (layerRotationDeg) {
      const centerX = (layer.position.x / 100) * printAreaBounds.width;
      const centerY = (layer.position.y / 100) * printAreaBounds.height;
      if (initialShapeRenderFrame) {
        startRenderedWidth = initialShapeRenderFrame.frameMetrics.frameWidthPx;
        startRenderedHeight = initialShapeRenderFrame.frameMetrics.frameHeightPx;
      } else {
        startRenderedWidth = layerNode.offsetWidth;
        startRenderedHeight = layerNode.offsetHeight;
      }
      startBoundsLeft = centerX - (startRenderedWidth / 2);
      startBoundsTop = centerY - (startRenderedHeight / 2);
      startBoundsRight = centerX + (startRenderedWidth / 2);
      startBoundsBottom = centerY + (startRenderedHeight / 2);
    }

    const startTextBoxWidthPercent = ((startRenderedWidth / printAreaBounds.width) * 100) || (layer.textBoxWidth ?? 88);
    const dragState = {
      startPointer,
      startWidthCm,
      startHeightCm,
      startRenderedWidth,
      startRenderedHeight,
      startTextBoxWidthPercent,
      startBoundsLeft,
      startBoundsTop,
      startBoundsRight,
      startBoundsBottom,
      startBaseWidthPx: initialShapeRenderFrame?.baseWidthPx ?? null,
      startBaseHeightPx: initialShapeRenderFrame?.baseHeightPx ?? null,
      lineLeftInsetPx: initialShapeRenderFrame?.lineLeftInsetPx ?? 0,
      lineRightInsetPx: initialShapeRenderFrame?.lineRightInsetPx ?? 0,
      isLineShape: initialShapeRenderFrame?.isLineShape ?? false,
      logicalPrintAreaWidthPx: initialShapeRenderFrame?.logicalPrintAreaWidthPx ?? null,
      logicalPrintAreaHeightPx: initialShapeRenderFrame?.logicalPrintAreaHeightPx ?? null,
      shapeFrameMetrics: initialShapeRenderFrame?.frameMetrics ?? null,
      rotationDeg: layerRotationDeg,
    };

    const snapGuides = getCombinedSnapGuidesPx
      ? getCombinedSnapGuidesPx(layer.id, printAreaBounds.width, printAreaBounds.height)
      : null;

    const updateResize = (clientX, clientY) => {
      let snappedClientX = clientX;
      let snappedClientY = clientY;
      const activeGuides = [];

      if (snapGuides) {
        const localPointerX = clientX - printAreaBounds.left;
        const localPointerY = clientY - printAreaBounds.top;

        // Determine which edge the pointer controls based on handle direction
        if (handle.x !== 0) {
          const movingEdgeX = handle.x > 0
            ? localPointerX
            : localPointerX;
          const snapX = snapEdgeToGuides(movingEdgeX, snapGuides.vertical);
          if (snapX) {
            snappedClientX = clientX + snapX.delta;
            activeGuides.push({
              orientation: "vertical",
              positionPercent: (snapX.guide / printAreaBounds.width) * 100,
            });
          }
        }

        if (handle.y !== 0) {
          const movingEdgeY = handle.y > 0
            ? localPointerY
            : localPointerY;
          const snapY = snapEdgeToGuides(movingEdgeY, snapGuides.horizontal);
          if (snapY) {
            snappedClientY = clientY + snapY.delta;
            activeGuides.push({
              orientation: "horizontal",
              positionPercent: (snapY.guide / printAreaBounds.height) * 100,
            });
          }
        }
      }

      setActiveSnapGuides?.(activeGuides);

      const rotationRad = dragState.rotationDeg && !dragState.isLineShape
        ? (dragState.rotationDeg * Math.PI) / 180
        : 0;

      let effectiveClientX = snappedClientX;
      let effectiveClientY = snappedClientY;

      if (rotationRad) {
        const centerXPx = (dragState.startBoundsLeft + dragState.startBoundsRight) / 2;
        const centerYPx = (dragState.startBoundsTop + dragState.startBoundsBottom) / 2;
        const relX = (snappedClientX - printAreaBounds.left) - centerXPx;
        const relY = (snappedClientY - printAreaBounds.top) - centerYPx;
        const cosNeg = Math.cos(-rotationRad);
        const sinNeg = Math.sin(-rotationRad);
        effectiveClientX = (relX * cosNeg - relY * sinNeg) + centerXPx + printAreaBounds.left;
        effectiveClientY = (relX * sinNeg + relY * cosNeg) + centerYPx + printAreaBounds.top;
      }

      const patch = resizeLayer({
        layer,
        handle,
        pointer: { x: effectiveClientX, y: effectiveClientY },
        printAreaBounds,
        dragState,
        physicalWidthCm,
        physicalHeightCm,
      });

      if (!patch) return;

      if (rotationRad && patch.position) {
        const cosR = Math.cos(rotationRad);
        const sinR = Math.sin(rotationRad);
        const oldCenterXPx = (dragState.startBoundsLeft + dragState.startBoundsRight) / 2;
        const oldCenterYPx = (dragState.startBoundsTop + dragState.startBoundsBottom) / 2;
        const halfStartW = dragState.startRenderedWidth / 2;
        const halfStartH = dragState.startRenderedHeight / 2;
        const ax = handle.x !== 0 ? -handle.x : 0;
        const ay = handle.y !== 0 ? -handle.y : 0;
        const anchorLocalX = ax * halfStartW;
        const anchorLocalY = ay * halfStartH;
        const anchorScreenX = oldCenterXPx + cosR * anchorLocalX - sinR * anchorLocalY;
        const anchorScreenY = oldCenterYPx + sinR * anchorLocalX + cosR * anchorLocalY;
        const newCenterXPx = (patch.position.x / 100) * printAreaBounds.width;
        const newCenterYPx = (patch.position.y / 100) * printAreaBounds.height;
        const newAnchorLocalX = anchorLocalX - (newCenterXPx - oldCenterXPx);
        const newAnchorLocalY = anchorLocalY - (newCenterYPx - oldCenterYPx);
        const correctedX = anchorScreenX - (cosR * newAnchorLocalX - sinR * newAnchorLocalY);
        const correctedY = anchorScreenY - (sinR * newAnchorLocalX + cosR * newAnchorLocalY);
        patch.position = {
          x: (correctedX / printAreaBounds.width) * 100,
          y: (correctedY / printAreaBounds.height) * 100,
        };
      }

      onLayerResize(layer.id, patch);
    };

    setResizingLayerId(layer.id);
    node.setPointerCapture?.(pointerId);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      updateResize(moveEvent.clientX, moveEvent.clientY);
    };

    const stopResizing = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      setResizingLayerId(null);
      setActiveSnapGuides?.([]);
      node.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  };

  const renderResizeHandles = (layer, options = {}) => {
    if (layer.locked || layer.id !== activeLayerId) return null;

    const handles = options.handleKeys
      ? RESIZE_HANDLES.filter((handle) => options.handleKeys.has(handle.key))
      : layer.type === "text"
      ? RESIZE_HANDLES.filter((handle) => TEXT_RESIZE_HANDLE_KEYS.has(handle.key))
      : RESIZE_HANDLES;

    const buttons = handles.map((handle) => {
      const isMiddleHandle = MIDDLE_RESIZE_HANDLE_KEYS.has(handle.key);
      const isVerticalMiddleHandle = handle.key === "e" || handle.key === "w";
      const anchoredHandleStyle = getResizeHandleAnchorStyle(handle.key, options.handleAnchorPoints?.[handle.key]);

      return (
        <button
          key={handle.key}
          type="button"
          data-constructor-interactive="true"
          aria-label={`Изменить размер слоя: ${handle.key}`}
          onPointerDown={(event) => handleLayerResizePointerDown(layer, handle, event)}
          style={{
            position: "absolute",
            width: isMiddleHandle ? (isVerticalMiddleHandle ? RESIZE_MIDDLE_HANDLE_SHORT_SIDE : RESIZE_MIDDLE_HANDLE_LONG_SIDE) : RESIZE_HANDLE_SIZE,
            height: isMiddleHandle ? (isVerticalMiddleHandle ? RESIZE_MIDDLE_HANDLE_LONG_SIDE : RESIZE_MIDDLE_HANDLE_SHORT_SIDE) : RESIZE_HANDLE_SIZE,
            padding: 0,
            borderRadius: isMiddleHandle ? 999 : 4,
            border: "1px solid rgba(255,255,255,.32)",
            background: resizingLayerId === layer.id ? "linear-gradient(180deg, rgba(232,67,147,.96), rgba(108,92,231,.96))" : "rgba(15,15,18,.9)",
            boxShadow: resizingLayerId === layer.id ? "0 10px 24px rgba(232,67,147,.24)" : "0 8px 18px rgba(0,0,0,.22)",
            cursor: handle.cursor,
            pointerEvents: "auto",
            touchAction: "none",
            zIndex: 3,
            ...(anchoredHandleStyle || handle.style),
            ...(options.handleStyleOverrides?.[handle.key] || null),
          }}
        />
      );
    });

    return buttons;
  };

  const handleRotationPointerDown = (layer, event) => {
    if (layer.locked || layer.id !== activeLayerId || !printAreaRef.current || !onLayerResize) return;

    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const layerNode = node.parentElement;
    if (!layerNode) return;

    const layerBounds = layerNode.getBoundingClientRect();
    const centerX = layerBounds.left + layerBounds.width / 2;
    const centerY = layerBounds.top + layerBounds.height / 2;
    const startRotationDeg = normalizeRotationDeg(Number(layer.rotationDeg) || 0);
    const startAngleRad = Math.atan2(event.clientY - centerY, event.clientX - centerX);

    setRotatingLayerId(layer.id);
    node.setPointerCapture?.(pointerId);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      const currentAngleRad = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const deltaRad = currentAngleRad - startAngleRad;
      const deltaDeg = deltaRad * (180 / Math.PI);
      let nextDeg = normalizeRotationDeg(startRotationDeg + deltaDeg);
      const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
      for (const snap of snapAngles) {
        if (Math.abs(nextDeg - snap) < 3) { nextDeg = snap; break; }
      }
      onLayerResize(layer.id, { rotationDeg: nextDeg });
    };

    const stopRotating = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      setRotatingLayerId(null);
      node.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopRotating);
      window.removeEventListener("pointercancel", stopRotating);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopRotating);
    window.addEventListener("pointercancel", stopRotating);
  };

  const renderRotationHandle = (layer) => {
    if (layer.locked || layer.id !== activeLayerId) return null;
    return (
      <button
        key="rotation-handle"
        type="button"
        data-constructor-interactive="true"
        aria-label="Повернуть слой"
        onPointerDown={(event) => handleRotationPointerDown(layer, event)}
        style={{
          position: "absolute",
          left: "50%",
          top: "100%",
          transform: "translateX(-50%)",
          marginTop: 10,
          width: 20,
          height: 20,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.32)",
          background: rotatingLayerId === layer.id ? "linear-gradient(180deg, rgba(232,67,147,.96), rgba(108,92,231,.96))" : "rgba(15,15,18,.9)",
          boxShadow: rotatingLayerId === layer.id ? "0 10px 24px rgba(232,67,147,.24)" : "0 8px 18px rgba(0,0,0,.22)",
          cursor: "grab",
          pointerEvents: "auto",
          touchAction: "none",
          zIndex: 3,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.82)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </button>
    );
  };

  const handlePreviewBackgroundPointerDown = (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-constructor-interactive="true"]')) return;

    if ((event.pointerType && event.pointerType !== "mouse") || (typeof event.button === "number" && event.button !== 0)) {
      onPreviewBackgroundPointerDown?.();
      return;
    }

    const previewBounds = event.currentTarget.getBoundingClientRect();

    event.preventDefault();

    const pointerId = event.pointerId;
    const previewNode = event.currentTarget;
    const startPoint = { x: event.clientX, y: event.clientY };
    const appendSelection = event.shiftKey;
    let hasDragged = false;
    let nextSelectedLayerIds = [];

    previewNode.setPointerCapture?.(pointerId);

    const updateMarqueeSelection = (clientX, clientY) => {
      const selectionRect = buildClampedSelectionRect(startPoint, { x: clientX, y: clientY }, previewBounds);
      setMarqueeSelection({
        left: selectionRect.left - previewBounds.left,
        top: selectionRect.top - previewBounds.top,
        width: selectionRect.width,
        height: selectionRect.height,
      });

      nextSelectedLayerIds = layers
        .filter((layer) => layer.visible)
        .filter((layer) => {
          const layerNode = layerNodeRefs.current[layer.id] || textLayerRefs.current[layer.id];
          const layerBounds = layerNode?.getBoundingClientRect();

          if (!layerBounds?.width && !layerBounds?.height) return false;
          return rectsIntersect(selectionRect, layerBounds);
        })
        .map((layer) => layer.id);
    };

    const stopMarqueeSelection = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;

      setMarqueeSelection(null);
      previewNode.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopMarqueeSelection);
      window.removeEventListener("pointercancel", stopMarqueeSelection);

      if (!hasDragged) {
        onPreviewBackgroundPointerDown?.();
        return;
      }

      onMarqueeSelectLayerIds?.(nextSelectedLayerIds, {
        append: appendSelection,
        preserveExisting: appendSelection && !nextSelectedLayerIds.length,
      });
    };

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;

      const deltaX = moveEvent.clientX - startPoint.x;
      const deltaY = moveEvent.clientY - startPoint.y;
      if (!hasDragged && Math.hypot(deltaX, deltaY) < MIN_MARQUEE_DRAG_DISTANCE) return;

      moveEvent.preventDefault();
      hasDragged = true;
      updateMarqueeSelection(moveEvent.clientX, moveEvent.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopMarqueeSelection);
    window.addEventListener("pointercancel", stopMarqueeSelection);
  };

  const getLayerFrameStyle = ({ active = false, selected = false, hovered = false }) => {
    if (active) return "inset 0 0 0 1px rgba(232,67,147,.82)";
    if (selected) return "inset 0 0 0 1px rgba(255,255,255,.7)";
    if (hovered) return "inset 0 0 0 1px rgba(232,67,147,.5)";
    return "none";
  };

  const handleEditableKeyDown = (event) => {
    if (!event.currentTarget?.isContentEditable) return;

    if (isSelectAllShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      selectAllEditableText(event.currentTarget);
    }
  };

  return (
    <div className="constructor-preview" style={{ minWidth: 0, position: "relative", overflowAnchor: "none" }}>
      <div className="constructor-preview-stage" style={{ position: "relative", minHeight: 640, overflowAnchor: "none" }} onPointerDown={handlePreviewBackgroundPointerDown}>
        <img src={previewSrc} alt={`${productName} — ${color}`} draggable={false} style={{ width: "100%", display: "block", userSelect: "none", WebkitUserDrag: "none", pointerEvents: "none" }} />
        <div ref={printAreaRef} data-print-area="true" style={{ position: "absolute", left: `${printArea.left}%`, top: `${printArea.top}%`, width: `${printArea.width}%`, height: printArea.height ? `${printArea.height}%` : undefined, aspectRatio: printArea.height ? undefined : `${physicalWidthCm} / ${physicalHeightCm}`, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {activeSnapGuides.map((guide, index) => {
            const isVertical = guide.orientation === "vertical";

            return (
              <div
                key={`${guide.orientation}-${guide.positionPercent}-${index}`}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: isVertical ? `${guide.positionPercent}%` : 0,
                  top: isVertical ? 0 : `${guide.positionPercent}%`,
                  width: isVertical ? 1 : "100%",
                  height: isVertical ? "100%" : 1,
                  transform: isVertical ? "translateX(-0.5px)" : "translateY(-0.5px)",
                  background: "linear-gradient(180deg, rgba(232,67,147,.08) 0%, rgba(232,67,147,.9) 18%, rgba(108,92,231,.94) 50%, rgba(232,67,147,.9) 82%, rgba(232,67,147,.08) 100%)",
                  boxShadow: isVertical
                    ? "0 0 0 1px rgba(255,255,255,.08), 0 0 16px rgba(232,67,147,.32)"
                    : "0 0 0 1px rgba(255,255,255,.08), 0 0 16px rgba(108,92,231,.28)",
                  zIndex: 6,
                  pointerEvents: "none",
                }}
              />
            );
          })}
          {layers.map((layer, index) => {
            if (!layer.visible) return null;

            // Preview text CSS масштаб: layer.size и прочие "in-px" поля заданы в
            // логических print-пикселях baseline-размера (XS: 41 cm ≈ 10 px/cm).
            // В превью printArea имеет одинаковый визуальный размер (одинаковые
            // % ширины/высоты) для всех размеров футболки — меняется только
            // physicalWidthCm (метрика). Чтобы текст при переключении размера
            // не "плавал" и соответствовал позиции фигур (которые % от printArea),
            // scale считается от BASELINE-cm, а не от текущего physicalWidthCm.
            const pxPerCmPreview = printAreaPixelSize.width > 0
              ? printAreaPixelSize.width / Math.max(1, baselinePhysicalWidthCm)
              : LOGICAL_PRINT_PX_PER_CM;
            const previewTextScale = pxPerCmPreview / LOGICAL_PRINT_PX_PER_CM;

            const active = layer.id === activeLayerId;
            const selected = selectedLayerIds.includes(layer.id);
            const hovered = layer.id === hoveredLayerId;
            const dragging = layer.id === draggingLayerId;
            const frameStyle = getLayerFrameStyle({ active, selected, hovered });

            if (layer.type === "upload") {
              const uploadFrame = getLayerRenderFrame(layer);
              const layerSize = getLayerRenderSize(layer);

              return (
                <div
                  key={layer.id}
                  data-constructor-interactive="true"
                  ref={(node) => {
                    layerNodeRefs.current[layer.id] = node;
                  }}
                  role="presentation"
                  onPointerEnter={() => setHoveredLayerId(layer.id)}
                  onPointerLeave={() => setHoveredLayerId((currentLayerId) => (currentLayerId === layer.id ? null : currentLayerId))}
                  onPointerDown={(event) => onLayerPointerDown(layer.id, event)}
                  onDoubleClick={() => onLayerEditOpen(layer.id)}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: `translate(-50%, -50%)${layer.rotationDeg ? ` rotate(${layer.rotationDeg}deg)` : ""}`, width: layerSize.width, height: layerSize.height, maxWidth: "100%", maxHeight: "100%", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: frameStyle, borderRadius: 0, zIndex: index + 1, overflow: "visible" }}
                >
                  <img src={layer.src} alt={layer.uploadName} draggable={false} style={{ position: "absolute", left: `${uploadFrame.innerOffsetXPercent}%`, top: `${uploadFrame.innerOffsetYPercent}%`, width: `${uploadFrame.innerWidthPercent}%`, height: `${uploadFrame.innerHeightPercent}%`, maxWidth: "none", maxHeight: "none", objectFit: "fill", display: "block", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.24))", userSelect: "none", WebkitUserDrag: "none", pointerEvents: "none" }} />
                  {renderResizeHandles(layer)}
                  {renderRotationHandle(layer)}
                </div>
              );
            }

            if (layer.type === "shape") {
              const shape = getShapeByKey(layer.shapeKey);
              if (!shape) return null;
              const isLineShape = shape.category === "lines";
              const shapeRenderFrame = getShapeRenderFrame(layer);
              const shapeGradient = layer.fillMode === "gradient" ? getTextGradientByKey(layer.gradientKey) : null;
              const rotationDeg = Number(layer.rotationDeg) || 0;
              const lineAspectRatio = isLineShape
                ? Math.max(0.2, shapeRenderFrame.baseWidthPx / Math.max(1, shapeRenderFrame.baseHeightPx))
                : null;
              const shapePreserveAspectRatio = shape.category === "lines" ? "xMidYMid meet" : "none";
              const lineHandleStyleOverrides = isLineShape
                ? {
                  w: {
                    left: `calc(${shapeRenderFrame.leftPercent}% - ${RESIZE_MIDDLE_HANDLE_SHORT_OFFSET}px)`,
                    top: `${shapeRenderFrame.centerYPercent}%`,
                    transform: "translateY(-50%)",
                  },
                  e: {
                    right: `calc(${shapeRenderFrame.rightPercent}% - ${RESIZE_MIDDLE_HANDLE_SHORT_OFFSET}px)`,
                    top: `${shapeRenderFrame.centerYPercent}%`,
                    transform: "translateY(-50%)",
                  },
                }
                : null;
              const baseShapeSvgMarkup = buildConstructorShapeSvg({
                shape,
                fillMode: layer.fillMode,
                color: layer.color,
                gradient: shapeGradient,
                strokeStyle: layer.strokeStyle,
                strokeColor: layer.strokeColor,
                strokeWidth: layer.strokeWidth,
                cornerRoundness: layer.cornerRoundness,
                preserveAspectRatio: shapePreserveAspectRatio,
                lineAspectRatio,
              });
              const showLineHoverHighlight = isLineShape && hovered && !active && !dragging && resizingLayerId !== layer.id;
              const lineHoverShapeSvgMarkup = showLineHoverHighlight
                ? buildConstructorShapeSvg({
                  shape,
                  fillMode: "solid",
                  color: "#ff5ca8",
                  gradient: null,
                  strokeStyle: layer.strokeStyle,
                  strokeColor: "#ff5ca8",
                  strokeWidth: layer.strokeWidth,
                  cornerRoundness: layer.cornerRoundness,
                  preserveAspectRatio: shapePreserveAspectRatio,
                  lineAspectRatio,
                })
                : null;
              const shapeSvgMarkup = lineHoverShapeSvgMarkup || baseShapeSvgMarkup;
              const effectOffset = getDirectionalOffset(layer.effectAngle ?? -45, layer.effectDistance ?? 0);
              const baseShadowSvgMarkup = buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.effectColor || "#824ef0",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
                cornerRoundness: layer.cornerRoundness,
                preserveAspectRatio: shapePreserveAspectRatio,
                lineAspectRatio,
              });
              const shadowSvgMarkup = baseShadowSvgMarkup;
              const baseDistortSvgMarkupA = buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.distortionColorA || "#ed5bb7",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
                cornerRoundness: layer.cornerRoundness,
                preserveAspectRatio: shapePreserveAspectRatio,
                lineAspectRatio,
              });
              const distortSvgMarkupA = baseDistortSvgMarkupA;
              const baseDistortSvgMarkupB = buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.distortionColorB || "#1cb8d8",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
                cornerRoundness: layer.cornerRoundness,
                preserveAspectRatio: shapePreserveAspectRatio,
                lineAspectRatio,
              });
              const distortSvgMarkupB = baseDistortSvgMarkupB;
              const svgLayerBaseStyle = {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
                userSelect: "none",
                WebkitUserDrag: "none",
              };

              return (
                <div
                  key={layer.id}
                  data-constructor-interactive="true"
                  ref={(node) => {
                    layerNodeRefs.current[layer.id] = node;
                  }}
                  role="presentation"
                  onPointerEnter={() => setHoveredLayerId(layer.id)}
                  onPointerLeave={() => setHoveredLayerId((currentLayerId) => (currentLayerId === layer.id ? null : currentLayerId))}
                  onPointerDown={(event) => onLayerPointerDown(layer.id, event)}
                  onDoubleClick={() => onLayerEditOpen(layer.id)}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`, width: shapeRenderFrame.outerWidth, height: shapeRenderFrame.outerHeight, maxWidth: "none", maxHeight: "none", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: isLineShape ? ((selected && !active) ? frameStyle : "none") : frameStyle, borderRadius: 0, zIndex: index + 1, overflow: "visible" }}
                >
                  <div style={{ position: "absolute", ...shapeRenderFrame.innerStyle, pointerEvents: "none" }}>
                    {layer.effectType === "drop-shadow" ? (
                      <div
                        aria-hidden="true"
                        style={{ ...svgLayerBaseStyle, transform: `translate(${effectOffset.x}px, ${effectOffset.y}px)`, opacity: 1 }}
                        dangerouslySetInnerHTML={{ __html: shadowSvgMarkup }}
                      />
                    ) : null}
                    {layer.effectType === "distort" ? (
                      <>
                        <div
                          aria-hidden="true"
                          style={{ ...svgLayerBaseStyle, transform: `translate(${effectOffset.x}px, ${effectOffset.y}px)`, opacity: 1 }}
                          dangerouslySetInnerHTML={{ __html: distortSvgMarkupA }}
                        />
                        <div
                          aria-hidden="true"
                          style={{ ...svgLayerBaseStyle, transform: `translate(${-effectOffset.x}px, ${-effectOffset.y}px)`, opacity: 1 }}
                          dangerouslySetInnerHTML={{ __html: distortSvgMarkupB }}
                        />
                      </>
                    ) : null}
                    <div
                      aria-label={shape.label}
                      style={{ ...svgLayerBaseStyle, position: "relative", inset: "auto" }}
                      dangerouslySetInnerHTML={{ __html: shapeSvgMarkup }}
                    />
                  </div>
                  {renderResizeHandles(layer, isLineShape ? { handleKeys: LINE_SHAPE_HANDLE_KEYS, handleStyleOverrides: lineHandleStyleOverrides } : undefined)}
                  {!isLineShape && renderRotationHandle(layer)}
                </div>
              );
            }

            const overlayText = layer.value;
            const editing = layer.id === editingTextLayerId;
            const hasVisibleText = overlayText.trim().length > 0;
            const showEmptyTextPlaceholder = !hasVisibleText;

            const showTextBoxGuides = active;
            const resizing = resizingLayerId === layer.id;
            const allowTextEditing = active && editing && !layer.locked;
            const textGuideShadow = showTextBoxGuides
              ? `${frameStyle}, inset 0 0 0 1px rgba(255,255,255,.24)`
              : frameStyle;
            const textShadowValue = layer.shadowEnabled
              ? `${(layer.shadowOffsetX ?? 0) * previewTextScale}px ${(layer.shadowOffsetY ?? 2) * previewTextScale}px ${(layer.shadowBlur ?? 14) * previewTextScale}px ${layer.shadowColor || "#111111"}`
              : "none";
            const hasStroke = (layer.strokeWidth ?? 0) > 0 && !layer.textOutlineOnly;
            const isOutlineOnly = !!layer.textOutlineOnly && (layer.outlineWidth ?? 0) > 0;
            const outlineColor = layer.color || "#ffffff";
            const layerFont = getConstructorTextFont(layer.fontKey);
            const activeGradient = layer.textFillMode === "gradient" ? getTextGradientByKey(layer.gradientKey) : null;
            const textDecorationLine = getTextDecorationLine(layer);
            const decorationColor = activeGradient ? layer.color || (color === "Белый" ? "#111111" : "#ffffff") : layer.color;
            const textTransform = layer.uppercase ? "uppercase" : "none";
            const fontWeight = layerFont.supportsBold ? layer.weight : (layerFont.regularWeight ?? 400);
            const fontStyle = layerFont.supportsItalic && layer.italic ? "italic" : "normal";
            const scaledFontSizePx = layer.size * previewTextScale;
            const scaledLetterSpacingPx = (layer.letterSpacing ?? 1) * previewTextScale;
            const scaledStrokeWidthPx = (layer.strokeWidth ?? 0) * previewTextScale;
            const scaledOutlineWidthPx = (layer.outlineWidth ?? 0) * previewTextScale;
            const textMinHeight = !hasVisibleText
              ? `${Math.max(scaledFontSizePx * (layer.lineHeight ?? 1.05), scaledFontSizePx)}px`
              : undefined;
            const halfLetterSpacing = scaledLetterSpacingPx / 2;
            // Превью выравнено с PDF: text-layer центр сидит ровно в position.x/y
            // (translate(-50%,-50%) от верхнего-левого угла), без дополнительных
            // ink-сдвигов. Clamp в useConstructorState учитывает асимметрию ink
            // через clampOffsetX/Y (опираясь на opentype.js glyph bbox).

            return (
              <div
                key={layer.id}
                data-constructor-interactive="true"
                data-text-layer-id={layer.id}
                ref={(node) => {
                  layerNodeRefs.current[layer.id] = node;
                  textLayerRefs.current[layer.id] = node;
                }}
                role="presentation"
                onPointerEnter={() => setHoveredLayerId(layer.id)}
                onPointerLeave={() => setHoveredLayerId((currentLayerId) => (currentLayerId === layer.id ? null : currentLayerId))}
                onPointerDown={allowTextEditing ? undefined : (event) => onLayerPointerDown(layer.id, event)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onLayerEditOpen(layer.id);
                }}
                style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: `translate(-50%, -50%)${layer.rotationDeg ? ` rotate(${layer.rotationDeg}deg)` : ""}`, transformOrigin: "center center", width: `${layer.textBoxWidth ?? 88}%`, maxWidth: "100%", minHeight: textMinHeight, padding: `0 0 0 ${halfLetterSpacing}px`, textAlign: layer.textAlign || "center", fontSize: `${scaledFontSizePx}px`, lineHeight: layer.lineHeight ?? 1.05, fontWeight, fontStyle, fontFamily: layer.fontFamily || "'Outfit', sans-serif", color: activeGradient ? "transparent" : layer.color, letterSpacing: `${scaledLetterSpacingPx}px`, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", textShadow: textShadowValue, pointerEvents: "auto", cursor: allowTextEditing ? "text" : resizing ? "nwse-resize" : layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: allowTextEditing ? "auto" : "none", boxShadow: showTextBoxGuides ? textGuideShadow : frameStyle, borderRadius: 0, outline: "none", outlineOffset: 0, background: "transparent", zIndex: index + 1 }}
              >
                {allowTextEditing ? (
                  <div
                    ref={(node) => {
                      editableTextLayerRefs.current[layer.id] = node;
                      textContentLayerRefs.current[layer.id] = node;
                    }}
                    dir="auto"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDownCapture={handleEditableKeyDown}
                    onKeyDown={handleEditableKeyDown}
                    onFocus={() => onEditingTextLayerChange(layer.id)}
                    onBlur={() => onEditingTextLayerChange(null)}
                    onInput={(event) => {
                      const nextValue = event.currentTarget.innerText.replace(/\r/g, "").replace(/\n$/, "");
                      onActiveTextValueChange(nextValue);
                    }}
                    style={{ position: "relative", minHeight: textMinHeight, outline: "none", cursor: "text", userSelect: "text", WebkitUserSelect: "text", color: isOutlineOnly ? "transparent" : (activeGradient ? "transparent" : layer.color), backgroundImage: (activeGradient && !isOutlineOnly) ? activeGradient.css : "none", WebkitBackgroundClip: (activeGradient && !isOutlineOnly) ? "text" : "border-box", backgroundClip: (activeGradient && !isOutlineOnly) ? "text" : "border-box", WebkitTextFillColor: isOutlineOnly ? "transparent" : (activeGradient ? "transparent" : layer.color), WebkitTextStroke: isOutlineOnly ? `${scaledOutlineWidthPx}px ${outlineColor}` : (hasStroke ? `${scaledStrokeWidthPx}px ${layer.strokeColor || "#111111"}` : undefined), paintOrder: (isOutlineOnly || hasStroke) ? "stroke fill" : undefined, caretColor: layer.color || "#f0eef5", fontStyle, textTransform: "none", textDecorationLine, textDecorationColor: decorationColor, textDecorationThickness: textDecorationLine === "none" ? undefined : "0.08em", textUnderlineOffset: layer.underline ? "0.14em" : undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", padding: 0, margin: 0 }}
                  />
                ) : (
                  <div
                    ref={(node) => {
                      textContentLayerRefs.current[layer.id] = node;
                    }}
                    style={{ position: "relative", minHeight: textMinHeight, outline: "none", cursor: "inherit", color: isOutlineOnly ? "transparent" : (activeGradient ? "transparent" : layer.color), backgroundImage: (activeGradient && !isOutlineOnly) ? activeGradient.css : "none", WebkitBackgroundClip: (activeGradient && !isOutlineOnly) ? "text" : "border-box", backgroundClip: (activeGradient && !isOutlineOnly) ? "text" : "border-box", WebkitTextFillColor: isOutlineOnly ? "transparent" : (activeGradient ? "transparent" : layer.color), WebkitTextStroke: isOutlineOnly ? `${scaledOutlineWidthPx}px ${outlineColor}` : (hasStroke ? `${scaledStrokeWidthPx}px ${layer.strokeColor || "#111111"}` : undefined), paintOrder: (isOutlineOnly || hasStroke) ? "stroke fill" : undefined, caretColor: layer.color || "#f0eef5", fontStyle, textTransform, textDecorationLine, textDecorationColor: decorationColor, textDecorationThickness: textDecorationLine === "none" ? undefined : "0.08em", textUnderlineOffset: layer.underline ? "0.14em" : undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", padding: 0, margin: 0 }}
                  >
                    {overlayText}
                  </div>
                )}
                {showEmptyTextPlaceholder ? (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: layer.textAlign === "left" ? "flex-start" : layer.textAlign === "right" ? "flex-end" : "center", color: /^(белый|меланж|розовый|бежевый|молочный)$/i.test(color) ? "rgba(0,0,0,.35)" : "rgba(240,238,245,.32)", textShadow: "none", pointerEvents: "none", fontSize: "0.58em", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform }}>
                    Введите текст
                  </span>
                ) : null}
                {showTextBoxGuides ? renderResizeHandles(layer) : null}
                {renderRotationHandle(layer)}
              </div>
            );
          })}
        </div>
        {marqueeSelection ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: marqueeSelection.left,
              top: marqueeSelection.top,
              width: marqueeSelection.width,
              height: marqueeSelection.height,
              border: "1px solid rgba(255,255,255,.8)",
              background: "rgba(232,67,147,.16)",
              boxShadow: "inset 0 0 0 1px rgba(232,67,147,.38)",
              pointerEvents: "none",
              zIndex: 8,
            }}
          />
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <div style={{ display: "inline-flex", gap: 8, padding: 6, borderRadius: 999, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          {[["front", "Спереди"], ["back", "Спина"]].map(([key, label]) => <button key={label} type="button" onClick={() => onSideChange(key)} onPointerUp={(event) => event.currentTarget.blur()} className={`tb ${side === key ? "ta" : "ti"}`} style={{ padding: "10px 20px", minWidth: 128, outline: "none" }}>{label}</button>)}
        </div>
      </div>
    </div>
  );
}

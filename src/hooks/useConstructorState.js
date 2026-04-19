import { useEffect, useRef, useState } from "react";
import { getConstructorLineMinAspectRatio, getConstructorLineVisualMetrics, getConstructorPrintFormat, getConstructorShape, getConstructorShapeTightBounds, getConstructorTextFont, getConstructorTextGradient, readImageContentBounds, resolveConstructorPrintArea, supportsConstructorShapeCornerRoundness } from "../components/constructor/constructorConfig.js";
import { getShapeFrameMetricsPx } from "../utils/constructor/shapeFrame.js";
import { saveConstructorMeta, loadConstructorMeta, clearConstructorMeta, saveImage, loadImage, clearImages } from "../utils/persistStorage.js";

const FALLBACK_PRODUCT = {
  key: "",
  name: "",
  displayName: "",
  model: "classic",
  material: "",
  densityLabel: "",
  price: 0,
  colors: ["Чёрный"],
  sizes: [],
  printAreas: {
    front: { left: 50, top: 50, width: 30, height: 30 },
    back: { left: 50, top: 50, width: 30, height: 30 },
  },
};

const LAYER_TYPE_LABELS = {
  upload: "Макет",
  text: "Текст",
  shape: "Фигура",
};

const DEFAULT_TEXT_FONT = getConstructorTextFont("outfit");
const DEFAULT_TEXT_GRADIENT = getConstructorTextGradient("future-pulse");
const LOGICAL_PRINT_PX_PER_CM = 10;
const DEFAULT_SHAPE_STROKE_WIDTH = 13;
const MAX_SHAPE_STROKE_WIDTH = 100;
const DEFAULT_LINE_STROKE_WIDTH = 30;
const MAX_LINE_STROKE_WIDTH = 100;
const MIN_LINE_LENGTH_PX = 12;
const MIN_LINE_HEIGHT_PX = 16;
const LINE_HEIGHT_PER_STROKE_UNIT_PX = 1.2;

const TEXT_ALIGN_LABELS = {
  left: "слева",
  center: "по центру",
  right: "справа",
};

const DEFAULT_TEXT_LINE_HEIGHT = 1.05;
const DEFAULT_TEXT_WEIGHT = 700;
const DEFAULT_TEXT_BOX_WIDTH = 60;
const DEFAULT_TEXT_STROKE_COLOR = "#ed5bb7";
const DEFAULT_TEXT_SHADOW_COLOR = "#824ef0";
const MIN_TEXT_FONT_SIZE = 12;
const MAX_TEXT_FONT_SIZE = 400;
const MIN_TEXT_BOX_WIDTH_PERCENT = 1;
const SNAP_THRESHOLD_PX = 2;
const UPLOAD_RATIO_TOLERANCE = 0.02;
const PRINT_SIZE_LABEL_FORMATTER = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const textMeasureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const textMeasureContext = textMeasureCanvas?.getContext("2d") || null;

function normalizeRotationDeg(value) {
  const normalized = Number(value) || 0;
  return ((normalized % 360) + 360) % 360;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPrintDimensionCm(value) {
  return PRINT_SIZE_LABEL_FORMATTER.format(Number(value) || 0);
}

function buildPrintSizeLabel(widthCm, heightCm) {
  return `${formatPrintDimensionCm(widthCm)} × ${formatPrintDimensionCm(heightCm)} см`;
}

function getPreferredProductSize(product, requestedSize = "") {
  const normalizedRequestedSize = String(requestedSize || "").trim().toUpperCase();
  const availableSizes = Array.isArray(product?.sizes) ? product.sizes : [];

  if (normalizedRequestedSize && availableSizes.includes(normalizedRequestedSize)) {
    return normalizedRequestedSize;
  }

  if (availableSizes.includes("XS")) {
    return "XS";
  }

  return availableSizes[0] || "";
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

function getTextVisualPaddingPx({
  strokeWidth = 0,
  shadowOffsetX = 0,
  shadowOffsetY = 0,
  shadowBlur = 0,
  underline = false,
  fontSize = 0,
}) {
  const strokePaddingPx = Math.max(0, Number(strokeWidth) || 0);
  const blurPaddingPx = Math.max(0, Number(shadowBlur) || 0);
  const offsetX = Number(shadowOffsetX) || 0;
  const offsetY = Number(shadowOffsetY) || 0;
  const underlinePaddingPx = underline ? Math.max(0, (Number(fontSize) || 0) * 0.22) : 0;

  const leftShadowPaddingPx = Math.max(0, blurPaddingPx - offsetX);
  const rightShadowPaddingPx = Math.max(0, blurPaddingPx + offsetX);
  const topShadowPaddingPx = Math.max(0, blurPaddingPx - offsetY);
  const bottomShadowPaddingPx = Math.max(0, blurPaddingPx + offsetY, underlinePaddingPx);

  return {
    leftPaddingPx: Math.max(strokePaddingPx, leftShadowPaddingPx),
    rightPaddingPx: Math.max(strokePaddingPx, rightShadowPaddingPx),
    topPaddingPx: Math.max(strokePaddingPx, topShadowPaddingPx),
    bottomPaddingPx: Math.max(strokePaddingPx, bottomShadowPaddingPx),
  };
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
      : Math.max(0, safeFontSize * 0.5);
    const fallbackHeight = resolvedText.length
      ? Math.max(1, safeFontSize * safeLineHeight)
      : Math.max(1, safeFontSize * safeLineHeight);

    return {
      lines: resolvedText.length ? [resolvedText] : [""],
      contentWidthPx: Number(fallbackWidth.toFixed(2)),
      contentHeightPx: Number(fallbackHeight.toFixed(2)),
      glyphHeightPx: fallbackHeight,
      lineHeightPx: safeFontSize * safeLineHeight,
    };
  }

  textMeasureContext.font = `${fontStyle} ${fontWeight} ${safeFontSize}px ${fontFamily}`;
  const lines = wrapTextToWidth(resolvedText, safeBoxWidthPx, letterSpacing);
  const lineWidths = lines.map((line) => measureCanvasTextWidth(line, letterSpacing));
  const sampleMetrics = textMeasureContext.measureText(resolvedText || "Hg");
  const glyphHeightPx = Math.max(1, (sampleMetrics.actualBoundingBoxAscent || safeFontSize * 0.72) + (sampleMetrics.actualBoundingBoxDescent || safeFontSize * 0.18));
  const lineHeightPx = safeFontSize * safeLineHeight;
  const contentWidthPx = resolvedText.length
    ? Math.min(safeBoxWidthPx, Math.max(...lineWidths, 0))
    : 0;
  const contentHeightPx = resolvedText.length
    ? Math.max(1, glyphHeightPx + Math.max(0, lines.length - 1) * lineHeightPx)
    : 0;

  return {
    lines,
    contentWidthPx: Number(contentWidthPx.toFixed(2)),
    contentHeightPx: Number(contentHeightPx.toFixed(2)),
    glyphHeightPx,
    lineHeightPx,
  };
}

function getShapeVisualMetricsPx(layer, {
  areaWidthCm,
  areaHeightCm,
  areaGeometryWidth,
  areaGeometryHeight,
}) {
  if (!layer || layer.type !== "shape") return null;

  const isLineShape = getConstructorShape(layer.shapeKey).category === "lines";

  if (isLineShape) {
    const baseWidthPx = Math.max(MIN_LINE_LENGTH_PX, Number(layer.lineWidthPx) || ((Number(layer.widthCm) || 0) * LOGICAL_PRINT_PX_PER_CM));
    const baseHeightPx = Math.max(MIN_LINE_HEIGHT_PX, Number(layer.lineHeightPx) || ((Number(layer.heightCm) || 0) * LOGICAL_PRINT_PX_PER_CM) || ((Number(layer.strokeWidth) || DEFAULT_LINE_STROKE_WIDTH) * LINE_HEIGHT_PER_STROKE_UNIT_PX));
    const frameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx,
      baseHeightPx,
    });
    const normalizedRotationDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
    const rotationRadians = (normalizedRotationDeg * Math.PI) / 180;

    return {
      widthPx: normalizedRotationDeg
        ? (Math.abs(frameMetrics.frameWidthPx * Math.cos(rotationRadians)) + Math.abs(frameMetrics.frameHeightPx * Math.sin(rotationRadians)))
        : frameMetrics.frameWidthPx,
      heightPx: normalizedRotationDeg
        ? (Math.abs(frameMetrics.frameWidthPx * Math.sin(rotationRadians)) + Math.abs(frameMetrics.frameHeightPx * Math.cos(rotationRadians)))
        : frameMetrics.frameHeightPx,
    };
  }

  const intrinsicBounds = getConstructorShapeTightBounds(layer.shapeKey);
  const intrinsicAspectRatio = Math.max(0.05, (Number(intrinsicBounds?.width) || 1) / Math.max(1, Number(intrinsicBounds?.height) || 1));
  const scaleX = (Number(areaGeometryWidth) || areaWidthCm || 1) / Math.max(0.001, Number(areaWidthCm) || 1);
  const scaleY = (Number(areaGeometryHeight) || areaHeightCm || 1) / Math.max(0.001, Number(areaHeightCm) || 1);
  const shapeCmAspectRatio = Math.max(0.05, intrinsicAspectRatio * (scaleY / Math.max(0.001, scaleX)));
  const visualBaseWidthCm = Number(layer.widthCm) || 0;
  const storedHeightCm = Number(layer.heightCm) || visualBaseWidthCm || 0;
  const expectedIntrinsicHeightCm = Number((visualBaseWidthCm / shapeCmAspectRatio).toFixed(3));
  const isIntrinsicShapeState = Math.abs(storedHeightCm - expectedIntrinsicHeightCm) <= 0.02;
  const visualBaseHeightCm = isIntrinsicShapeState
    ? Number((visualBaseWidthCm / intrinsicAspectRatio).toFixed(3))
    : storedHeightCm;
  const baseWidthPx = visualBaseWidthCm * LOGICAL_PRINT_PX_PER_CM;
  const baseHeightPx = visualBaseHeightCm * LOGICAL_PRINT_PX_PER_CM;

  if (baseWidthPx <= 0 || baseHeightPx <= 0) return null;

  const frameMetrics = getShapeFrameMetricsPx(layer, {
    baseWidthPx,
    baseHeightPx,
  });
  const normalizedRotationDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
  const rotationRadians = (normalizedRotationDeg * Math.PI) / 180;

  return {
    widthPx: normalizedRotationDeg
      ? (Math.abs(frameMetrics.frameWidthPx * Math.cos(rotationRadians)) + Math.abs(frameMetrics.frameHeightPx * Math.sin(rotationRadians)))
      : frameMetrics.frameWidthPx,
    heightPx: normalizedRotationDeg
      ? (Math.abs(frameMetrics.frameWidthPx * Math.sin(rotationRadians)) + Math.abs(frameMetrics.frameHeightPx * Math.cos(rotationRadians)))
      : frameMetrics.frameHeightPx,
  };
}

function getOrderLayerMetricsPx(layer, { areaWidthPx, areaHeightPx, areaWidthCm, areaHeightCm, areaGeometryWidth, areaGeometryHeight }) {
  if (layer.type === "upload") {
    const widthCm = Number(layer.widthCm) || 0;
    const heightCm = Number(layer.heightCm) || 0;
    if (widthCm <= 0 || heightCm <= 0) return null;

    return {
      areaWidth: areaWidthPx,
      areaHeight: areaHeightPx,
      width: Math.min(areaWidthPx, areaWidthPx * (widthCm / Math.max(0.001, areaWidthCm))),
      height: Math.min(areaHeightPx, areaHeightPx * (heightCm / Math.max(0.001, areaHeightCm))),
    };
  }

  if (layer.type === "shape") {
    const visualMetrics = getShapeVisualMetricsPx(layer, {
      areaWidthCm,
      areaHeightCm,
      areaGeometryWidth,
      areaGeometryHeight,
    });

    if (!visualMetrics) return null;

    return {
      areaWidth: areaWidthPx,
      areaHeight: areaHeightPx,
      width: visualMetrics.widthPx,
      height: visualMetrics.heightPx,
    };
  }

  if (layer.type === "text") {
    const resolvedText = String(layer.value || "");
    const widthPercent = Math.min(100, Math.max(1, layer.textBoxWidth ?? DEFAULT_TEXT_BOX_WIDTH));
    const boxWidth = Math.min(areaWidthPx, areaWidthPx * (widthPercent / 100));
    const resolvedFont = getConstructorTextFont(layer.fontKey || DEFAULT_TEXT_FONT.key);
    const fontFamily = layer.fontFamily || resolvedFont.family || DEFAULT_TEXT_FONT.family;
    const fontWeight = resolvedFont.supportsBold
      ? (layer.weight ?? resolvedFont.regularWeight ?? DEFAULT_TEXT_WEIGHT)
      : (resolvedFont.regularWeight ?? 400);
    const fontStyle = resolvedFont.supportsItalic && layer.italic ? "italic" : "normal";
    const contentMetrics = getTextContentMetricsPx({
      text: layer.uppercase ? resolvedText.toUpperCase() : resolvedText,
      fontFamily,
      fontSize: layer.size ?? 36,
      fontWeight,
      fontStyle,
      lineHeight: layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
      letterSpacing: layer.letterSpacing ?? 1,
      boxWidthPx: boxWidth,
    });
    const contentWidth = resolvedText.trim().length
      ? Math.min(areaWidthPx, Math.max(1, contentMetrics.contentWidthPx))
      : Math.max(1, boxWidth);
    const contentHeight = resolvedText.trim().length
      ? Math.min(areaHeightPx, Math.max(1, contentMetrics.contentHeightPx))
      : Math.max(1, (layer.size ?? 36) * (layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT));

    return {
      areaWidth: areaWidthPx,
      areaHeight: areaHeightPx,
      width: contentWidth,
      height: contentHeight,
      boxWidth,
      contentWidth,
      contentHeight,
    };
  }

  return null;
}

function getOrderLayerBoundsPx(layer, areaMetrics) {
  const metrics = getOrderLayerMetricsPx(layer, areaMetrics);
  if (!metrics?.width || !metrics?.height) return null;

  const centerXPx = ((Number(layer.position?.x) || 50) / 100) * metrics.areaWidth;
  const centerYPx = ((Number(layer.position?.y) || 50) / 100) * metrics.areaHeight;
  const top = centerYPx - (metrics.height / 2);
  const bottom = centerYPx + (metrics.height / 2);

  if (layer.type !== "text") {
    return {
      left: centerXPx - (metrics.width / 2),
      right: centerXPx + (metrics.width / 2),
      top,
      bottom,
    };
  }

  const hasVisibleText = String(layer.value || "").trim().length > 0;
  const boxWidth = Math.max(1, Number(metrics.boxWidth) || Number(metrics.width) || 1);
  const contentWidth = hasVisibleText
    ? Math.max(1, Math.min(boxWidth, Number(metrics.contentWidth) || boxWidth))
    : boxWidth;
  const boxLeft = centerXPx - (boxWidth / 2);
  const boxRight = centerXPx + (boxWidth / 2);
  const textAlign = layer.textAlign || "center";

  let left = centerXPx - (contentWidth / 2);
  let right = centerXPx + (contentWidth / 2);

  if (textAlign === "left") {
    left = boxLeft;
    right = boxLeft + contentWidth;
  } else if (textAlign === "right") {
    right = boxRight;
    left = boxRight - contentWidth;
  }

  return {
    left,
    right,
    top,
    bottom,
  };
}

function getSingleLayerPrintSizeSummary(layer, areaMetrics) {
  if (!layer) return null;

  if (layer.type === "upload") {
    return {
      widthCm: Number((Number(layer.widthCm) || 0).toFixed(1)),
      heightCm: Number((Number(layer.heightCm) || 0).toFixed(1)),
    };
  }

  if (layer.type === "shape") {
    const metrics = getOrderLayerMetricsPx(layer, areaMetrics);
    if (!metrics?.width || !metrics?.height) return null;

    return {
      widthCm: Number((metrics.width / LOGICAL_PRINT_PX_PER_CM).toFixed(1)),
      heightCm: Number((metrics.height / LOGICAL_PRINT_PX_PER_CM).toFixed(1)),
    };
  }

  if (layer.type === "text") {
    const bounds = getOrderLayerBoundsPx(layer, areaMetrics);
    if (!bounds) return null;

    return {
      widthCm: Number((((bounds.right - bounds.left) || 0) / LOGICAL_PRINT_PX_PER_CM).toFixed(1)),
      heightCm: Number((((bounds.bottom - bounds.top) || 0) / LOGICAL_PRINT_PX_PER_CM).toFixed(1)),
    };
  }

  return null;
}

function getSidePrintPricingSummary(targetSide, sideLayers, physicalPrintArea = {}, options = {}) {
  if (!sideLayers.length) return null;

  const areaWidthCm = Number(physicalPrintArea.areaWidthCm ?? physicalPrintArea.widthCm) || 0;
  const areaHeightCm = Number(physicalPrintArea.areaHeightCm ?? physicalPrintArea.heightCm) || 0;
  const areaGeometryWidth = Number(physicalPrintArea.areaGeometryWidth ?? physicalPrintArea.width) || 0;
  const areaGeometryHeight = Number(physicalPrintArea.areaGeometryHeight ?? physicalPrintArea.height) || 0;
  const areaRenderWidthPx = Math.max(1, Number(physicalPrintArea.areaRenderWidthPx ?? physicalPrintArea.renderWidthPx) || 1);
  const areaRenderHeightPx = Math.max(1, Number(physicalPrintArea.areaRenderHeightPx ?? physicalPrintArea.renderHeightPx) || 1);
  const areaWidthPx = Math.max(MIN_LINE_LENGTH_PX, areaWidthCm * LOGICAL_PRINT_PX_PER_CM);
  const areaHeightPx = Math.max(MIN_LINE_HEIGHT_PX, areaHeightCm * LOGICAL_PRINT_PX_PER_CM);

  if (areaWidthCm <= 0 || areaHeightCm <= 0) return null;

  const areaMetrics = {
    areaWidthPx,
    areaHeightPx,
    areaWidthCm,
    areaHeightCm,
    areaGeometryWidth,
    areaGeometryHeight,
    areaRenderWidthPx,
    areaRenderHeightPx,
  };
  const singleLayerSize = sideLayers.length === 1
    ? (options.resolveSingleLayerSizeCm?.(sideLayers[0], areaMetrics) || getSingleLayerPrintSizeSummary(sideLayers[0], areaMetrics))
    : null;
  const sideBoundsEntriesCm = sideLayers
    .map((layer) => ({
      layer,
      bounds: options.resolveLayerBoundsCm?.(layer, areaMetrics) || null,
    }))
    .filter((entry) => Boolean(entry.bounds));
  const sideBoundsCm = sideBoundsEntriesCm.map((entry) => entry.bounds);

  if (sideBoundsCm.length) {
    const occupiedWidthCm = Number(Math.min(areaWidthCm, Math.max(0, Math.max(...sideBoundsCm.map((bounds) => bounds.right)) - Math.min(...sideBoundsCm.map((bounds) => bounds.left)))).toFixed(1));
    const occupiedHeightCm = Number(Math.min(areaHeightCm, Math.max(0, Math.max(...sideBoundsCm.map((bounds) => bounds.bottom)) - Math.min(...sideBoundsCm.map((bounds) => bounds.top)))).toFixed(1));
    const format = getConstructorPrintFormat(occupiedWidthCm, occupiedHeightCm);

    return {
      side: targetSide,
      sideLabel: targetSide === "front" ? "Спереди" : "Сзади",
      widthCm: occupiedWidthCm,
      heightCm: occupiedHeightCm,
      sizeLabel: buildPrintSizeLabel(occupiedWidthCm, occupiedHeightCm),
      objectSizeLabel: singleLayerSize ? buildPrintSizeLabel(singleLayerSize.widthCm, singleLayerSize.heightCm) : null,
      isSingleLayer: sideLayers.length === 1,
      formatName: format?.name || "Индивидуально",
      price: Number(format?.price) || 0,
    };
  }

  const sideBounds = sideLayers
    .map((layer) => options.resolveLayerBoundsPx?.(layer, areaMetrics) || getOrderLayerBoundsPx(layer, areaMetrics))
    .filter(Boolean);

  if (!sideBounds.length) return null;

  const occupiedWidthPx = Math.max(0, Math.max(...sideBounds.map((bounds) => bounds.right)) - Math.min(...sideBounds.map((bounds) => bounds.left)));
  const occupiedHeightPx = Math.max(0, Math.max(...sideBounds.map((bounds) => bounds.bottom)) - Math.min(...sideBounds.map((bounds) => bounds.top)));
  const occupiedWidthCm = Number(Math.min(areaWidthCm, occupiedWidthPx / LOGICAL_PRINT_PX_PER_CM).toFixed(1));
  const occupiedHeightCm = Number(Math.min(areaHeightCm, occupiedHeightPx / LOGICAL_PRINT_PX_PER_CM).toFixed(1));
  const format = getConstructorPrintFormat(occupiedWidthCm, occupiedHeightCm);

  return {
    side: targetSide,
    sideLabel: targetSide === "front" ? "Спереди" : "Сзади",
    widthCm: occupiedWidthCm,
    heightCm: occupiedHeightCm,
    sizeLabel: buildPrintSizeLabel(occupiedWidthCm, occupiedHeightCm),
    objectSizeLabel: singleLayerSize ? buildPrintSizeLabel(singleLayerSize.widthCm, singleLayerSize.heightCm) : null,
    isSingleLayer: sideLayers.length === 1,
    formatName: format?.name || "Индивидуально",
    price: Number(format?.price) || 0,
  };
}

const SMALL_ORDER_QTY_THRESHOLD = 5;

function getFormatExceedsA3Tier(formatName) {
  if (formatName === "A3++") return 2;
  if (formatName === "A3+") return 1;
  return 0;
}

function getSnapGuidesPx(areaWidth, areaHeight) {
  return {
    vertical: [0, areaWidth / 2, areaWidth],
    horizontal: [0, areaHeight / 2, areaHeight],
  };
}

function snapIntervalToGuides(startPx, sizePx, guidePositions, thresholdPx = SNAP_THRESHOLD_PX) {
  const anchors = [
    { type: "start", value: startPx },
    { type: "center", value: startPx + sizePx / 2 },
    { type: "end", value: startPx + sizePx },
  ];

  let best = null;

  anchors.forEach((anchor) => {
    guidePositions.forEach((guide) => {
      const delta = guide - anchor.value;
      const distance = Math.abs(delta);
      if (distance > thresholdPx) return;
      if (!best || distance < best.distance) {
        best = { guide, delta, distance };
      }
    });
  });

  return best
    ? { startPx: startPx + best.delta, guide: best.guide }
    : { startPx, guide: null };
}

function isTextBold(layer) {
  const font = getConstructorTextFont(layer.fontKey || DEFAULT_TEXT_FONT.key);
  if (!font.supportsBold) return false;
  return (layer.weight ?? font.regularWeight ?? DEFAULT_TEXT_WEIGHT) >= (font.boldWeight ?? DEFAULT_TEXT_WEIGHT);
}

export default function useConstructorState({
  products,
  runtimeTextLayerBoundsBySide,
  buildPreviewSrc,
  buildTelegramLink,
  readFileAsDataUrl,
  readImageSize,
}) {
  const initialProduct = products[0] || FALLBACK_PRODUCT;
  const initialSize = getPreferredProductSize(initialProduct);

  const [activeTab, setActiveTab] = useState("textile");
  const [productKey, setProductKey] = useState(() => { const m = loadConstructorMeta(); return m?.productKey || initialProduct.key || ""; });
  const [side, setSide] = useState(() => { const m = loadConstructorMeta(); return m?.side || "front"; });
  const [color, setColor] = useState(() => { const m = loadConstructorMeta(); return m?.color || initialProduct.colors?.[0] || "Чёрный"; });
  const [size, setSizeState] = useState(() => { const m = loadConstructorMeta(); return m?.size || initialSize; });
  const [qty, setQty] = useState(() => { const m = loadConstructorMeta(); return m?.qty ?? 1; });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [editingTextLayerId, setEditingTextLayerId] = useState(null);
  const [activeSnapGuides, setActiveSnapGuides] = useState([]);
  const printAreaRef = useRef(null);
  const layerIdRef = useRef(null);
  const uploadedFileIdRef = useRef(null);
  const copiedLayerRef = useRef(null);
  const historyPastRef = useRef([]);
  const historyFutureRef = useRef([]);
  const lastHistorySnapshotRef = useRef(null);
  const restoredRef = useRef(false);

  if (layerIdRef.current === null) {
    const m = loadConstructorMeta();
    layerIdRef.current = m?.layerIdCounter ?? 0;
  }
  if (uploadedFileIdRef.current === null) {
    const m = loadConstructorMeta();
    uploadedFileIdRef.current = m?.uploadedFileIdCounter ?? 0;
  }

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const meta = loadConstructorMeta();
    if (!meta?.layers?.length) return;
    (async () => {
      const restoredLayers = await Promise.all(meta.layers.map(async (layer) => {
        if (layer.type === "upload" && layer._imgKey) {
          const src = await loadImage(layer._imgKey);
          if (src) {
            const { _imgKey, _hasOrigData, _hasOrigSvg, ...rest } = layer;
            const originalData = _hasOrigData ? await loadImage(`${_imgKey}-orig`) : null;
            const originalSvgText = _hasOrigSvg ? await loadImage(`${_imgKey}-svg`) : null;
            return { ...rest, src, originalData, originalSvgText };
          }
          return null;
        }
        return layer;
      }));
      const validLayers = restoredLayers.filter(Boolean);
      if (validLayers.length) setLayers(validLayers);

      if (meta.uploadedFiles?.length) {
        const restoredFiles = await Promise.all(meta.uploadedFiles.map(async (file) => {
          if (file._imgKey) {
            const src = await loadImage(file._imgKey);
            if (src) {
              const { _imgKey, _hasOrigData, _hasOrigSvg, ...rest } = file;
              const originalData = _hasOrigData ? await loadImage(`${file._imgKey}-orig`) : null;
              const originalSvgText = _hasOrigSvg ? await loadImage(`${file._imgKey}-svg`) : null;
              return { ...rest, src, originalData, originalSvgText };
            }
            return null;
          }
          return file;
        }));
        setUploadedFiles(restoredFiles.filter(Boolean));
      }
    })();
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    const timer = setTimeout(async () => {
      const layersToSave = await Promise.all(layers.map(async (layer) => {
        if (layer.type === "upload" && layer.src) {
          const imgKey = `layer-${layer.id}`;
          await saveImage(imgKey, layer.src);
          const { src: _src, originalData: _od, originalSvgText: _os, ...rest } = layer;
          if (_od) await saveImage(`${imgKey}-orig`, _od);
          if (_os) await saveImage(`${imgKey}-svg`, _os);
          return { ...rest, _imgKey: imgKey, _hasOrigData: Boolean(_od), _hasOrigSvg: Boolean(_os) };
        }
        return layer;
      }));
      const filesToSave = await Promise.all(uploadedFiles.map(async (file) => {
        if (file.src) {
          const imgKey = `file-${file.id}`;
          await saveImage(imgKey, file.src);
          const { src: _src, originalData: _od, originalSvgText: _os, ...rest } = file;
          if (_od) await saveImage(`${imgKey}-orig`, _od);
          if (_os) await saveImage(`${imgKey}-svg`, _os);
          return { ...rest, _imgKey: imgKey, _hasOrigData: Boolean(_od), _hasOrigSvg: Boolean(_os) };
        }
        return file;
      }));
      saveConstructorMeta({
        activeTab, productKey, side, color, size, qty,
        layers: layersToSave,
        uploadedFiles: filesToSave,
        layerIdCounter: layerIdRef.current,
        uploadedFileIdCounter: uploadedFileIdRef.current,
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [layers, uploadedFiles, activeTab, productKey, side, color, size, qty]);

  const product = products.find((item) => item.key === productKey) || initialProduct;
  const safeColors = product.colors?.length ? product.colors : ["Чёрный"];
  const resolvedColor = safeColors.includes(color) ? color : safeColors[0];
  const getLayerSide = (layer) => (layer?.side === "back" ? "back" : "front");
  const isMeaningfulLayer = (layer) => {
    if (layer.type === "upload") return Boolean(layer.src);
    if (layer.type === "text") return Boolean(layer.value.trim());
    if (layer.type === "shape") return Boolean(layer.shapeKey);
    return false;
  };
  const getResolvedPrintArea = (targetSide = side, targetSize = size) => {
    const resolvedTargetSize = getPreferredProductSize(product, targetSize);
    const resolvedArea = resolveConstructorPrintArea(product.printAreas, targetSide, resolvedTargetSize);
    return resolvedArea || resolveConstructorPrintArea(FALLBACK_PRODUCT.printAreas, targetSide, targetSize);
  };
  const printArea = getResolvedPrintArea(side);
  const previewSrc = buildPreviewSrc({ product, color: resolvedColor, side, size });
  const sideLayers = layers.filter((layer) => getLayerSide(layer) === side);
  const rawActiveLayer = layers.find((layer) => layer.id === activeLayerId) || null;
  const selectedSideLayerIds = selectedLayerIds.filter((layerId) => {
    const layer = layers.find((item) => item.id === layerId);
    return layer && getLayerSide(layer) === side;
  });
  const isMultiSelection = selectedSideLayerIds.length > 1;
  const activeLayer = rawActiveLayer && getLayerSide(rawActiveLayer) === side && !isMultiSelection ? rawActiveLayer : null;
  const activeUploadLayer = activeLayer?.type === "upload" ? activeLayer : null;
  const activeTextLayer = activeLayer?.type === "text" ? activeLayer : null;
  const activeShapeLayer = activeLayer?.type === "shape" ? activeLayer : null;
  const activeTextFont = getConstructorTextFont(activeTextLayer?.fontKey || DEFAULT_TEXT_FONT.key);
  const meaningfulLayers = layers.filter((layer) => layer.visible !== false && isMeaningfulLayer(layer));
  const meaningfulFrontLayers = meaningfulLayers.filter((layer) => getLayerSide(layer) === "front");
  const meaningfulBackLayers = meaningfulLayers.filter((layer) => getLayerSide(layer) === "back");
  const hasDecoration = meaningfulLayers.length > 0;
  const canSubmitOrder = Boolean(size && hasDecoration && qty >= 1);
  const nextLayerId = (type) => {
    layerIdRef.current += 1;
    return `${type}-${layerIdRef.current}`;
  };
  const nextUploadedFileId = () => {
    uploadedFileIdRef.current += 1;
    return `uploaded-file-${uploadedFileIdRef.current}`;
  };

  const clonePlain = (value) => JSON.parse(JSON.stringify(value));

  const captureSnapshot = () => clonePlain({
    layers,
    activeLayerId,
    selectedLayerIds,
    editingTextLayerId,
    side,
    activeTab,
  });

  const pushHistoryCheckpoint = () => {
    const snapshot = captureSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastHistorySnapshotRef.current) return;
    historyPastRef.current.push(snapshot);
    if (historyPastRef.current.length > 100) historyPastRef.current.shift();
    historyFutureRef.current = [];
    lastHistorySnapshotRef.current = serialized;
  };

  const applyHistorySnapshot = (snapshot) => {
    if (!snapshot) return;
    setLayers(snapshot.layers || []);
    setActiveLayerId(snapshot.activeLayerId ?? null);
    setSelectedLayerIds(snapshot.selectedLayerIds || []);
    setEditingTextLayerId(snapshot.editingTextLayerId ?? null);
    setSide(snapshot.side === "back" ? "back" : "front");
    setActiveTab(snapshot.activeTab || "textile");
    setDraggingLayerId(null);
    setActiveSnapGuides([]);
    lastHistorySnapshotRef.current = JSON.stringify(snapshot);
  };

  const undo = () => {
    const previousSnapshot = historyPastRef.current.pop();
    if (!previousSnapshot) return;
    historyFutureRef.current.push(captureSnapshot());
    applyHistorySnapshot(previousSnapshot);
  };

  const redo = () => {
    const nextSnapshot = historyFutureRef.current.pop();
    if (!nextSnapshot) return;
    historyPastRef.current.push(captureSnapshot());
    applyHistorySnapshot(nextSnapshot);
  };

  const getLayerCreationOrder = (layer) => Number(String(layer.id || "").split("-").pop()) || 0;

  const getAutoLayerName = (type, index) => `${LAYER_TYPE_LABELS[type]} ${index + 1}`;

  const reindexAutoNamedLayers = (currentLayers) => {
    const autoNameIndexesById = new Map();

    Object.keys(LAYER_TYPE_LABELS).forEach((type) => {
      currentLayers
        .filter((layer) => layer.type === type)
        .sort((leftLayer, rightLayer) => getLayerCreationOrder(leftLayer) - getLayerCreationOrder(rightLayer))
        .forEach((layer, index) => {
          autoNameIndexesById.set(layer.id, index);
        });
    });

    return currentLayers.map((layer) => {
      if (!layer.isAutoNamed) return layer;

      const nextName = getAutoLayerName(layer.type, autoNameIndexesById.get(layer.id) || 0);
      return layer.name === nextName ? layer : { ...layer, name: nextName };
    });
  };

  const getDefaultTextColor = (nextColor = resolvedColor) => (nextColor === "Белый" ? "#111111" : "#ffffff");
  const getDefaultShapeStrokeStyle = (shapeKey) => {
    const resolvedShape = getConstructorShape(shapeKey);
    return resolvedShape.category === "lines" ? (resolvedShape.defaultLineStyle || "single") : "none";
  };

  const getLayerDefaultPosition = (layerType) => (layerType === "text" ? { x: 50, y: 28 } : { x: 50, y: 50 });
  const getPhysicalPrintArea = (targetSide = side, targetSize = size) => {
    const targetArea = getResolvedPrintArea(targetSide, targetSize);
    const widthCm = Number(targetArea?.physicalWidthCm) || 0;
    const heightCm = Number(targetArea?.physicalHeightCm) || 0;
    return { widthCm, heightCm };
  };
  const getPrintAreaPixelSize = (targetSide = side, targetSize = size) => {
    if (targetSide === side && printAreaRef.current) {
      const bounds = printAreaRef.current.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        return {
          widthPx: bounds.width,
          heightPx: bounds.height,
        };
      }
    }

    if (printAreaRef.current) {
      const bounds = printAreaRef.current.getBoundingClientRect();
      const currentArea = getResolvedPrintArea(side, targetSize);
      const targetArea = getResolvedPrintArea(targetSide, targetSize);
      const currentGeometryWidth = Math.max(0.001, Number(currentArea?.width) || 0.001);
      const currentGeometryHeight = Math.max(0.001, Number(currentArea?.height) || 0.001);
      const targetGeometryWidth = Math.max(0.001, Number(targetArea?.width) || 0.001);
      const targetGeometryHeight = Math.max(0.001, Number(targetArea?.height) || 0.001);

      if (bounds.width > 0 && bounds.height > 0) {
        return {
          widthPx: bounds.width * (targetGeometryWidth / currentGeometryWidth),
          heightPx: bounds.height * (targetGeometryHeight / currentGeometryHeight),
        };
      }
    }

    const targetArea = getResolvedPrintArea(targetSide, targetSize);
    return {
      widthPx: Math.max(1, Number(targetArea?.width) || 1),
      heightPx: Math.max(1, Number(targetArea?.height) || 1),
    };
  };
  const clampCm = (value, maxValue) => Number(Math.min(maxValue, Math.max(1, Number(value))).toFixed(1));
  const clampShapeCm = (value, maxValue) => Number(Math.min(maxValue, Math.max(0.2, Number(value) || 0.2)).toFixed(3));
  const roundCanvasPx = (value) => Number((Number(value) || 0).toFixed(3));
  const convertCmToCanvasPx = (valueCm) => roundCanvasPx((Number(valueCm) || 0) * LOGICAL_PRINT_PX_PER_CM);
  const convertCanvasPxToCm = (valuePx) => Number(((Number(valuePx) || 0) / LOGICAL_PRINT_PX_PER_CM).toFixed(3));
  const getShapeIntrinsicAspectRatio = (shapeKey) => {
    const bounds = getConstructorShapeTightBounds(shapeKey);
    return Math.max(0.05, (Number(bounds?.width) || 1) / Math.max(1, Number(bounds?.height) || 1));
  };
  const isLineShapeKey = (shapeKey) => getConstructorShape(shapeKey).category === "lines";
  const getLogicalPrintAreaSize = (layerSide = side, targetSize = size) => {
    const { widthCm, heightCm } = getPhysicalPrintArea(layerSide, targetSize);
    return {
      widthPx: Math.max(MIN_LINE_LENGTH_PX, convertCmToCanvasPx(widthCm || 1)),
      heightPx: Math.max(MIN_LINE_HEIGHT_PX, convertCmToCanvasPx(heightCm || 1)),
    };
  };
  const getLogicalLineMaxLengthPx = (layerSide = side, targetSize = size) => {
    const { widthPx, heightPx } = getLogicalPrintAreaSize(layerSide, targetSize);
    return roundCanvasPx(Math.max(MIN_LINE_LENGTH_PX, Math.hypot(widthPx, heightPx)));
  };
  const getPhysicalLineMaxLengthCm = (layerSide = side, targetSize = size) => {
    const { widthCm, heightCm } = getPhysicalPrintArea(layerSide, targetSize);
    return Number(Math.max(0.2, Math.hypot(widthCm, heightCm)).toFixed(3));
  };
  const clampLineWidthPx = (value, layerSide = side, minWidthPx = MIN_LINE_LENGTH_PX, targetSize = size) => {
    const maxWidthPx = getLogicalLineMaxLengthPx(layerSide, targetSize);
    return roundCanvasPx(Math.min(maxWidthPx, Math.max(minWidthPx, Number(value) || minWidthPx)));
  };
  const clampLineHeightPx = (value, layerSide = side, targetSize = size) => {
    const { heightPx: maxHeightPx } = getLogicalPrintAreaSize(layerSide, targetSize);
    return roundCanvasPx(Math.min(maxHeightPx, Math.max(MIN_LINE_HEIGHT_PX, Number(value) || MIN_LINE_HEIGHT_PX)));
  };
  const getLineHeightPxFromStrokeWidth = (strokeWidth, layerSide = side, targetSize = size) => {
    const rawHeightPx = Math.max(MIN_LINE_HEIGHT_PX, (Number(strokeWidth) || DEFAULT_LINE_STROKE_WIDTH) * LINE_HEIGHT_PER_STROKE_UNIT_PX);
    return clampLineHeightPx(rawHeightPx, layerSide, targetSize);
  };
  const getLineDimensionsCmFromPx = (layer, { lineWidthPx, lineHeightPx }, layerSide = side, targetSize = size) => {
    const { heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide, targetSize);
    const maxLineLengthCm = getPhysicalLineMaxLengthCm(layerSide, targetSize);
    const lineAspectRatio = Math.max(0.2, (Number(lineWidthPx) || MIN_LINE_LENGTH_PX) / Math.max(1, Number(lineHeightPx) || MIN_LINE_HEIGHT_PX));
    const visualMetrics = getConstructorLineVisualMetrics(layer?.shapeKey, layer?.strokeWidth, lineAspectRatio);
    const visibleWidthPx = (Number(lineWidthPx) || 0) * (visualMetrics.visibleWidthPx / Math.max(1, visualMetrics.layoutWidthPx));
    const visibleHeightPx = (Number(lineHeightPx) || 0) * (visualMetrics.visibleHeightPx / Math.max(1, visualMetrics.layoutHeightPx));

    return {
      widthCm: clampShapeCm(convertCanvasPxToCm(visibleWidthPx), maxLineLengthCm),
      heightCm: clampShapeCm(convertCanvasPxToCm(visibleHeightPx), maxHeightCm),
    };
  };
  const getShapeDimensionsFromWidthCm = (shapeKey, nextWidthCm, layerSide = side, targetSize = size) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide, targetSize);
    const intrinsicAspectRatio = getShapeIntrinsicAspectRatio(shapeKey);
    const widthCm = clampShapeCm(nextWidthCm, maxWidthCm);
    const heightCm = Number((widthCm / intrinsicAspectRatio).toFixed(3));

    if (heightCm <= maxHeightCm) {
      return { widthCm, heightCm };
    }

    const fittedHeightCm = clampShapeCm(maxHeightCm, maxHeightCm);
    return {
      widthCm: Number((fittedHeightCm * intrinsicAspectRatio).toFixed(3)),
      heightCm: fittedHeightCm,
    };
  };
  const getShapeDisplayDimensionsCm = (shapeKey, nextWidthCm, layerSide = side, targetSize = size) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide, targetSize);
    const intrinsicAspectRatio = getShapeIntrinsicAspectRatio(shapeKey);
    const widthCm = clampShapeCm(nextWidthCm, maxWidthCm);
    const heightCm = Number((widthCm / intrinsicAspectRatio).toFixed(3));

    if (heightCm <= maxHeightCm) {
      return { widthCm, heightCm };
    }

    const fittedHeightCm = clampShapeCm(maxHeightCm, maxHeightCm);
    return {
      widthCm: Number((fittedHeightCm * intrinsicAspectRatio).toFixed(3)),
      heightCm: fittedHeightCm,
    };
  };
  const getDefaultShapeDimensionsCm = (shapeKey, layerSide = side, targetSize = size) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide, targetSize);
    const preferredWidthCm = Math.max(4, maxWidthCm * 0.4);
    const preferredHeightCm = Math.max(4, maxHeightCm * 0.4);
    const intrinsicAspectRatio = getShapeIntrinsicAspectRatio(shapeKey);

    let widthCm = preferredWidthCm;
    let heightCm = Number((widthCm / intrinsicAspectRatio).toFixed(3));

    if (heightCm > preferredHeightCm) {
      heightCm = preferredHeightCm;
      widthCm = Number((heightCm * intrinsicAspectRatio).toFixed(3));
    }

    return {
      widthCm: clampShapeCm(widthCm, maxWidthCm),
      heightCm: clampShapeCm(heightCm, maxHeightCm),
    };
  };
  const getLineMinWidthPx = (layer, lineHeightPx) => {
    const minAspectRatio = getConstructorLineMinAspectRatio(layer?.shapeKey, layer?.strokeWidth);
    return Math.max(MIN_LINE_LENGTH_PX, roundCanvasPx(Math.max(1, Number(lineHeightPx) || MIN_LINE_HEIGHT_PX) * minAspectRatio));
  };
  const getStoredLineCanvasDimensions = (layer, layerSide = side, targetSize = size) => {
    const fallbackHeightPx = Number.isFinite(Number(layer?.heightCm))
      ? convertCmToCanvasPx(layer.heightCm)
      : getLineHeightPxFromStrokeWidth(layer?.strokeWidth, layerSide, targetSize);
    const lineHeightPx = clampLineHeightPx(
      Number.isFinite(Number(layer?.lineHeightPx)) ? layer.lineHeightPx : fallbackHeightPx,
      layerSide,
      targetSize,
    );
    const minLineWidthPx = getLineMinWidthPx(layer, lineHeightPx);

    return {
      lineWidthPx: clampLineWidthPx(
        Number.isFinite(Number(layer?.lineWidthPx)) ? layer.lineWidthPx : convertCmToCanvasPx(layer?.widthCm ?? 12),
        layerSide,
        minLineWidthPx,
        targetSize,
      ),
      lineHeightPx,
    };
  };
  const getLineCanvasDimensions = (layer, layerSide = side, targetSize = size) => {
    if (Number.isFinite(Number(layer?.lineWidthPx)) || Number.isFinite(Number(layer?.widthCm))) {
      return getStoredLineCanvasDimensions(layer, layerSide, targetSize);
    }

    const fallbackWidthCm = getDefaultShapeDimensionsCm(layer?.shapeKey || getConstructorShape().key, layerSide, targetSize).widthCm;
    return getStoredLineCanvasDimensions({ ...layer, widthCm: fallbackWidthCm }, layerSide, targetSize);
  };
  const normalizeLineShapeLayer = (layer, layerSide = side, targetSize = size) => {
    if (!isLineShapeKey(layer?.shapeKey)) return layer;

    const { lineWidthPx, lineHeightPx } = getLineCanvasDimensions(layer, layerSide, targetSize);
    const lineDimensionsCm = getLineDimensionsCmFromPx(layer, { lineWidthPx, lineHeightPx }, layerSide, targetSize);

    return {
      ...layer,
      lineWidthPx,
      lineHeightPx,
      widthCm: lineDimensionsCm.widthCm,
      heightCm: lineDimensionsCm.heightCm,
    };
  };
  const buildLayerSummary = (layer) => {
    if (layer.type === "upload") {
      return `${layer.name}: ${layer.uploadName}, размер ${layer.widthCm ?? 0} × ${layer.heightCm ?? 0} см`;
    }

    if (layer.type === "text") {
      const textPreview = layer.value;
      const textEffects = [];
      if (isTextBold(layer)) textEffects.push("жирный");
      if (layer.italic) textEffects.push("курсив");
      if (layer.underline) textEffects.push("подчеркнутый");
      if (layer.strikethrough) textEffects.push("зачеркнутый");
      if (layer.uppercase) textEffects.push("прописные буквы");
      if ((layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT) !== DEFAULT_TEXT_LINE_HEIGHT) textEffects.push(`межстрочный ${layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT}`);
      if ((layer.strokeWidth ?? 0) > 0) textEffects.push(`обводка ${layer.strokeWidth}px`);
      if (layer.shadowEnabled) textEffects.push(`мягкая тень ${layer.shadowOffsetX ?? 0}/${layer.shadowOffsetY ?? 2}/${layer.shadowBlur ?? 14}`);
      return `${layer.name}: «${textPreview.trim()}», шрифт ${layer.fontLabel || DEFAULT_TEXT_FONT.label}, ширина текстового блока ${layer.textBoxWidth ?? 88}%, интервал ${layer.letterSpacing ?? 1}px, выравнивание ${TEXT_ALIGN_LABELS[layer.textAlign] || TEXT_ALIGN_LABELS.center}${textEffects.length ? `, эффекты ${textEffects.join(", ")}` : ""}`;
    }

    if (layer.type === "shape") {
      const shape = getConstructorShape(layer.shapeKey);
      const shapeDimensionsCm = isLineShapeKey(layer.shapeKey)
        ? getLineDimensionsCmFromPx(layer, getStoredLineCanvasDimensions(layer, getLayerSide(layer)), getLayerSide(layer))
        : {
          widthCm: layer.widthCm ?? 0,
          heightCm: layer.heightCm ?? 0,
        };
      const fillSummary = layer.fillMode === "gradient"
        ? `градиент ${getConstructorTextGradient(layer.gradientKey).label}`
        : `цвет ${layer.color}`;
      const strokeSummary = layer.strokeStyle && layer.strokeStyle !== "none" ? `, обводка ${layer.strokeStyle} ${layer.strokeWidth ?? 13}px ${layer.strokeColor}` : "";
      const effectSummary = layer.effectType === "drop-shadow"
        ? `, тень ${layer.effectAngle ?? -45}°/${layer.effectDistance ?? 20}`
        : layer.effectType === "distort"
          ? `, искажение ${layer.effectAngle ?? -55}°/${layer.effectDistance ?? 9}`
          : "";
      return `${layer.name}: ${shape?.label || "Фигура"}, ${fillSummary}${strokeSummary}, размер ${shapeDimensionsCm.widthCm} × ${shapeDimensionsCm.heightCm} см${effectSummary}`;
    }

    return `${layer.name}: размер ${layer.widthCm ?? 0} × ${layer.heightCm ?? 0} см`;
  };
  const getShapeVisualMetricsCm = (layer, layerSide = getLayerSide(layer)) => {
    if (!layer || layer.type !== "shape") return null;

    const isLineShape = isLineShapeKey(layer.shapeKey);
    const visualBaseWidthCm = Number(layer.widthCm) || 16;
    const expectedIntrinsicStateDimensions = isLineShape
      ? null
      : getShapeDimensionsFromWidthCm(layer.shapeKey, visualBaseWidthCm, layerSide);
    const expectedIntrinsicHeightCm = Number(expectedIntrinsicStateDimensions?.heightCm) || 0;
    const storedHeightCm = Number(layer.heightCm) || 16;
    const isIntrinsicShapeState = !isLineShape && Math.abs(storedHeightCm - expectedIntrinsicHeightCm) <= 0.02;
    const visualBaseHeightCm = isLineShape
      ? storedHeightCm
      : isIntrinsicShapeState
        ? (getShapeDisplayDimensionsCm(layer.shapeKey, visualBaseWidthCm, layerSide).heightCm || storedHeightCm)
        : storedHeightCm;
    let baseWidthPx, baseHeightPx;
    if (isLineShape) {
      const stored = getStoredLineCanvasDimensions(layer, layerSide);
      const lineAspectRatio = Math.max(0.2, stored.lineWidthPx / Math.max(1, stored.lineHeightPx));
      const lineVisualMetrics = getConstructorLineVisualMetrics(layer.shapeKey, layer.strokeWidth, lineAspectRatio);
      baseWidthPx = stored.lineWidthPx * (lineVisualMetrics.visibleWidthPx / Math.max(1, lineVisualMetrics.layoutWidthPx));
      baseHeightPx = stored.lineHeightPx * (lineVisualMetrics.visibleHeightPx / Math.max(1, lineVisualMetrics.layoutHeightPx));
    } else {
      baseWidthPx = visualBaseWidthCm * LOGICAL_PRINT_PX_PER_CM;
      baseHeightPx = visualBaseHeightCm * LOGICAL_PRINT_PX_PER_CM;
    }
    const frameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx,
      baseHeightPx,
    });

    return {
      widthCm: Number((frameMetrics.frameWidthPx / LOGICAL_PRINT_PX_PER_CM).toFixed(3)),
      heightCm: Number((frameMetrics.frameHeightPx / LOGICAL_PRINT_PX_PER_CM).toFixed(3)),
    };
  };
  const getTextVisualMetricsCm = (layer, areaMetrics) => {
    if (!layer || layer.type !== "text") return null;

    const resolvedText = String(layer.value || "");
    const renderWidthPx = Math.max(1, Number(areaMetrics.areaRenderWidthPx) || Number(areaMetrics.areaWidthPx) || 1);
    const renderHeightPx = Math.max(1, Number(areaMetrics.areaRenderHeightPx) || Number(areaMetrics.areaHeightPx) || 1);
    const widthPercent = Math.min(100, Math.max(1, layer.textBoxWidth ?? DEFAULT_TEXT_BOX_WIDTH));
    const boxWidthPx = Math.min(renderWidthPx, renderWidthPx * (widthPercent / 100));
    const resolvedFont = getConstructorTextFont(layer.fontKey || DEFAULT_TEXT_FONT.key);
    const fontFamily = layer.fontFamily || resolvedFont.family || DEFAULT_TEXT_FONT.family;
    const fontWeight = resolvedFont.supportsBold
      ? (layer.weight ?? resolvedFont.regularWeight ?? DEFAULT_TEXT_WEIGHT)
      : (resolvedFont.regularWeight ?? 400);
    const fontStyle = resolvedFont.supportsItalic && layer.italic ? "italic" : "normal";
    const contentMetrics = getTextContentMetricsPx({
      text: layer.uppercase ? resolvedText.toUpperCase() : resolvedText,
      fontFamily,
      fontSize: layer.size ?? 36,
      fontWeight,
      fontStyle,
      lineHeight: layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
      letterSpacing: layer.letterSpacing ?? 1,
      boxWidthPx,
    });
    const visualPadding = getTextVisualPaddingPx({
      strokeWidth: layer.strokeWidth,
      shadowOffsetX: layer.shadowEnabled ? layer.shadowOffsetX : 0,
      shadowOffsetY: layer.shadowEnabled ? layer.shadowOffsetY : 0,
      shadowBlur: layer.shadowEnabled ? layer.shadowBlur : 0,
      underline: layer.underline,
      fontSize: layer.size ?? 36,
    });
    const hasVisibleText = resolvedText.trim().length > 0;
    const rawContentWidthPx = hasVisibleText
      ? Math.min(renderWidthPx, Math.max(1, contentMetrics.contentWidthPx))
      : Math.max(1, boxWidthPx);
    const rawContentHeightPx = hasVisibleText
      ? Math.min(renderHeightPx, Math.max(1, contentMetrics.contentHeightPx))
      : Math.max(1, (layer.size ?? 36) * (layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT));
    const contentWidthPx = hasVisibleText
      ? Math.min(renderWidthPx, Math.max(1, rawContentWidthPx + visualPadding.leftPaddingPx + visualPadding.rightPaddingPx))
      : Math.max(1, boxWidthPx);
    const contentHeightPx = hasVisibleText
      ? Math.min(renderHeightPx, Math.max(1, rawContentHeightPx + visualPadding.topPaddingPx + visualPadding.bottomPaddingPx))
      : rawContentHeightPx;

    return {
      rawContentWidthCm: Number(((rawContentWidthPx / renderWidthPx) * areaMetrics.areaWidthCm).toFixed(3)),
      rawContentHeightCm: Number(((rawContentHeightPx / renderHeightPx) * areaMetrics.areaHeightCm).toFixed(3)),
      contentWidthCm: Number(((contentWidthPx / renderWidthPx) * areaMetrics.areaWidthCm).toFixed(3)),
      contentHeightCm: Number(((contentHeightPx / renderHeightPx) * areaMetrics.areaHeightCm).toFixed(3)),
      boxWidthCm: Number(((boxWidthPx / renderWidthPx) * areaMetrics.areaWidthCm).toFixed(3)),
      leftPaddingCm: Number(((visualPadding.leftPaddingPx / renderWidthPx) * areaMetrics.areaWidthCm).toFixed(3)),
      rightPaddingCm: Number(((visualPadding.rightPaddingPx / renderWidthPx) * areaMetrics.areaWidthCm).toFixed(3)),
      topPaddingCm: Number(((visualPadding.topPaddingPx / renderHeightPx) * areaMetrics.areaHeightCm).toFixed(3)),
      bottomPaddingCm: Number(((visualPadding.bottomPaddingPx / renderHeightPx) * areaMetrics.areaHeightCm).toFixed(3)),
    };
  };
  const clampBoundsCmToPrintArea = (bounds, areaMetrics) => {
    if (!bounds) return null;

    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, Number(areaMetrics.areaWidthCm) || 0);
    const maxY = Math.max(0, Number(areaMetrics.areaHeightCm) || 0);
    const left = Math.min(maxX, Math.max(minX, Number(bounds.left) || 0));
    const right = Math.min(maxX, Math.max(minX, Number(bounds.right) || 0));
    const top = Math.min(maxY, Math.max(minY, Number(bounds.top) || 0));
    const bottom = Math.min(maxY, Math.max(minY, Number(bounds.bottom) || 0));

    if (right <= left || bottom <= top) {
      return null;
    }

    return {
      left,
      right,
      top,
      bottom,
    };
  };
  const resolveOrderLayerBoundsCm = (layer, areaMetrics) => {
    if (layer?.type === "upload") {
      const baseW = Math.max(0, Number(layer.widthCm) || 0);
      const baseH = Math.max(0, Number(layer.heightCm) || 0);
      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      let widthCm = baseW;
      let heightCm = baseH;
      if (rotDeg) {
        const rotRad = (rotDeg * Math.PI) / 180;
        widthCm = Math.abs(baseW * Math.cos(rotRad)) + Math.abs(baseH * Math.sin(rotRad));
        heightCm = Math.abs(baseW * Math.sin(rotRad)) + Math.abs(baseH * Math.cos(rotRad));
      }
      const centerXCm = ((Number(layer.position?.x) || 50) / 100) * areaMetrics.areaWidthCm;
      const centerYCm = ((Number(layer.position?.y) || 50) / 100) * areaMetrics.areaHeightCm;

      return clampBoundsCmToPrintArea({
        left: centerXCm - (widthCm / 2),
        right: centerXCm + (widthCm / 2),
        top: centerYCm - (heightCm / 2),
        bottom: centerYCm + (heightCm / 2),
      }, areaMetrics);
    }

    if (layer?.type === "text") {
      const textMetricsCm = getTextVisualMetricsCm(layer, areaMetrics);
      if (!textMetricsCm) return null;

      const rawContentWidthCm = Math.max(0, textMetricsCm.rawContentWidthCm);
      const rawContentHeightCm = Math.max(0, textMetricsCm.rawContentHeightCm);
      const boxWidthCm = Math.max(rawContentWidthCm, textMetricsCm.boxWidthCm);
      const centerXCm = ((Number(layer.position?.x) || 50) / 100) * areaMetrics.areaWidthCm;
      const centerYCm = ((Number(layer.position?.y) || 50) / 100) * areaMetrics.areaHeightCm;
      const boxLeftCm = centerXCm - (boxWidthCm / 2);
      const boxRightCm = centerXCm + (boxWidthCm / 2);
      const textAlign = layer.textAlign || "center";

      let left = centerXCm - (rawContentWidthCm / 2);
      let right = centerXCm + (rawContentWidthCm / 2);

      if (textAlign === "left") {
        left = boxLeftCm;
        right = boxLeftCm + rawContentWidthCm;
      } else if (textAlign === "right") {
        right = boxRightCm;
        left = boxRightCm - rawContentWidthCm;
      }

      const top = centerYCm - (rawContentHeightCm / 2);
      const bottom = centerYCm + (rawContentHeightCm / 2);

      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      if (rotDeg) {
        const contentW = right - left;
        const contentH = bottom - top;
        const rotRad = (rotDeg * Math.PI) / 180;
        const aabbW = Math.abs(contentW * Math.cos(rotRad)) + Math.abs(contentH * Math.sin(rotRad));
        const aabbH = Math.abs(contentW * Math.sin(rotRad)) + Math.abs(contentH * Math.cos(rotRad));
        return clampBoundsCmToPrintArea({
          left: centerXCm - (aabbW / 2),
          right: centerXCm + (aabbW / 2),
          top: centerYCm - (aabbH / 2),
          bottom: centerYCm + (aabbH / 2),
        }, areaMetrics);
      }

      return clampBoundsCmToPrintArea({
        left,
        right,
        top,
        bottom,
      }, areaMetrics);
    }

    if (layer?.type !== "shape") {
      return null;
    }

    const visualMetricsCm = getShapeVisualMetricsCm(layer, getLayerSide(layer));
    if (!visualMetricsCm) return null;

    const baseW = Math.max(0, Number(visualMetricsCm.widthCm) || 0);
    const baseH = Math.max(0, Number(visualMetricsCm.heightCm) || 0);
    if (baseW <= 0 || baseH <= 0) return null;

    const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
    const rotRad = (rotDeg * Math.PI) / 180;
    const widthCm = rotDeg
      ? (Math.abs(baseW * Math.cos(rotRad)) + Math.abs(baseH * Math.sin(rotRad)))
      : baseW;
    const heightCm = rotDeg
      ? (Math.abs(baseW * Math.sin(rotRad)) + Math.abs(baseH * Math.cos(rotRad)))
      : baseH;
    const centerXCm = ((Number(layer.position?.x) || 50) / 100) * areaMetrics.areaWidthCm;
    const centerYCm = ((Number(layer.position?.y) || 50) / 100) * areaMetrics.areaHeightCm;

    return clampBoundsCmToPrintArea({
      left: centerXCm - (widthCm / 2),
      right: centerXCm + (widthCm / 2),
      top: centerYCm - (heightCm / 2),
      bottom: centerYCm + (heightCm / 2),
    }, areaMetrics);
  };
  const resolveSingleLayerSizeCm = (layer, areaMetrics) => {
    if (layer?.type === "upload") {
      const baseW = Number(layer.widthCm) || 0;
      const baseH = Number(layer.heightCm) || 0;
      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      if (rotDeg) {
        const rotRad = (rotDeg * Math.PI) / 180;
        return {
          widthCm: Number((Math.abs(baseW * Math.cos(rotRad)) + Math.abs(baseH * Math.sin(rotRad))).toFixed(1)),
          heightCm: Number((Math.abs(baseW * Math.sin(rotRad)) + Math.abs(baseH * Math.cos(rotRad))).toFixed(1)),
        };
      }
      return {
        widthCm: Number(baseW.toFixed(1)),
        heightCm: Number(baseH.toFixed(1)),
      };
    }

    if (layer?.type === "text") {
      const textMetricsCm = getTextVisualMetricsCm(layer, areaMetrics);
      if (!textMetricsCm) return null;

      const rawW = Math.max(0, textMetricsCm.rawContentWidthCm);
      const rawH = Math.max(0, textMetricsCm.rawContentHeightCm);
      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      if (rotDeg) {
        const rotRad = (rotDeg * Math.PI) / 180;
        return {
          widthCm: Number((Math.abs(rawW * Math.cos(rotRad)) + Math.abs(rawH * Math.sin(rotRad))).toFixed(1)),
          heightCm: Number((Math.abs(rawW * Math.sin(rotRad)) + Math.abs(rawH * Math.cos(rotRad))).toFixed(1)),
        };
      }
      return {
        widthCm: Number(rawW.toFixed(1)),
        heightCm: Number(rawH.toFixed(1)),
      };
    }

    if (layer?.type === "shape") {
      if (isLineShapeKey(layer.shapeKey)) {
        return getLineDimensionsCmFromPx(layer, getStoredLineCanvasDimensions(layer, getLayerSide(layer)), getLayerSide(layer));
      }

      const visualMetricsCm = getShapeVisualMetricsCm(layer, getLayerSide(layer));
      if (!visualMetricsCm) return null;

      const baseW = Number(visualMetricsCm.widthCm) || 0;
      const baseH = Number(visualMetricsCm.heightCm) || 0;
      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      if (rotDeg) {
        const rotRad = (rotDeg * Math.PI) / 180;
        return {
          widthCm: Number((Math.abs(baseW * Math.cos(rotRad)) + Math.abs(baseH * Math.sin(rotRad))).toFixed(1)),
          heightCm: Number((Math.abs(baseW * Math.sin(rotRad)) + Math.abs(baseH * Math.cos(rotRad))).toFixed(1)),
        };
      }
      return {
        widthCm: Number(baseW.toFixed(1)),
        heightCm: Number(baseH.toFixed(1)),
      };
    }

    const bounds = resolveOrderLayerBoundsCm(layer, areaMetrics);
    if (!bounds) return null;

    return {
      widthCm: Number(((bounds.right - bounds.left) || 0).toFixed(1)),
      heightCm: Number(((bounds.bottom - bounds.top) || 0).toFixed(1)),
    };
  };
  const resolveRuntimeLayerBoundsCm = (layer) => {
    if (layer?.type !== "text") return null;
    return runtimeTextLayerBoundsBySide?.[getLayerSide(layer)]?.[layer.id] || null;
  };
  // eslint-disable-next-line react-hooks/refs -- getPrintAreaPixelSize needs ref for pricing calculations
  const frontPrintAreaPixelSize = getPrintAreaPixelSize("front", size);
  // eslint-disable-next-line react-hooks/refs -- getPrintAreaPixelSize needs ref for pricing calculations
  const backPrintAreaPixelSize = getPrintAreaPixelSize("back", size);
  const frontResolvedPrintArea = getResolvedPrintArea("front", size);
  const backResolvedPrintArea = getResolvedPrintArea("back", size);
  const frontPhysicalArea = getPhysicalPrintArea("front", size);
  const backPhysicalArea = getPhysicalPrintArea("back", size);
  const frontPrintPricing = getSidePrintPricingSummary("front", meaningfulFrontLayers, {
    widthCm: frontPhysicalArea.widthCm,
    heightCm: frontPhysicalArea.heightCm,
    width: frontResolvedPrintArea?.width,
    height: frontResolvedPrintArea?.height,
    renderWidthPx: frontPrintAreaPixelSize?.widthPx,
    renderHeightPx: frontPrintAreaPixelSize?.heightPx,
  }, {
    resolveSingleLayerSizeCm,
    resolveLayerBoundsCm: resolveOrderLayerBoundsCm,
    resolveRuntimeLayerBoundsCm,
  });
  const backPrintPricing = getSidePrintPricingSummary("back", meaningfulBackLayers, {
    widthCm: backPhysicalArea.widthCm,
    heightCm: backPhysicalArea.heightCm,
    width: backResolvedPrintArea?.width,
    height: backResolvedPrintArea?.height,
    renderWidthPx: backPrintAreaPixelSize?.widthPx,
    renderHeightPx: backPrintAreaPixelSize?.heightPx,
  }, {
    resolveSingleLayerSizeCm,
    resolveLayerBoundsCm: resolveOrderLayerBoundsCm,
    resolveRuntimeLayerBoundsCm,
  });

  const activePrintSidesCount = [frontPrintPricing, backPrintPricing].filter(Boolean).length;
  const isSmallOrder = qty < SMALL_ORDER_QTY_THRESHOLD && activePrintSidesCount > 0;
  let resolvedFrontPrintPrice = frontPrintPricing?.price || 0;
  let resolvedBackPrintPrice = backPrintPricing?.price || 0;
  if (isSmallOrder) {
    if (activePrintSidesCount === 1) {
      const singleSide = frontPrintPricing || backPrintPricing;
      const tier = getFormatExceedsA3Tier(singleSide.formatName);
      const smallOrderPrice = tier >= 2 ? 800 : tier >= 1 ? 650 : 600;
      if (frontPrintPricing) resolvedFrontPrintPrice = smallOrderPrice;
      else resolvedBackPrintPrice = smallOrderPrice;
    } else {
      const frontTier = getFormatExceedsA3Tier(frontPrintPricing.formatName);
      const backTier = getFormatExceedsA3Tier(backPrintPricing.formatName);
      const frontSurcharge = frontTier >= 2 ? 200 : frontTier >= 1 ? 50 : 0;
      const backSurcharge = backTier >= 2 ? 200 : backTier >= 1 ? 50 : 0;
      resolvedFrontPrintPrice = 500 + frontSurcharge;
      resolvedBackPrintPrice = 500 + backSurcharge;
    }
  }
  const currentPrintTotalPerItem = resolvedFrontPrintPrice + resolvedBackPrintPrice;
  const currentUnitPrice = product.price + currentPrintTotalPerItem;
  const currentTotal = currentUnitPrice * qty;
  const currentOrderLines = [
    { side: "front", layers: meaningfulFrontLayers, printPricing: frontPrintPricing, resolvedPrice: resolvedFrontPrintPrice },
    { side: "back", layers: meaningfulBackLayers, printPricing: backPrintPricing, resolvedPrice: resolvedBackPrintPrice },
  ].filter(({ layers: nextLayers }) => nextLayers.length > 0).map(({ side: orderSide, layers: nextLayers, printPricing, resolvedPrice }) => ({
    productName: product.displayName,
    color: resolvedColor,
    size,
    qty,
    side: orderSide,
    printFormatName: printPricing?.formatName || null,
    printSizeLabel: printPricing?.sizeLabel || null,
    printPrice: resolvedPrice,
    layerSummary: nextLayers.map(buildLayerSummary),
    total: currentTotal,
  }));
  const orderMeta = [
    [`Футболка ${product.name.toLowerCase()}${product.densityLabel ? ` ${product.densityLabel}` : ""}`, `${product.price.toLocaleString("ru-RU")} ₽`],
    ["Цвет", resolvedColor],
    ["Размер", size || "Не выбран"],
    ["Количество", `${qty} шт`],
    ...(activePrintSidesCount > 0 ? [["---"]] : []),
    ...(frontPrintPricing ? [
      [`Печать спереди • ${frontPrintPricing.formatName} • ${frontPrintPricing.isSingleLayer ? (frontPrintPricing.objectSizeLabel || frontPrintPricing.sizeLabel) : frontPrintPricing.sizeLabel}`, `${resolvedFrontPrintPrice.toLocaleString("ru-RU")} ₽`],
    ] : []),
    ...(backPrintPricing ? [
      [`Печать сзади • ${backPrintPricing.formatName} • ${backPrintPricing.isSingleLayer ? (backPrintPricing.objectSizeLabel || backPrintPricing.sizeLabel) : backPrintPricing.sizeLabel}`, `${resolvedBackPrintPrice.toLocaleString("ru-RU")} ₽`],
    ] : []),
    ...(isSmallOrder && ![
      frontPrintPricing?.formatName,
      backPrintPricing?.formatName
    ].some((name) => name === "A3+" || name === "A3++") ? [
      ["hint", `От 5 шт печать дешевле: ${((frontPrintPricing?.price || 0) + (backPrintPricing?.price || 0)).toLocaleString("ru-RU")} ₽ вместо ${currentPrintTotalPerItem.toLocaleString("ru-RU")} ₽`],
    ] : []),
    ["---"],
    ["Итого за 1 шт", `${currentUnitPrice.toLocaleString("ru-RU")} ₽`],
  ];
  const getVisibleLayerAspectRatio = (layer) => {
    const visibleWidth = Number(layer?.renderFrame?.contentBounds?.width) || Number(layer?.width) || 1;
    const visibleHeight = Number(layer?.renderFrame?.contentBounds?.height) || Number(layer?.height) || 1;
    return Math.max(0.01, visibleWidth / Math.max(1, visibleHeight));
  };

  const getAssetCmAspectRatio = (intrinsicAspectRatio) => {
    return Math.max(0.05, intrinsicAspectRatio);
  };

  const getUploadAspectRatio = (layer) => getAssetCmAspectRatio(getVisibleLayerAspectRatio(layer), getLayerSide(layer));

  const getDefaultUploadDimensionsCm = ({ width, height, layerSide = side }) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide);
    const naturalWidth = Number(width);
    const naturalHeight = Number(height);

    if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
      return {
        widthCm: Number((maxWidthCm * 0.7).toFixed(3)),
        heightCm: Number((maxHeightCm * 0.7).toFixed(3)),
      };
    }

    const sourceRatio = naturalWidth / naturalHeight;
    const previewAspectRatioCm = getAssetCmAspectRatio(sourceRatio, layerSide);
    const maxAllowedWidthCm = Number((maxWidthCm * 0.7).toFixed(3));
    const maxAllowedHeightCm = Number((maxHeightCm * 0.7).toFixed(3));

    let widthCm = maxAllowedWidthCm;
    let heightCm = Number((widthCm / previewAspectRatioCm).toFixed(3));

    if (heightCm > maxAllowedHeightCm) {
      heightCm = maxAllowedHeightCm;
      widthCm = Number((heightCm * previewAspectRatioCm).toFixed(3));
    }

    if (import.meta.env.DEV) {
      const previewRatio = heightCm > 0 ? (widthCm / heightCm) : sourceRatio;
      const normalizedDelta = sourceRatio > 0 ? Math.abs(previewRatio - sourceRatio) / sourceRatio : 0;

      if (normalizedDelta > UPLOAD_RATIO_TOLERANCE) {
        console.warn("[constructor] upload ratio mismatch on init", {
          sourceRatio,
          previewRatio,
          widthCm,
          heightCm,
          layerSide,
        });
      }
    }

    return { widthCm, heightCm };
  };
  const LAYER_ADD_OFFSETS = {
    text: { x: 0, y: 4.5 },
    shape: { x: 3.5, y: 3.5 },
    upload: { x: 4, y: 4 },
  };

  const getNextAddedLayerPosition = (layer) => {
    const defaultPosition = getLayerDefaultPosition(layer.type);
    const sameSideLayers = layers.filter((currentLayer) => getLayerSide(currentLayer) === getLayerSide(layer));
    const referenceLayer = activeLayer && getLayerSide(activeLayer) === getLayerSide(layer)
      ? activeLayer
      : sameSideLayers[sameSideLayers.length - 1] || null;
    const offset = LAYER_ADD_OFFSETS[layer.type] || { x: 4, y: 4 };

    if (!referenceLayer) {
      return clampLayerPosition(defaultPosition, layer, getLayerMetrics(layer));
    }

    return clampLayerPosition({
      x: referenceLayer.position.x + offset.x,
      y: referenceLayer.position.y + offset.y,
    }, layer, getLayerMetrics(layer));
  };

  const buildTextLayer = (overrides = {}) => ({
    id: nextLayerId("text"),
    type: "text",
    name: LAYER_TYPE_LABELS.text,
    isAutoNamed: true,
    visible: true,
    locked: false,
    value: "",
    size: 36,
    textFillMode: "solid",
    color: getDefaultTextColor(),
    gradientKey: DEFAULT_TEXT_GRADIENT.key,
    weight: DEFAULT_TEXT_FONT.regularWeight ?? 400,
    italic: false,
    underline: false,
    strikethrough: false,
    uppercase: false,
    fontKey: DEFAULT_TEXT_FONT.key,
    fontFamily: DEFAULT_TEXT_FONT.family,
    fontLabel: DEFAULT_TEXT_FONT.label,
    textBoxWidth: DEFAULT_TEXT_BOX_WIDTH,
    lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
    letterSpacing: 1,
    textAlign: "center",
    strokeWidth: 0,
    strokeColor: DEFAULT_TEXT_STROKE_COLOR,
    shadowEnabled: false,
    shadowMode: "soft",
    shadowColor: DEFAULT_TEXT_SHADOW_COLOR,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    shadowBlur: 14,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    side: overrides.side || side,
    position: getLayerDefaultPosition("text"),
    ...overrides,
  });

  const buildShapeLayer = (overrides = {}) => {
    const resolvedSide = overrides.side || side;
    const resolvedShapeKey = getConstructorShape(overrides.shapeKey).key;
    const defaultDimensions = getDefaultShapeDimensionsCm(resolvedShapeKey, resolvedSide);
    const isLineShape = isLineShapeKey(resolvedShapeKey);
    const defaultStrokeWidth = isLineShape ? DEFAULT_LINE_STROKE_WIDTH : DEFAULT_SHAPE_STROKE_WIDTH;
    const resolvedStrokeWidth = Math.max(1, Number(overrides.strokeWidth) || defaultStrokeWidth);

    const nextLayer = {
      id: nextLayerId("shape"),
      type: "shape",
      name: LAYER_TYPE_LABELS.shape,
      isAutoNamed: true,
      visible: true,
      locked: false,
      shapeKey: resolvedShapeKey,
      fillMode: "solid",
      color: getDefaultTextColor(),
      gradientKey: DEFAULT_TEXT_GRADIENT.key,
      strokeStyle: getDefaultShapeStrokeStyle(resolvedShapeKey),
      strokeWidth: resolvedStrokeWidth,
      strokeColor: getDefaultTextColor() === "#ffffff" ? "#111111" : "#ffffff",
      effectType: "none",
      effectAngle: -45,
      effectDistance: 20,
      effectColor: "#824ef0",
      distortionColorA: "#ed5bb7",
      distortionColorB: "#1cb8d8",
      cornerRoundness: 0,
      rotationDeg: 0,
      widthCm: defaultDimensions.widthCm,
      heightCm: defaultDimensions.heightCm,
      desiredWidthCm: defaultDimensions.widthCm,
      desiredHeightCm: defaultDimensions.heightCm,
      side: resolvedSide,
      position: getLayerDefaultPosition("shape"),
      ...overrides,
    };


    if (!isLineShape) {
      return nextLayer;
    }

    return normalizeLineShapeLayer({
      ...nextLayer,
      lineWidthPx: Number.isFinite(Number(overrides.lineWidthPx))
        ? overrides.lineWidthPx
        : convertCmToCanvasPx(defaultDimensions.widthCm),
      lineHeightPx: Number.isFinite(Number(overrides.lineHeightPx))
        ? overrides.lineHeightPx
        : getLineHeightPxFromStrokeWidth(resolvedStrokeWidth, resolvedSide),
    }, resolvedSide);
  };

  const buildUploadLayer = ({ id: _sourceId, src, uploadName, width, height, sourceType: _srcType, originalData: _origData, originalSvgText: _origSvg, ...overrides }) => {
    const resolvedSide = overrides.side || side;
    const sameSideUploadLayersCount = layers.filter((layer) => layer.type === "upload" && getLayerSide(layer) === resolvedSide).length;
    const uploadCascadeStep = 3.5;
    const uploadCascadeMaxOffset = 18;
    const uploadCascadeOffset = Math.min(sameSideUploadLayersCount * uploadCascadeStep, uploadCascadeMaxOffset);
    const defaultUploadPosition = {
      x: Math.min(68, 50 + uploadCascadeOffset),
      y: Math.min(68, 50 + uploadCascadeOffset),
    };
    const defaultDimensions = getDefaultUploadDimensionsCm({
      width: Number(overrides.renderFrame?.contentBounds?.width) || width,
      height: Number(overrides.renderFrame?.contentBounds?.height) || height,
      layerSide: resolvedSide,
    });

    return {
      id: nextLayerId("upload"),
      type: "upload",
      name: LAYER_TYPE_LABELS.upload,
      isAutoNamed: true,
      visible: true,
      locked: false,
      src,
      uploadName,
      width,
      height,
      renderFrame: overrides.renderFrame || null,
      sourceType: _srcType || "raster",
      originalData: _origData || null,
      originalSvgText: _origSvg || null,
      widthCm: defaultDimensions.widthCm,
      heightCm: defaultDimensions.heightCm,
      desiredWidthCm: defaultDimensions.widthCm,
      desiredHeightCm: defaultDimensions.heightCm,
      rotationDeg: 0,
      side: resolvedSide,
      position: overrides.position || defaultUploadPosition,
      ...overrides,
    };
  };
  const getShapeByKey = (shapeKey) => getConstructorShape(shapeKey);

  const updateLayer = (layerId, updater) => {
    setLayers((currentLayers) => currentLayers.map((layer) => {
      if (layer.id !== layerId) return layer;
      return typeof updater === "function" ? updater(layer) : { ...layer, ...updater };
    }));
  };

  const removeLayerById = (layerId) => {
    setLayers((currentLayers) => {
      const removedLayer = currentLayers.find((layer) => layer.id === layerId) || null;
      const removedSide = getLayerSide(removedLayer);
      const nextLayers = reindexAutoNamedLayers(currentLayers.filter((layer) => layer.id !== layerId));
      setSelectedLayerIds((currentSelectedIds) => {
        const nextSelectedIds = currentSelectedIds.filter((id) => id !== layerId && nextLayers.some((layer) => layer.id === id));
        if (nextSelectedIds.length) {
          if (activeLayerId === layerId || !nextSelectedIds.includes(activeLayerId)) {
            setActiveLayerId(nextSelectedIds[nextSelectedIds.length - 1] || null);
          }
          return nextSelectedIds;
        }

        const sameSideLayers = nextLayers.filter((layer) => getLayerSide(layer) === removedSide);
        const fallbackId = sameSideLayers[sameSideLayers.length - 1]?.id || null;
        setActiveLayerId(fallbackId);
        return fallbackId ? [fallbackId] : [];
      });
      if (draggingLayerId === layerId) {
        setDraggingLayerId(null);
      }
      if (editingTextLayerId === layerId) {
        setEditingTextLayerId(null);
      }
      return nextLayers;
    });
  };

  const addLayer = (layer, nextTab) => {
    setLayers((currentLayers) => reindexAutoNamedLayers([...currentLayers, layer]));
    setActiveLayerId(layer.id);
    setSelectedLayerIds([layer.id]);
    if (nextTab) setActiveTab(nextTab);
  };

  const handleSideChange = (nextSide) => {
    const resolvedSide = nextSide === "back" ? "back" : "front";
    setSide(resolvedSide);
    setDraggingLayerId(null);
    setEditingTextLayerId(null);
    setActiveSnapGuides([]);

    const nextSideLayers = layers.filter((layer) => getLayerSide(layer) === resolvedSide);
    const fallbackId = nextSideLayers[nextSideLayers.length - 1]?.id || null;
    setActiveLayerId(fallbackId);
    setSelectedLayerIds(fallbackId ? [fallbackId] : []);
  };

  const getLayerMetrics = (layer, nextState = null) => {
    const resolvedLayer = nextState ? { ...layer, ...nextState } : layer;
    if (!printAreaRef.current || !resolvedLayer) return null;

    const { width: areaWidth, height: areaHeight } = printAreaRef.current.getBoundingClientRect();
    if (!areaWidth || !areaHeight) return null;

    const { widthCm: areaWidthCm } = getPhysicalPrintArea(getLayerSide(resolvedLayer));

    if (resolvedLayer.type === "upload") {
      const widthCm = resolvedLayer.widthCm;
      const heightCm = resolvedLayer.heightCm;
      if (!widthCm || !heightCm) return null;
      const pxPerCm = areaWidth / Math.max(0.001, areaWidthCm);
      const baseWidth = Math.min(areaWidth, widthCm * pxPerCm);
      const baseHeight = Math.min(areaHeight, heightCm * pxPerCm);
      const normalizedRotationDeg = normalizeRotationDeg(resolvedLayer.rotationDeg ?? 0);
      const rotationRadians = (normalizedRotationDeg * Math.PI) / 180;
      const width = normalizedRotationDeg
        ? (Math.abs(baseWidth * Math.cos(rotationRadians)) + Math.abs(baseHeight * Math.sin(rotationRadians)))
        : baseWidth;
      const height = normalizedRotationDeg
        ? (Math.abs(baseWidth * Math.sin(rotationRadians)) + Math.abs(baseHeight * Math.cos(rotationRadians)))
        : baseHeight;
      return { areaWidth, areaHeight, width, height };
    }

    if (resolvedLayer.type === "shape") {
      const isLineShape = isLineShapeKey(resolvedLayer.shapeKey);
      const { widthPx: logicalAreaWidthPx, heightPx: logicalAreaHeightPx } = getLogicalPrintAreaSize(getLayerSide(resolvedLayer));
      const lineDimensions = isLineShape ? getLineCanvasDimensions(resolvedLayer, getLayerSide(resolvedLayer)) : null;
      const widthCm = resolvedLayer.widthCm;
      const heightCm = resolvedLayer.heightCm ?? widthCm;
      const pxPerCm = areaWidth / Math.max(0.001, areaWidthCm);
      const baseWidth = isLineShape
        ? areaWidth * ((lineDimensions?.lineWidthPx || MIN_LINE_LENGTH_PX) / logicalAreaWidthPx)
        : Math.min(areaWidth, widthCm * pxPerCm);
      const baseHeight = isLineShape
        ? areaHeight * ((lineDimensions?.lineHeightPx || MIN_LINE_HEIGHT_PX) / logicalAreaHeightPx)
        : Math.min(areaHeight, heightCm * pxPerCm);
      const frameMetrics = getShapeFrameMetricsPx(resolvedLayer, {
        baseWidthPx: baseWidth,
        baseHeightPx: baseHeight,
      });
      const normalizedRotationDeg = normalizeRotationDeg(resolvedLayer.rotationDeg ?? 0);
      const rotationRadians = (normalizedRotationDeg * Math.PI) / 180;
      const rotatedWidth = normalizedRotationDeg
        ? (Math.abs(frameMetrics.frameWidthPx * Math.cos(rotationRadians)) + Math.abs(frameMetrics.frameHeightPx * Math.sin(rotationRadians)))
        : frameMetrics.frameWidthPx;
      const rotatedHeight = normalizedRotationDeg
        ? (Math.abs(frameMetrics.frameWidthPx * Math.sin(rotationRadians)) + Math.abs(frameMetrics.frameHeightPx * Math.cos(rotationRadians)))
        : frameMetrics.frameHeightPx;

      let clampWidth = rotatedWidth;
      let clampHeight = rotatedHeight;

      if (isLineShape && lineDimensions) {
        const lineAspectRatio = Math.max(0.2, (lineDimensions.lineWidthPx || MIN_LINE_LENGTH_PX) / Math.max(1, lineDimensions.lineHeightPx || MIN_LINE_HEIGHT_PX));
        const visualMetrics = getConstructorLineVisualMetrics(resolvedLayer.shapeKey, resolvedLayer.strokeWidth, lineAspectRatio);
        const visualWidth = baseWidth * (visualMetrics.visibleWidthPx / Math.max(1, visualMetrics.layoutWidthPx)) + frameMetrics.leftPaddingPx + frameMetrics.rightPaddingPx;
        const visualHeight = baseHeight * (visualMetrics.visibleHeightPx / Math.max(1, visualMetrics.layoutHeightPx)) + frameMetrics.topPaddingPx + frameMetrics.bottomPaddingPx;
        clampWidth = normalizedRotationDeg
          ? (Math.abs(visualWidth * Math.cos(rotationRadians)) + Math.abs(visualHeight * Math.sin(rotationRadians)))
          : visualWidth;
        clampHeight = normalizedRotationDeg
          ? (Math.abs(visualWidth * Math.sin(rotationRadians)) + Math.abs(visualHeight * Math.cos(rotationRadians)))
          : visualHeight;
      }

      return {
        areaWidth,
        areaHeight,
        width: rotatedWidth,
        height: rotatedHeight,
        clampWidth,
        clampHeight,
        baseWidth,
        baseHeight,
        frameMetrics,
      };
    }
    const resolvedText = String(resolvedLayer.value || "");
    const widthPercent = Math.min(100, Math.max(1, resolvedLayer.textBoxWidth ?? 88));
    const boxWidth = Math.min(areaWidth, areaWidth * (widthPercent / 100));
    const resolvedFont = getConstructorTextFont(resolvedLayer.fontKey || DEFAULT_TEXT_FONT.key);
    const fontFamily = resolvedLayer.fontFamily || resolvedFont.family || DEFAULT_TEXT_FONT.family;
    const fontWeight = resolvedFont.supportsBold
      ? (resolvedLayer.weight ?? resolvedFont.regularWeight ?? DEFAULT_TEXT_WEIGHT)
      : (resolvedFont.regularWeight ?? 400);
    const fontStyle = resolvedFont.supportsItalic && resolvedLayer.italic ? "italic" : "normal";
    const contentMetrics = getTextContentMetricsPx({
      text: resolvedLayer.uppercase ? resolvedText.toUpperCase() : resolvedText,
      fontFamily,
      fontSize: resolvedLayer.size ?? 36,
      fontWeight,
      fontStyle,
      lineHeight: resolvedLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
      letterSpacing: resolvedLayer.letterSpacing ?? 1,
      boxWidthPx: boxWidth,
    });
    const visualPadding = getTextVisualPaddingPx({
      strokeWidth: resolvedLayer.strokeWidth,
      shadowOffsetX: resolvedLayer.shadowEnabled ? resolvedLayer.shadowOffsetX : 0,
      shadowOffsetY: resolvedLayer.shadowEnabled ? resolvedLayer.shadowOffsetY : 0,
      shadowBlur: resolvedLayer.shadowEnabled ? resolvedLayer.shadowBlur : 0,
      underline: resolvedLayer.underline,
      fontSize: resolvedLayer.size ?? 36,
    });
    const hasVisibleText = resolvedText.trim().length > 0;
    const rawContentWidth = hasVisibleText
      ? Math.min(areaWidth, Math.max(1, contentMetrics.contentWidthPx))
      : Math.max(1, boxWidth);
    const rawContentHeight = hasVisibleText
      ? Math.min(areaHeight, Math.max(1, contentMetrics.contentHeightPx))
      : Math.max(1, (resolvedLayer.size ?? 36) * (resolvedLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT));
    const contentWidth = hasVisibleText
      ? Math.min(areaWidth, Math.max(1, contentMetrics.contentWidthPx + visualPadding.leftPaddingPx + visualPadding.rightPaddingPx))
      : Math.max(1, boxWidth);
    const contentHeight = hasVisibleText
      ? Math.min(areaHeight, Math.max(1, contentMetrics.contentHeightPx + visualPadding.topPaddingPx + visualPadding.bottomPaddingPx))
      : Math.max(1, (resolvedLayer.size ?? 36) * (resolvedLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT));
    const textRotationDeg = normalizeRotationDeg(resolvedLayer.rotationDeg ?? 0);
    const textRotationRad = (textRotationDeg * Math.PI) / 180;
    const rotatedContentWidth = textRotationDeg
      ? (Math.abs(contentWidth * Math.cos(textRotationRad)) + Math.abs(contentHeight * Math.sin(textRotationRad)))
      : contentWidth;
    const rotatedContentHeight = textRotationDeg
      ? (Math.abs(contentWidth * Math.sin(textRotationRad)) + Math.abs(contentHeight * Math.cos(textRotationRad)))
      : contentHeight;
    return {
      areaWidth,
      areaHeight,
      width: rotatedContentWidth,
      height: rotatedContentHeight,
      boxWidth,
      contentWidth,
      contentHeight,
      rawContentWidth,
      rawContentHeight,
      visualPadding,
    };
  };

  const clampLayerPosition = (position, layer, metrics = getLayerMetrics(layer)) => {
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const fallbackBounds = layer?.type === "text" ? { min: 8, max: 92 } : { min: 0, max: 100 };

    if (!metrics) {
      return {
        x: clamp(position.x, fallbackBounds.min, fallbackBounds.max),
        y: clamp(position.y, fallbackBounds.min, fallbackBounds.max),
      };
    }

    const clampWidth = metrics.clampWidth ?? metrics.width;
    const minX = (clampWidth / 2 / metrics.areaWidth) * 100;
    const maxX = 100 - minX;
    const clampHeight = metrics.clampHeight ?? metrics.height;
    const minY = (clampHeight / 2 / metrics.areaHeight) * 100;
    const maxY = 100 - minY;

    return {
      x: minX > maxX ? 50 : clamp(position.x, minX, maxX),
      y: minY > maxY ? 50 : clamp(position.y, minY, maxY),
    };
  };

  const getLayerSnapBoundsPx = (layer, metrics, centerXPx, centerYPx) => {
    if (!metrics?.width || !metrics?.height) {
      return {
        left: centerXPx,
        right: centerXPx,
        top: centerYPx,
        bottom: centerYPx,
        width: 0,
        height: 0,
      };
    }

    const boundWidth = metrics.clampWidth ?? metrics.width;
    const boundHeight = metrics.clampHeight ?? metrics.height;
    const top = centerYPx - (boundHeight / 2);
    const bottom = centerYPx + (boundHeight / 2);
    return {
      left: centerXPx - (boundWidth / 2),
      right: centerXPx + (boundWidth / 2),
      top,
      bottom,
      width: boundWidth,
      height: boundHeight,
    };
  };

  const getTabByLayerType = (layerType) => {
    if (layerType === "upload") return "upload";
    if (layerType === "text") return "text";
    if (layerType === "shape") return "shapes";
    return null;
  };

  const applySelectionState = (nextIds, nextActiveId = null) => {
    const normalizedIds = Array.from(new Set((nextIds || []).filter(Boolean)));
    setSelectedLayerIds(normalizedIds);
    setActiveLayerId(nextActiveId ?? normalizedIds[normalizedIds.length - 1] ?? null);

    const editingId = nextActiveId ?? normalizedIds[normalizedIds.length - 1] ?? null;
    const editingLayer = layers.find((layer) => layer.id === editingId) || null;
    if (normalizedIds.length !== 1 || editingLayer?.type !== "text") {
      setEditingTextLayerId(null);
    }
  };

  const selectLayer = (layerId, options = {}) => {
    if (!layerId) {
      applySelectionState([], null);
      return;
    }

    const nextLayer = layers.find((layer) => layer.id === layerId) || null;
    if (!nextLayer) return;

    const resolvedSide = getLayerSide(nextLayer);
    const currentScopedSelection = selectedLayerIds.filter((selectedId) => {
      const selectedLayer = layers.find((layer) => layer.id === selectedId);
      return selectedLayer && getLayerSide(selectedLayer) === resolvedSide;
    });

    if (options.toggle) {
      const exists = currentScopedSelection.includes(layerId);
      const nextIds = exists
        ? currentScopedSelection.filter((id) => id !== layerId)
        : [...currentScopedSelection, layerId];
      applySelectionState(nextIds, exists ? nextIds[nextIds.length - 1] ?? null : layerId);
      return;
    }

    if (options.append) {
      const nextIds = currentScopedSelection.includes(layerId)
        ? currentScopedSelection
        : [...currentScopedSelection, layerId];
      applySelectionState(nextIds, layerId);
      return;
    }

    applySelectionState([layerId], layerId);
  };

  const selectLayerIds = (layerIds, options = {}) => {
    const filteredIds = (layerIds || []).filter((id) => layers.some((layer) => layer.id === id));
    if (!filteredIds.length) {
      if (!options.preserveExisting) applySelectionState([], null);
      return;
    }

    const resolvedSide = getLayerSide(layers.find((layer) => layer.id === filteredIds[0]));
    const scopedIds = filteredIds.filter((id) => {
      const layer = layers.find((item) => item.id === id);
      return layer && getLayerSide(layer) === resolvedSide;
    });

    if (options.append) {
      const currentScopedSelection = selectedLayerIds.filter((selectedId) => {
        const selectedLayer = layers.find((layer) => layer.id === selectedId);
        return selectedLayer && getLayerSide(selectedLayer) === resolvedSide;
      });
      applySelectionState([...currentScopedSelection, ...scopedIds], scopedIds[scopedIds.length - 1] || currentScopedSelection[currentScopedSelection.length - 1] || null);
      return;
    }

    applySelectionState(scopedIds, scopedIds[scopedIds.length - 1] || null);
  };

  const openLayerEditor = (layerId) => {
    const nextLayer = layers.find((layer) => layer.id === layerId) || null;
    if (!nextLayer) return;

    applySelectionState([layerId], layerId);

    const nextTab = getTabByLayerType(nextLayer.type);
    if (nextTab) {
      setActiveTab(nextTab);
    }

    if (nextLayer.type === "text") {
      setEditingTextLayerId(layerId);
      return;
    }

    setEditingTextLayerId(null);
  };

  const focusLayer = (layerId) => {
    openLayerEditor(layerId);
  };

  const handleProductChange = (nextProductKey) => {
    const nextProduct = products.find((item) => item.key === nextProductKey);
    if (!nextProduct) return;
    pushHistoryCheckpoint();
    const previousSize = size;
    const nextDefaultSize = getPreferredProductSize(nextProduct);
    setProductKey(nextProductKey);
    setSizeState(nextDefaultSize);
    if (previousSize !== nextDefaultSize) {
      setLayers((currentLayers) => currentLayers.map((layer) => normalizeLayerForSizeChange(layer, previousSize, nextDefaultSize)));
    }
    if (!nextProduct.colors.includes(resolvedColor)) {
      setColor(nextProduct.colors[0]);
    }
  };

  const handleSizeChange = (nextSize) => {
    const resolvedNextSize = String(nextSize || "").trim().toUpperCase();
    if (resolvedNextSize === size) return;

    pushHistoryCheckpoint();
    const previousSize = size;
    setSizeState(resolvedNextSize);
    setLayers((currentLayers) => currentLayers.map((layer) => normalizeLayerForSizeChange(layer, previousSize, resolvedNextSize)));
  };

  const handleColorChange = (nextColor) => {
    const nextResolvedColor = nextColor || safeColors[0];
    pushHistoryCheckpoint();
    const previousAutoTextColor = resolvedColor === "Белый" ? "#111111" : "#ffffff";
    setColor(nextResolvedColor);
    setLayers((currentLayers) => currentLayers.map((layer) => {
      if (layer.type !== "text" || layer.textFillMode !== "solid" || layer.color !== previousAutoTextColor) return layer;
      return { ...layer, color: getDefaultTextColor(nextResolvedColor) };
    }));
  };

  const handleUploadChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextUploadedFiles = (await Promise.all(files.map(async (file) => {
      const ext = (file.name || "").split(".").pop().toLowerCase();
      const isPdf = file.type === "application/pdf" || ext === "pdf";
      const isSvg = file.type === "image/svg+xml" || ext === "svg";

      if (isPdf) {
        try {
          const arrayBuf = await file.arrayBuffer();
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          const src = canvas.toDataURL("image/png");
          return {
            id: nextUploadedFileId(),
            src,
            uploadName: file.name,
            width: viewport.width,
            height: viewport.height,
            renderFrame: null,
            sourceType: "pdf",
            originalData: arrayBuf,
          };
        } catch { return null; }
      }

      const src = await readFileAsDataUrl(file);
      const dimensions = await readImageSize(src);
      const renderFrame = await readImageContentBounds(src);

      const baseFile = {
        id: nextUploadedFileId(),
        src,
        uploadName: file.name,
        width: dimensions.width,
        height: dimensions.height,
        renderFrame,
        sourceType: isSvg ? "svg" : "raster",
      };

      if (isSvg) {
        baseFile.originalSvgText = await file.text();
      }

      return baseFile;
    }))).filter(Boolean);

    setUploadedFiles((currentFiles) => [...currentFiles, ...nextUploadedFiles]);
    event.target.value = "";
  };

  const addUploadedFileAsLayer = (uploadedFileId) => {
    const uploadedFile = uploadedFiles.find((file) => file.id === uploadedFileId) || null;
    if (!uploadedFile) return;

    pushHistoryCheckpoint();
    const nextLayer = buildUploadLayer({
      ...uploadedFile,
      renderFrame: null,
    });
    addLayer(nextLayer, "upload");
  };

  const handleUploadScaleChange = (event) => {
    if (!activeUploadLayer) return;
    pushHistoryCheckpoint();
    const nextWidthCm = Number(event.target.value);
    updateLayer(activeUploadLayer.id, (layer) => {
      const currentAspect = (layer.widthCm && layer.heightCm) ? (layer.widthCm / layer.heightCm) : getUploadAspectRatio(layer);
      const { widthCm: maxW, heightCm: maxH } = getPhysicalPrintArea(getLayerSide(layer));
      let w = Math.max(0.1, Math.min(nextWidthCm, maxW));
      let h = Number((w / currentAspect).toFixed(3));
      if (h > maxH) { h = maxH; w = Number((h * currentAspect).toFixed(3)); }
      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      if (rotDeg) {
        const { widthCm: maxW, heightCm: maxH } = getPhysicalPrintArea(getLayerSide(layer));
        const rotRad = (rotDeg * Math.PI) / 180;
        const cosA = Math.abs(Math.cos(rotRad));
        const sinA = Math.abs(Math.sin(rotRad));
        const aabbW = w * cosA + h * sinA;
        const aabbH = w * sinA + h * cosA;
        if (aabbW > maxW || aabbH > maxH) {
          const fitScale = Math.min(maxW / aabbW, maxH / aabbH);
          w = Number((w * fitScale).toFixed(3));
          h = Number((h * fitScale).toFixed(3));
        }
      }
      const dims = { widthCm: w, heightCm: h };
      return {
        ...layer,
        ...dims,
        desiredWidthCm: w,
        desiredHeightCm: h,
        position: clampLayerPosition(layer.position, { ...layer, ...dims }, getLayerMetrics(layer, dims)),
      };
    });
  };

  const setUploadDimensionCm = (axis, value, keepAspect = true) => {
    if (!activeUploadLayer) return;
    pushHistoryCheckpoint();
    const numValue = Math.max(0.1, Number(value) || 0.1);
    updateLayer(activeUploadLayer.id, (layer) => {
      const { widthCm: maxW, heightCm: maxH } = getPhysicalPrintArea(getLayerSide(layer));
      let w, h;
      if (keepAspect) {
        const aspectRatio = getUploadAspectRatio(layer);
        if (axis === "width") {
          w = Math.min(numValue, maxW);
          h = Number((w / aspectRatio).toFixed(3));
          if (h > maxH) { h = maxH; w = Number((h * aspectRatio).toFixed(3)); }
        } else {
          h = Math.min(numValue, maxH);
          w = Number((h * aspectRatio).toFixed(3));
          if (w > maxW) { w = maxW; h = Number((w / aspectRatio).toFixed(3)); }
        }
      } else {
        w = axis === "width" ? Math.min(numValue, maxW) : (layer.widthCm || 1);
        h = axis === "height" ? Math.min(numValue, maxH) : (layer.heightCm || 1);
      }
      const rotDeg = normalizeRotationDeg(layer.rotationDeg ?? 0);
      if (rotDeg) {
        const rotRad = (rotDeg * Math.PI) / 180;
        const cosA = Math.abs(Math.cos(rotRad));
        const sinA = Math.abs(Math.sin(rotRad));
        const aabbW = w * cosA + h * sinA;
        const aabbH = w * sinA + h * cosA;
        if (aabbW > maxW || aabbH > maxH) {
          const fitScale = Math.min(maxW / aabbW, maxH / aabbH);
          w = Number((w * fitScale).toFixed(3));
          h = Number((h * fitScale).toFixed(3));
        }
      }
      const dims = { widthCm: w, heightCm: h };
      return {
        ...layer,
        ...dims,
        desiredWidthCm: w,
        desiredHeightCm: h,
        position: clampLayerPosition(layer.position, { ...layer, ...dims }, getLayerMetrics(layer, dims)),
      };
    });
  };

  const fitUniformLayerToArea = (layer, requestedWidthCm, requestedHeightCm) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(layer));
    const safeWidth = Math.max(0.2, Number(requestedWidthCm) || layer.widthCm || 0.2);
    const safeHeight = Math.max(0.2, Number(requestedHeightCm) || layer.heightCm || 0.2);
    const ratio = Math.min(maxWidthCm / safeWidth, maxHeightCm / safeHeight, 1);
    return {
      widthCm: Number((safeWidth * ratio).toFixed(3)),
      heightCm: Number((safeHeight * ratio).toFixed(3)),
    };
  };

  const fitUniformLayerToAreaForSize = (layer, requestedWidthCm, requestedHeightCm, targetSize) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(layer), targetSize);
    const safeWidth = Math.max(0.2, Number(requestedWidthCm) || layer.widthCm || 0.2);
    const safeHeight = Math.max(0.2, Number(requestedHeightCm) || layer.heightCm || 0.2);
    const ratio = Math.min(maxWidthCm / safeWidth, maxHeightCm / safeHeight, 1);
    return {
      widthCm: Number((safeWidth * ratio).toFixed(3)),
      heightCm: Number((safeHeight * ratio).toFixed(3)),
    };
  };

  const normalizeLayerForSizeChange = (layer, previousSize, nextSize) => {
    const layerSide = getLayerSide(layer);
    const previousArea = getPhysicalPrintArea(layerSide, previousSize);
    const nextArea = getPhysicalPrintArea(layerSide, nextSize);
    const widthRatio = nextArea.widthCm / Math.max(0.001, previousArea.widthCm || 1);
    const heightRatio = nextArea.heightCm / Math.max(0.001, previousArea.heightCm || 1);

    if (layer.type === "upload") {
      const fitted = fitUniformLayerToAreaForSize(
        layer,
        (Number(layer.widthCm) || 0) * widthRatio,
        (Number(layer.heightCm) || 0) * widthRatio,
        nextSize,
      );
      return {
        ...layer,
        ...fitted,
        desiredWidthCm: fitted.widthCm,
        desiredHeightCm: fitted.heightCm,
      };
    }

    if (layer.type === "shape") {
      if (isLineShapeKey(layer.shapeKey)) {
        const lineDimensions = getStoredLineCanvasDimensions(layer, layerSide);
        return normalizeLineShapeLayer({
          ...layer,
          lineWidthPx: roundCanvasPx(lineDimensions.lineWidthPx * widthRatio),
          lineHeightPx: roundCanvasPx(lineDimensions.lineHeightPx * heightRatio),
        }, layerSide, nextSize);
      }

      const nextDimensions = fitUniformLayerToAreaForSize(
        layer,
        (Number(layer.widthCm) || 0) * widthRatio,
        (Number(layer.heightCm) || 0) * widthRatio,
        nextSize,
      );

      return {
        ...layer,
        widthCm: clampShapeCm(nextDimensions.widthCm, nextArea.widthCm),
        heightCm: clampShapeCm(nextDimensions.heightCm, nextArea.heightCm),
        desiredWidthCm: clampShapeCm(nextDimensions.widthCm, nextArea.widthCm),
        desiredHeightCm: clampShapeCm(nextDimensions.heightCm, nextArea.heightCm),
      };
    }

    if (layer.type === "text") {
      return normalizeTextLayerState(layer, layer);
    }

    return layer;
  };

  const removeUploadedFile = (uploadedFileId) => {
    setUploadedFiles((currentFiles) => currentFiles.filter((file) => file.id !== uploadedFileId));
  };

  const centerActiveLayerPosition = () => {
    if (!activeLayer) return;
    pushHistoryCheckpoint();
    updateLayer(activeLayer.id, { position: getLayerDefaultPosition(activeLayer.type) });
  };

  const getCombinedSnapGuidesPx = (excludeLayerIds, areaWidth, areaHeight) => {
    const guides = getSnapGuidesPx(areaWidth, areaHeight);
    const excludeSet = new Set(Array.isArray(excludeLayerIds) ? excludeLayerIds : [excludeLayerIds].filter(Boolean));

    layers.forEach((layer) => {
      if (!layer.visible || excludeSet.has(layer.id)) return;
      const metrics = getLayerMetrics(layer);
      if (!metrics?.width || !metrics?.height) return;
      const centerXPx = (layer.position.x / 100) * areaWidth;
      const centerYPx = (layer.position.y / 100) * areaHeight;
      const snapBounds = getLayerSnapBoundsPx(layer, metrics, centerXPx, centerYPx);
      guides.vertical.push(snapBounds.left, (snapBounds.left + snapBounds.right) / 2, snapBounds.right);
      guides.horizontal.push(snapBounds.top, (snapBounds.top + snapBounds.bottom) / 2, snapBounds.bottom);
    });

    return guides;
  };

  const handleLayerPointerDown = (layerId, event) => {
    const targetLayer = layers.find((layer) => layer.id === layerId);
    if (!targetLayer) return;

    const scopedSelectedIds = selectedLayerIds.filter((selectedId) => {
      const selectedLayer = layers.find((layer) => layer.id === selectedId);
      return selectedLayer && getLayerSide(selectedLayer) === getLayerSide(targetLayer);
    });
    const moveLayerIds = scopedSelectedIds.includes(layerId) && scopedSelectedIds.length > 1
      ? scopedSelectedIds
      : [layerId];

    applySelectionState(moveLayerIds, layerId);

    if (targetLayer.locked || !printAreaRef.current) return;

    event.preventDefault();

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const startPointer = { x: event.clientX, y: event.clientY };
    let hasDragged = false;

    const rect = printAreaRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const movingLayers = moveLayerIds
      .map((id) => layers.find((layer) => layer.id === id))
      .filter(Boolean)
      .map((layer) => ({
        id: layer.id,
        layer,
        metrics: getLayerMetrics(layer),
        startCenterXPx: (layer.position.x / 100) * rect.width,
        startCenterYPx: (layer.position.y / 100) * rect.height,
      }))
      .filter((item) => item.metrics?.width && item.metrics?.height);

    if (!movingLayers.length) return;

    const movingLayerBounds = movingLayers.map((item) => getLayerSnapBoundsPx(item.layer, item.metrics, item.startCenterXPx, item.startCenterYPx));
    const startGroupLeft = Math.min(...movingLayerBounds.map((bounds) => bounds.left));
    const startGroupTop = Math.min(...movingLayerBounds.map((bounds) => bounds.top));
    const startGroupRight = Math.max(...movingLayerBounds.map((bounds) => bounds.right));
    const startGroupBottom = Math.max(...movingLayerBounds.map((bounds) => bounds.bottom));
    const groupWidth = startGroupRight - startGroupLeft;
    const groupHeight = startGroupBottom - startGroupTop;
    const guides = getCombinedSnapGuidesPx(moveLayerIds, rect.width, rect.height);

    const updatePositions = (clientX, clientY) => {
      const deltaX = clientX - startPointer.x;
      const deltaY = clientY - startPointer.y;

      let nextGroupLeft = clamp(startGroupLeft + deltaX, 0, rect.width - groupWidth);
      let nextGroupTop = clamp(startGroupTop + deltaY, 0, rect.height - groupHeight);

      const snappedX = snapIntervalToGuides(nextGroupLeft, groupWidth, guides.vertical);
      const snappedY = snapIntervalToGuides(nextGroupTop, groupHeight, guides.horizontal);

      nextGroupLeft = clamp(snappedX.startPx, 0, rect.width - groupWidth);
      nextGroupTop = clamp(snappedY.startPx, 0, rect.height - groupHeight);

      const appliedDeltaX = nextGroupLeft - startGroupLeft;
      const appliedDeltaY = nextGroupTop - startGroupTop;

      setActiveSnapGuides([
        ...(snappedX.guide == null ? [] : [{ orientation: "vertical", positionPercent: (snappedX.guide / rect.width) * 100 }]),
        ...(snappedY.guide == null ? [] : [{ orientation: "horizontal", positionPercent: (snappedY.guide / rect.height) * 100 }]),
      ]);

      setLayers((currentLayers) => currentLayers.map((layer) => {
        const movingItem = movingLayers.find((item) => item.id === layer.id);
        if (!movingItem) return layer;

        const nextPosition = clampLayerPosition({
          x: ((movingItem.startCenterXPx + appliedDeltaX) / rect.width) * 100,
          y: ((movingItem.startCenterYPx + appliedDeltaY) / rect.height) * 100,
        }, layer, movingItem.metrics);

        if (layer.position.x === nextPosition.x && layer.position.y === nextPosition.y) return layer;
        return { ...layer, position: nextPosition };
      }));
    };

    node.setPointerCapture?.(pointerId);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;

      const deltaX = moveEvent.clientX - startPointer.x;
      const deltaY = moveEvent.clientY - startPointer.y;
      if (!hasDragged && Math.hypot(deltaX, deltaY) < 4) return;

      moveEvent.preventDefault();

      if (!hasDragged) {
        hasDragged = true;
        pushHistoryCheckpoint();
        setDraggingLayerId(layerId);
      }

      updatePositions(moveEvent.clientX, moveEvent.clientY);
    };

    const stopDragging = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      if (hasDragged) {
        setDraggingLayerId(null);
      }
      setActiveSnapGuides([]);
      node.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  const addTextLayer = () => {
    pushHistoryCheckpoint();
    const nextLayer = buildTextLayer();
    nextLayer.position = getNextAddedLayerPosition(nextLayer);
    addLayer(nextLayer, "text");
    setEditingTextLayerId(nextLayer.id);
  };

  const addShapeLayer = (shapeKey) => {
    pushHistoryCheckpoint();
    const nextLayer = buildShapeLayer(shapeKey ? { shapeKey } : {});
    nextLayer.position = getNextAddedLayerPosition(nextLayer);
    addLayer(nextLayer, "shapes");
  };

  const getSelectedLayersForSide = (targetSide = side) => {
    const resolvedSide = targetSide === "back" ? "back" : "front";
    const selectedIds = selectedLayerIds.filter((id) => {
      const layer = layers.find((item) => item.id === id);
      return layer && getLayerSide(layer) === resolvedSide;
    });
    return selectedIds.map((id) => layers.find((layer) => layer.id === id)).filter(Boolean);
  };

  const removeActiveLayer = () => {
    const selectedLayers = getSelectedLayersForSide(side);
    const removableLayers = selectedLayers.length ? selectedLayers : (rawActiveLayer ? [rawActiveLayer] : []);
    if (!removableLayers.length) return;
    pushHistoryCheckpoint();
    removableLayers.forEach((layer) => removeLayerById(layer.id));
  };

  const removeLayer = (layerId) => {
    if (!layerId) return;
    pushHistoryCheckpoint();
    removeLayerById(layerId);
  };

  const cloneLayerAsNew = (sourceLayer, overrides = {}) => {
    if (!sourceLayer) return null;

    const { id: _sourceId, ...sourceWithoutId } = sourceLayer;
    const { id: _overrideId, ...overrideWithoutId } = overrides;
    const baseLayer = {
      ...sourceWithoutId,
      ...overrideWithoutId,
      isAutoNamed: false,
      side: overrideWithoutId.side || sourceLayer.side,
    };

    if (sourceLayer.type === "text") {
      return buildTextLayer(baseLayer);
    }

    if (sourceLayer.type === "shape") {
      return buildShapeLayer(baseLayer);
    }

    if (sourceLayer.type === "upload") {
      return buildUploadLayer(baseLayer);
    }

    return null;
  };


  const duplicateActiveLayer = () => {
    const selectedLayers = getSelectedLayersForSide(side);
    const sourceLayers = selectedLayers.length ? selectedLayers : (rawActiveLayer ? [rawActiveLayer] : []);
    if (!sourceLayers.length) return;
    pushHistoryCheckpoint();

    const clonedLayers = sourceLayers.map((layer, index) => cloneLayerAsNew(layer, {
      name: `${layer.name} копия`,
      position: clampLayerPosition({ x: layer.position.x + 4 + index * 1.5, y: layer.position.y + 4 + index * 1.5 }, layer),
    })).filter(Boolean);

    if (!clonedLayers.length) return;
    setLayers((currentLayers) => reindexAutoNamedLayers([...currentLayers, ...clonedLayers]));
    applySelectionState(clonedLayers.map((layer) => layer.id), clonedLayers[clonedLayers.length - 1].id);
  };

  const copyActiveLayer = () => {
    const selectedLayers = getSelectedLayersForSide(side);
    const sourceLayers = selectedLayers.length ? selectedLayers : (rawActiveLayer ? [rawActiveLayer] : []);
    if (!sourceLayers.length) return;
    copiedLayerRef.current = clonePlain(sourceLayers);
  };

  const pasteCopiedLayer = () => {
    if (!copiedLayerRef.current) return;
    pushHistoryCheckpoint();
    const sourceLayers = Array.isArray(copiedLayerRef.current) ? copiedLayerRef.current : [copiedLayerRef.current];
    const clonedLayers = sourceLayers.map((sourceLayer, index) => {
      const draftLayer = { ...sourceLayer, side };
      return cloneLayerAsNew(draftLayer, {
        side,
        name: `${sourceLayer.name} копия`,
        position: clampLayerPosition({
          x: (draftLayer.position?.x ?? 50) + 4 + index * 1.5,
          y: (draftLayer.position?.y ?? 50) + 4 + index * 1.5,
        }, draftLayer),
      });
    }).filter(Boolean);
    if (!clonedLayers.length) return;
    setLayers((currentLayers) => reindexAutoNamedLayers([...currentLayers, ...clonedLayers]));
    applySelectionState(clonedLayers.map((layer) => layer.id), clonedLayers[clonedLayers.length - 1].id);
  };

  const moveActiveLayer = (direction) => {
    if (!activeLayer) return;
    pushHistoryCheckpoint();

    setLayers((currentLayers) => {
      const activeSide = getLayerSide(activeLayer);
      const scopedIndexes = currentLayers.reduce((indexes, layer, index) => {
        if (getLayerSide(layer) === activeSide) indexes.push(index);
        return indexes;
      }, []);
      const scopedIndex = scopedIndexes.findIndex((index) => currentLayers[index]?.id === activeLayer.id);
      if (scopedIndex === -1) return currentLayers;

      const nextScopedIndex = direction === "up" ? scopedIndex + 1 : scopedIndex - 1;
      if (nextScopedIndex < 0 || nextScopedIndex >= scopedIndexes.length) return currentLayers;

      const fromIndex = scopedIndexes[scopedIndex];
      const toIndex = scopedIndexes[nextScopedIndex];
      const nextLayers = [...currentLayers];
      const [movedLayer] = nextLayers.splice(fromIndex, 1);
      nextLayers.splice(toIndex, 0, movedLayer);
      return nextLayers;
    });
  };

  const reorderLayers = (nextLayerIds, targetSide = side) => {
    if (!Array.isArray(nextLayerIds) || !nextLayerIds.length) return;
    pushHistoryCheckpoint();

    setLayers((currentLayers) => {
      const resolvedSide = targetSide === "back" ? "back" : "front";
      const scopedLayers = currentLayers.filter((layer) => getLayerSide(layer) === resolvedSide);
      if (nextLayerIds.length !== scopedLayers.length) return currentLayers;

      const layerMap = new Map(scopedLayers.map((layer) => [layer.id, layer]));
      const nextScopedLayers = nextLayerIds.map((layerId) => layerMap.get(layerId)).filter(Boolean);

      if (nextScopedLayers.length !== scopedLayers.length) return currentLayers;
      if (nextScopedLayers.every((layer, index) => layer.id === scopedLayers[index].id)) return currentLayers;

      let scopedIndex = 0;
      return currentLayers.map((layer) => {
        if (getLayerSide(layer) !== resolvedSide) return layer;
        const nextLayer = nextScopedLayers[scopedIndex];
        scopedIndex += 1;
        return nextLayer;
      });
    });
  };

  const toggleLayerVisibility = (layerId) => {
    pushHistoryCheckpoint();
    updateLayer(layerId, (layer) => ({ ...layer, visible: !layer.visible }));
  };

  const toggleLayerLock = (layerId) => {
    pushHistoryCheckpoint();
    updateLayer(layerId, (layer) => ({ ...layer, locked: !layer.locked }));
  };

  const normalizeTextLayerState = (candidateLayer, previousLayer = candidateLayer) => {
    const nextLayer = { ...candidateLayer };
    nextLayer.scaleX = Number(Math.min(6, Math.max(0.2, nextLayer.scaleX ?? previousLayer.scaleX ?? 1)).toFixed(3));
    nextLayer.scaleY = Number(Math.min(6, Math.max(0.2, nextLayer.scaleY ?? previousLayer.scaleY ?? 1)).toFixed(3));
    nextLayer.size = Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, Number(nextLayer.size ?? previousLayer.size ?? 36)));
    nextLayer.textBoxWidth = Math.min(100, Math.max(MIN_TEXT_BOX_WIDTH_PERCENT, Number(nextLayer.textBoxWidth ?? previousLayer.textBoxWidth ?? DEFAULT_TEXT_BOX_WIDTH)));
    nextLayer.lineHeight = Math.min(2, Math.max(0.5, Number(nextLayer.lineHeight ?? previousLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT)));
    nextLayer.letterSpacing = Number(Math.min(30, Math.max(-8, Number(nextLayer.letterSpacing ?? previousLayer.letterSpacing ?? 1))).toFixed(2));
    nextLayer.strokeWidth = Number(Math.min(30, Math.max(0, Number(nextLayer.strokeWidth ?? previousLayer.strokeWidth ?? 0))).toFixed(2));
    nextLayer.shadowOffsetX = Number(Math.min(24, Math.max(-24, Number(nextLayer.shadowOffsetX ?? previousLayer.shadowOffsetX ?? 0))).toFixed(2));
    nextLayer.shadowOffsetY = Number(Math.min(24, Math.max(-24, Number(nextLayer.shadowOffsetY ?? previousLayer.shadowOffsetY ?? 2))).toFixed(2));
    nextLayer.shadowBlur = Number(Math.min(32, Math.max(0, Number(nextLayer.shadowBlur ?? previousLayer.shadowBlur ?? 14))).toFixed(2));
    nextLayer.scaleX = 1;
    nextLayer.scaleY = 1;
    nextLayer.position = clampLayerPosition(nextLayer.position ?? previousLayer.position, nextLayer, getLayerMetrics(nextLayer));
    return nextLayer;
  };

  const applyLayerResize = (layerId, patch) => {
    if (!layerId || !patch) return;

    updateLayer(layerId, (layer) => {
      const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(layer));
      const nextLayer = { ...layer, ...patch };

      const isRotationOnly = patch.rotationDeg != null && patch.widthCm == null && patch.heightCm == null;
      const isResizableLayer = (nextLayer.type === "upload" || (nextLayer.type === "shape" && !isLineShapeKey(nextLayer.shapeKey)));

      if (isRotationOnly && isResizableLayer) {
        const desiredW = nextLayer.desiredWidthCm ?? nextLayer.widthCm;
        const desiredH = nextLayer.desiredHeightCm ?? nextLayer.heightCm;
        const rotRad = (normalizeRotationDeg(nextLayer.rotationDeg) * Math.PI) / 180;
        const cosA = Math.abs(Math.cos(rotRad));
        const sinA = Math.abs(Math.sin(rotRad));
        const aabbW = desiredW * cosA + desiredH * sinA;
        const aabbH = desiredW * sinA + desiredH * cosA;
        const scale = Math.min(maxWidthCm / aabbW, maxHeightCm / aabbH, 1);
        nextLayer.widthCm = Number((desiredW * scale).toFixed(3));
        nextLayer.heightCm = Number((desiredH * scale).toFixed(3));
        nextLayer.desiredWidthCm = desiredW;
        nextLayer.desiredHeightCm = desiredH;
        if (nextLayer.type === "shape") {
          nextLayer.lineWidthPx = null;
          nextLayer.lineHeightPx = null;
        }
        nextLayer.position = clampLayerPosition(nextLayer.position ?? layer.position, nextLayer, getLayerMetrics(nextLayer));
        return nextLayer;
      }

      if (nextLayer.type === "upload" || nextLayer.type === "shape") {
        if (nextLayer.type === "upload" && patch.widthCm != null && patch.heightCm != null) {
          const fitted = fitUniformLayerToArea(nextLayer, nextLayer.widthCm, nextLayer.heightCm);
          nextLayer.widthCm = fitted.widthCm;
          nextLayer.heightCm = fitted.heightCm;
          nextLayer.desiredWidthCm = fitted.widthCm;
          nextLayer.desiredHeightCm = fitted.heightCm;
        } else if (nextLayer.type === "shape") {
          if (isLineShapeKey(nextLayer.shapeKey)) {
            const normalizedLineLayer = normalizeLineShapeLayer(nextLayer, getLayerSide(nextLayer));
            nextLayer.lineWidthPx = normalizedLineLayer.lineWidthPx;
            nextLayer.lineHeightPx = normalizedLineLayer.lineHeightPx;
            nextLayer.widthCm = normalizedLineLayer.widthCm;
            nextLayer.heightCm = normalizedLineLayer.heightCm;
          } else {
            nextLayer.lineWidthPx = null;
            nextLayer.lineHeightPx = null;
            nextLayer.widthCm = clampShapeCm(nextLayer.widthCm ?? layer.widthCm ?? 1, maxWidthCm);
            nextLayer.heightCm = clampShapeCm(nextLayer.heightCm ?? layer.heightCm ?? 1, maxHeightCm);
            if (patch.widthCm != null || patch.heightCm != null) {
              nextLayer.desiredWidthCm = nextLayer.widthCm;
              nextLayer.desiredHeightCm = nextLayer.heightCm;
            }
          }
        } else {
          nextLayer.widthCm = clampCm(nextLayer.widthCm ?? layer.widthCm ?? 1, maxWidthCm);
          nextLayer.heightCm = clampCm(nextLayer.heightCm ?? layer.heightCm ?? 1, maxHeightCm);
          if (patch.widthCm != null || patch.heightCm != null) {
            nextLayer.desiredWidthCm = nextLayer.widthCm;
            nextLayer.desiredHeightCm = nextLayer.heightCm;
          }
        }

        const resizeRotDeg = normalizeRotationDeg(nextLayer.rotationDeg ?? 0);
        if (resizeRotDeg && isResizableLayer) {
          const rotRad = (resizeRotDeg * Math.PI) / 180;
          const cosA = Math.abs(Math.cos(rotRad));
          const sinA = Math.abs(Math.sin(rotRad));
          const aabbW = nextLayer.widthCm * cosA + nextLayer.heightCm * sinA;
          const aabbH = nextLayer.widthCm * sinA + nextLayer.heightCm * cosA;
          if (aabbW > maxWidthCm || aabbH > maxHeightCm) {
            const fitScale = Math.min(maxWidthCm / aabbW, maxHeightCm / aabbH);
            nextLayer.widthCm = Number((nextLayer.widthCm * fitScale).toFixed(3));
            nextLayer.heightCm = Number((nextLayer.heightCm * fitScale).toFixed(3));
            nextLayer.desiredWidthCm = nextLayer.widthCm;
            nextLayer.desiredHeightCm = nextLayer.heightCm;
          }
        }
      }

      if (nextLayer.type === "text") {
        return normalizeTextLayerState(nextLayer, layer);
      }

      if (nextLayer.type === "shape" && isLineShapeKey(nextLayer.shapeKey)) {
        return nextLayer;
      }

      nextLayer.position = clampLayerPosition(nextLayer.position ?? layer.position, nextLayer, getLayerMetrics(nextLayer));
      return nextLayer;
    });
  };

  const updateActiveTextLayer = (patch) => {
    if (!activeTextLayer) return;
    updateLayer(activeTextLayer.id, (layer) => {
      const nextLayer = typeof patch === "function"
        ? patch(layer)
        : { ...layer, ...patch };

      return normalizeTextLayerState(nextLayer, layer);
    });
  };

  const updateActiveShapeLayer = (patch) => {
    if (!activeShapeLayer) return;
    updateLayer(activeShapeLayer.id, (layer) => {
      if (typeof patch === "function") {
        return patch(layer);
      }

      return { ...layer, ...patch };
    });
  };

  const setTextValue = (nextValue) => {
    if (!activeTextLayer) return;

    const normalizedValue = String(nextValue).replace(/\r/g, "");
    updateLayer(activeTextLayer.id, { value: normalizedValue });
  };
  const setTextSize = (nextSize) => {
    if (!activeTextLayer) return;

    const clampedSize = Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, Number(nextSize)));
    pushHistoryCheckpoint();
    updateActiveTextLayer({ size: clampedSize });
  };
  const setTextColor = (nextColor) => { pushHistoryCheckpoint(); updateActiveTextLayer({ textFillMode: "solid", color: nextColor }); };
  const setTextGradientKey = (nextGradientKey) => {
    const nextGradient = getConstructorTextGradient(nextGradientKey);
    pushHistoryCheckpoint();
    updateActiveTextLayer({ textFillMode: "gradient", gradientKey: nextGradient.key });
  };
  const setTextWeight = (nextWeight) => {
    if (!activeTextLayer || !activeTextFont.supportsBold) return;

    const minWeight = activeTextFont.regularWeight ?? 400;
    const maxWeight = activeTextFont.boldWeight ?? nextWeight;
    pushHistoryCheckpoint();
    updateActiveTextLayer({ weight: Math.min(maxWeight, Math.max(minWeight, Number(nextWeight))) });
  };
  const setTextItalic = (nextItalic) => {
    if (!activeTextLayer || !activeTextFont.supportsItalic) return;
    pushHistoryCheckpoint();
    updateActiveTextLayer({ italic: nextItalic });
  };
  const setTextUnderline = (nextUnderline) => { pushHistoryCheckpoint(); updateActiveTextLayer({ underline: nextUnderline }); };
  const setTextStrikethrough = (nextStrikethrough) => { pushHistoryCheckpoint(); updateActiveTextLayer({ strikethrough: nextStrikethrough }); };
  const setTextUppercase = (nextUppercase) => { pushHistoryCheckpoint(); updateActiveTextLayer({ uppercase: nextUppercase }); };
  const setTextFontKey = (nextFontKey) => {
    const nextFont = getConstructorTextFont(nextFontKey);
    pushHistoryCheckpoint();
    updateActiveTextLayer((layer) => ({
      ...layer,
      fontKey: nextFont.key,
      fontFamily: nextFont.family,
      fontLabel: nextFont.label,
      weight: nextFont.supportsBold
        ? (isTextBold(layer) ? (nextFont.boldWeight ?? layer.weight) : (nextFont.regularWeight ?? layer.weight))
        : (nextFont.regularWeight ?? 400),
      italic: nextFont.supportsItalic ? layer.italic : false,
    }));
  };
  const setTextBoxWidth = (nextTextBoxWidth) => { pushHistoryCheckpoint(); updateActiveTextLayer({ textBoxWidth: Math.min(100, Math.max(MIN_TEXT_BOX_WIDTH_PERCENT, Number(nextTextBoxWidth))) }); };
  const setTextLineHeight = (nextLineHeight) => { pushHistoryCheckpoint(); updateActiveTextLayer({ lineHeight: Math.min(2, Math.max(0.5, Number(nextLineHeight.toFixed(2)))) }); };
  const setTextLetterSpacing = (nextLetterSpacing) => { pushHistoryCheckpoint(); updateActiveTextLayer({ letterSpacing: nextLetterSpacing }); };
  const setTextAlign = (nextTextAlign) => { pushHistoryCheckpoint(); updateActiveTextLayer({ textAlign: nextTextAlign }); };
  const setTextStrokeWidth = (nextStrokeWidth) => { pushHistoryCheckpoint(); updateActiveTextLayer({ strokeWidth: Math.min(30, Math.max(0, Number(nextStrokeWidth))) }); };
  const setTextStrokeColor = (nextStrokeColor) => { pushHistoryCheckpoint(); updateActiveTextLayer({ strokeColor: nextStrokeColor }); };
  const setTextShadowEnabled = (nextShadowEnabled) => { pushHistoryCheckpoint(); updateActiveTextLayer({ shadowEnabled: nextShadowEnabled, shadowMode: "soft" }); };
  const setTextShadowColor = (nextShadowColor) => { pushHistoryCheckpoint(); updateActiveTextLayer({ shadowColor: nextShadowColor }); };
  const setTextShadowOffsetX = (nextShadowOffsetX) => { pushHistoryCheckpoint(); updateActiveTextLayer({ shadowOffsetX: Math.min(24, Math.max(-24, Math.round(nextShadowOffsetX))) }); };
  const setTextShadowOffsetY = (nextShadowOffsetY) => { pushHistoryCheckpoint(); updateActiveTextLayer({ shadowOffsetY: Math.min(24, Math.max(-24, Math.round(nextShadowOffsetY))) }); };
  const setTextShadowBlur = (nextShadowBlur) => { pushHistoryCheckpoint(); updateActiveTextLayer({ shadowBlur: Math.min(32, Math.max(0, Math.round(nextShadowBlur))) }); };
  const setShapeKey = (nextShapeKey) => {
    if (!activeShapeLayer) return;
    pushHistoryCheckpoint();
    const resolvedShapeKey = getConstructorShape(nextShapeKey).key;
    const nextDefaultStrokeStyle = getDefaultShapeStrokeStyle(resolvedShapeKey);
    updateActiveShapeLayer((layer) => {
      const layerSide = getLayerSide(layer);
      const nextStrokeWidth = isLineShapeKey(resolvedShapeKey)
        ? (isLineShapeKey(layer.shapeKey) ? Math.max(1, Number(layer.strokeWidth) || DEFAULT_LINE_STROKE_WIDTH) : DEFAULT_LINE_STROKE_WIDTH)
        : Math.max(1, Number(layer.strokeWidth) || DEFAULT_SHAPE_STROKE_WIDTH);

      if (isLineShapeKey(resolvedShapeKey)) {
        const nextLineWidthPx = isLineShapeKey(layer.shapeKey)
          ? getLineCanvasDimensions(layer, layerSide).lineWidthPx
          : clampLineWidthPx(convertCmToCanvasPx(layer.widthCm ?? activeShapeLayer.widthCm ?? 12), layerSide);

        return normalizeLineShapeLayer({
          ...layer,
          shapeKey: resolvedShapeKey,
          strokeStyle: nextDefaultStrokeStyle,
          strokeWidth: nextStrokeWidth,
          lineWidthPx: nextLineWidthPx,
          lineHeightPx: getLineHeightPxFromStrokeWidth(nextStrokeWidth, layerSide),
        }, layerSide);
      }

      return {
        ...layer,
        shapeKey: resolvedShapeKey,
        strokeStyle: nextDefaultStrokeStyle,
        strokeWidth: nextStrokeWidth,
        lineWidthPx: null,
        lineHeightPx: null,
        ...getShapeDimensionsFromWidthCm(resolvedShapeKey, layer.widthCm ?? activeShapeLayer.widthCm ?? 12, layerSide),
      };
    });
  };
  const setShapeColor = (nextColor) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ fillMode: "solid", color: nextColor }); };
  const setShapeGradientKey = (nextGradientKey) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ fillMode: "gradient", gradientKey: getConstructorTextGradient(nextGradientKey).key }); };
  const setShapeStrokeStyle = (nextStrokeStyle) => {
    pushHistoryCheckpoint();
    updateActiveShapeLayer((layer) => ({
      ...layer,
      strokeStyle: nextStrokeStyle,
      strokeWidth: nextStrokeStyle === "none"
        ? layer.strokeWidth ?? (isLineShapeKey(layer.shapeKey) ? DEFAULT_LINE_STROKE_WIDTH : DEFAULT_SHAPE_STROKE_WIDTH)
        : Math.max(1, layer.strokeWidth ?? (isLineShapeKey(layer.shapeKey) ? DEFAULT_LINE_STROKE_WIDTH : DEFAULT_SHAPE_STROKE_WIDTH)),
    }));
  };
  const setShapeStrokeWidth = (nextStrokeWidth) => {
    if (!activeShapeLayer) return;
    pushHistoryCheckpoint();
    const maxStrokeWidth = isLineShapeKey(activeShapeLayer.shapeKey) ? MAX_LINE_STROKE_WIDTH : MAX_SHAPE_STROKE_WIDTH;
    const resolvedStrokeWidth = Math.min(maxStrokeWidth, Math.max(1, Number(nextStrokeWidth)));
    updateActiveShapeLayer((layer) => {
      if (!isLineShapeKey(layer.shapeKey)) {
        return {
          ...layer,
          strokeWidth: resolvedStrokeWidth,
        };
      }

      return normalizeLineShapeLayer({
        ...layer,
        strokeWidth: resolvedStrokeWidth,
        lineHeightPx: getLineHeightPxFromStrokeWidth(resolvedStrokeWidth, getLayerSide(layer)),
      }, getLayerSide(layer));
    });
  };
  const setShapeStrokeColor = (nextStrokeColor) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ strokeColor: nextStrokeColor }); };
  const setShapeEffectType = (nextEffectType) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ effectType: nextEffectType }); };
  const setShapeEffectAngle = (nextEffectAngle) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ effectAngle: Math.min(180, Math.max(-180, Math.round(nextEffectAngle))) }); };
  const setShapeEffectDistance = (nextEffectDistance) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ effectDistance: Math.min(40, Math.max(0, Math.round(nextEffectDistance))) }); };
  const setShapeEffectColor = (nextEffectColor) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ effectColor: nextEffectColor }); };
  const setShapeDistortionColorA = (nextColor) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ distortionColorA: nextColor }); };
  const setShapeDistortionColorB = (nextColor) => { pushHistoryCheckpoint(); updateActiveShapeLayer({ distortionColorB: nextColor }); };
  const setShapeCornerRoundness = (nextCornerRoundness) => {
    pushHistoryCheckpoint();
    updateActiveShapeLayer({ cornerRoundness: Math.min(100, Math.max(0, Math.round(nextCornerRoundness))) });
  };
  const setShapeWidthCm = (nextWidthCm) => {
    if (!activeShapeLayer) return;
    pushHistoryCheckpoint();
    updateLayer(activeShapeLayer.id, (layer) => {
      const layerSide = getLayerSide(layer);
      let nextLayer;
      if (isLineShapeKey(layer.shapeKey)) {
        nextLayer = normalizeLineShapeLayer({
          ...layer,
          lineWidthPx: clampLineWidthPx(convertCmToCanvasPx(nextWidthCm), layerSide),
        }, layerSide);
      } else {
        const currentAspect = (layer.widthCm && layer.heightCm) ? (layer.widthCm / layer.heightCm) : getShapeIntrinsicAspectRatio(layer.shapeKey);
        const { widthCm: maxW, heightCm: maxH } = getPhysicalPrintArea(layerSide);
        let w = Math.max(0.1, Math.min(nextWidthCm, maxW));
        let h = Number((w / currentAspect).toFixed(3));
        if (h > maxH) { h = maxH; w = Number((h * currentAspect).toFixed(3)); }
        nextLayer = { ...layer, widthCm: w, heightCm: h };
      }

      if (!isLineShapeKey(layer.shapeKey)) {
        const rotDeg = normalizeRotationDeg(nextLayer.rotationDeg ?? 0);
        if (rotDeg) {
          const { widthCm: maxW, heightCm: maxH } = getPhysicalPrintArea(layerSide);
          const rotRad = (rotDeg * Math.PI) / 180;
          const cosA = Math.abs(Math.cos(rotRad));
          const sinA = Math.abs(Math.sin(rotRad));
          const aabbW = nextLayer.widthCm * cosA + nextLayer.heightCm * sinA;
          const aabbH = nextLayer.widthCm * sinA + nextLayer.heightCm * cosA;
          if (aabbW > maxW || aabbH > maxH) {
            const fitScale = Math.min(maxW / aabbW, maxH / aabbH);
            nextLayer.widthCm = Number((nextLayer.widthCm * fitScale).toFixed(3));
            nextLayer.heightCm = Number((nextLayer.heightCm * fitScale).toFixed(3));
          }
        }
        nextLayer.desiredWidthCm = nextLayer.widthCm;
        nextLayer.desiredHeightCm = nextLayer.heightCm;
      }

      return {
        ...nextLayer,
        position: clampLayerPosition(layer.position, nextLayer, getLayerMetrics(layer, nextLayer)),
      };
    });
  };

  // Новый универсальный метод для ручного ввода ширины/высоты фигуры/линии с замком пропорций
  const setShapeDimensionCm = (axis, value, keepAspect = true) => {
    if (!activeShapeLayer) return;
    pushHistoryCheckpoint();
    const numValue = Math.max(0.1, Number(value) || 0.1);
    updateLayer(activeShapeLayer.id, (layer) => {
      const layerSide = getLayerSide(layer);
      let w = layer.widthCm || 1;
      let h = layer.heightCm || 1;
      if (keepAspect) {
        const aspectRatio = w / h;
        if (axis === "width") {
          w = Math.min(numValue, getPhysicalPrintArea(layerSide).widthCm);
          h = Number((w / aspectRatio).toFixed(3));
          if (h > getPhysicalPrintArea(layerSide).heightCm) {
            h = getPhysicalPrintArea(layerSide).heightCm;
            w = Number((h * aspectRatio).toFixed(3));
          }
        } else {
          h = Math.min(numValue, getPhysicalPrintArea(layerSide).heightCm);
          w = Number((h * aspectRatio).toFixed(3));
          if (w > getPhysicalPrintArea(layerSide).widthCm) {
            w = getPhysicalPrintArea(layerSide).widthCm;
            h = Number((w / aspectRatio).toFixed(3));
          }
        }
      } else {
        w = axis === "width" ? Math.min(numValue, getPhysicalPrintArea(layerSide).widthCm) : w;
        h = axis === "height" ? Math.min(numValue, getPhysicalPrintArea(layerSide).heightCm) : h;
      }
      // Для линий пересчитываем lineWidthPx
      let nextLayer;
      if (isLineShapeKey(layer.shapeKey)) {
        nextLayer = normalizeLineShapeLayer({
          ...layer,
          lineWidthPx: clampLineWidthPx(convertCmToCanvasPx(w), layerSide),
        }, layerSide);
      } else if (keepAspect) {
        nextLayer = {
          ...layer,
          ...getShapeDimensionsFromWidthCm(activeShapeLayer.shapeKey, w, layerSide),
        };
      } else {
        nextLayer = {
          ...layer,
          widthCm: w,
          heightCm: h,
        };
      }
      // Корректировка для поворота
      if (!isLineShapeKey(layer.shapeKey)) {
        const rotDeg = normalizeRotationDeg(nextLayer.rotationDeg ?? 0);
        if (rotDeg) {
          const { widthCm: maxW, heightCm: maxH } = getPhysicalPrintArea(layerSide);
          const rotRad = (rotDeg * Math.PI) / 180;
          const cosA = Math.abs(Math.cos(rotRad));
          const sinA = Math.abs(Math.sin(rotRad));
          const aabbW = nextLayer.widthCm * cosA + nextLayer.heightCm * sinA;
          const aabbH = nextLayer.widthCm * sinA + nextLayer.heightCm * cosA;
          if (aabbW > maxW || aabbH > maxH) {
            const fitScale = Math.min(maxW / aabbW, maxH / aabbH);
            nextLayer.widthCm = Number((nextLayer.widthCm * fitScale).toFixed(3));
            nextLayer.heightCm = Number((nextLayer.heightCm * fitScale).toFixed(3));
          }
        }
        nextLayer.desiredWidthCm = nextLayer.widthCm;
        nextLayer.desiredHeightCm = nextLayer.heightCm;
      }
      return {
        ...nextLayer,
        position: clampLayerPosition(layer.position, nextLayer, getLayerMetrics(layer, nextLayer)),
      };
    });
  };

  const telegramLink = buildTelegramLink(currentOrderLines);
  const activeShapeDimensionsCm = activeShapeLayer && isLineShapeKey(activeShapeLayer.shapeKey)
    ? getLineDimensionsCmFromPx(activeShapeLayer, getStoredLineCanvasDimensions(activeShapeLayer, getLayerSide(activeShapeLayer)), getLayerSide(activeShapeLayer))
    : {
      widthCm: activeShapeLayer?.widthCm || 16,
      heightCm: activeShapeLayer?.heightCm || 16,
    };
  const activeShapeVisualMetricsCm = (() => {
    if (!activeShapeLayer) return null;

    return getShapeVisualMetricsCm(activeShapeLayer, getLayerSide(activeShapeLayer));
  })();

  const resetConstructor = () => {
    clearConstructorMeta();
    clearImages();
    setActiveTab("textile");
    setProductKey(initialProduct.key || "");
    setSide("front");
    setColor(initialProduct.colors?.[0] || "Чёрный");
    setSizeState(initialSize);
    setQty(1);
    setUploadedFiles([]);
    setLayers([]);
    setActiveLayerId(null);
    setSelectedLayerIds([]);
    setEditingTextLayerId(null);
    layerIdRef.current = 0;
    uploadedFileIdRef.current = 0;
    historyPastRef.current = [];
    historyFutureRef.current = [];
    lastHistorySnapshotRef.current = null;
  };

  return {
    activeTab,
    setActiveTab,
    productKey,
    side,
    setSide: handleSideChange,
    color: resolvedColor,
    size,
    setSize: handleSizeChange,
    qty,
    setQty,
    layers,
    uploadedFiles,
    sideLayers,
    activeLayer,
    activeLayerId,
    selectedLayerIds: selectedSideLayerIds,
    isMultiSelection,
    activeUploadLayer,
    activeTextLayer,
    activeShapeLayer,
    draggingLayerId,
    activeSnapGuides,
    setActiveSnapGuides,
    getCombinedSnapGuidesPx,
    editingTextLayerId,
    textValue: activeTextLayer?.value || "",
    setTextValue,
    textSize: activeTextLayer?.size || 36,
    setTextSize,
    minTextFontSize: MIN_TEXT_FONT_SIZE,
    maxTextFontSize: MAX_TEXT_FONT_SIZE,
    textFillMode: activeTextLayer?.textFillMode || "solid",
    textColor: activeTextLayer?.color || getDefaultTextColor(),
    setTextColor,
    textGradientKey: activeTextLayer?.gradientKey || DEFAULT_TEXT_GRADIENT.key,
    setTextGradientKey,
    textWeight: activeTextLayer?.weight ?? (activeTextFont.regularWeight ?? 400),
    setTextWeight,
    textItalic: activeTextLayer?.italic ?? false,
    setTextItalic,
    textFontSupportsBold: activeTextFont.supportsBold ?? false,
    textFontSupportsItalic: activeTextFont.supportsItalic ?? false,
    textRegularWeight: activeTextFont.regularWeight ?? 400,
    textBoldWeight: activeTextFont.boldWeight ?? (activeTextFont.regularWeight ?? 400),
    textUnderline: activeTextLayer?.underline ?? false,
    setTextUnderline,
    textStrikethrough: activeTextLayer?.strikethrough ?? false,
    setTextStrikethrough,
    textUppercase: activeTextLayer?.uppercase ?? false,
    setTextUppercase,
    textFontKey: activeTextLayer?.fontKey || DEFAULT_TEXT_FONT.key,
    textFontLabel: activeTextLayer?.fontLabel || DEFAULT_TEXT_FONT.label,
    setTextFontKey,
    textBoxWidth: activeTextLayer?.textBoxWidth ?? DEFAULT_TEXT_BOX_WIDTH,
    setTextBoxWidth,
    textLineHeight: activeTextLayer?.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
    setTextLineHeight,
    textLetterSpacing: activeTextLayer?.letterSpacing ?? 1,
    setTextLetterSpacing,
    textAlign: activeTextLayer?.textAlign || "center",
    setTextAlign,
    textStrokeWidth: activeTextLayer?.strokeWidth ?? 0,
    setTextStrokeWidth,
    textStrokeColor: activeTextLayer?.strokeColor || DEFAULT_TEXT_STROKE_COLOR,
    setTextStrokeColor,
    textShadowEnabled: activeTextLayer?.shadowEnabled ?? false,
    setTextShadowEnabled,
    textShadowMode: "soft",
    textShadowColor: activeTextLayer?.shadowColor || DEFAULT_TEXT_SHADOW_COLOR,
    setTextShadowColor,
    textShadowOffsetX: activeTextLayer?.shadowOffsetX ?? 0,
    setTextShadowOffsetX,
    textShadowOffsetY: activeTextLayer?.shadowOffsetY ?? 2,
    setTextShadowOffsetY,
    textShadowBlur: activeTextLayer?.shadowBlur ?? 14,
    setTextShadowBlur,
    textScaleX: activeTextLayer?.scaleX ?? 1,
    textScaleY: activeTextLayer?.scaleY ?? 1,
    shapeKey: activeShapeLayer?.shapeKey || getConstructorShape().key,
    setShapeKey,
    shapeFillMode: activeShapeLayer?.fillMode || "solid",
    shapeColor: activeShapeLayer?.color || getDefaultTextColor(),
    setShapeColor,
    shapeGradientKey: activeShapeLayer?.gradientKey || DEFAULT_TEXT_GRADIENT.key,
    setShapeGradientKey,
    shapeStrokeStyle: activeShapeLayer?.strokeStyle || "none",
    setShapeStrokeStyle,
    shapeStrokeWidth: activeShapeLayer?.strokeWidth ?? 0,
    setShapeStrokeWidth,
    shapeStrokeColor: activeShapeLayer?.strokeColor || (getDefaultTextColor() === "#ffffff" ? "#111111" : "#ffffff"),
    setShapeStrokeColor,
    shapeEffectType: activeShapeLayer?.effectType || "none",
    setShapeEffectType,
    shapeEffectAngle: activeShapeLayer?.effectAngle ?? -45,
    setShapeEffectAngle,
    shapeEffectDistance: activeShapeLayer?.effectDistance ?? 20,
    setShapeEffectDistance,
    shapeEffectColor: activeShapeLayer?.effectColor || "#824ef0",
    setShapeEffectColor,
    shapeDistortionColorA: activeShapeLayer?.distortionColorA || "#ed5bb7",
    setShapeDistortionColorA,
    shapeDistortionColorB: activeShapeLayer?.distortionColorB || "#1cb8d8",
    setShapeDistortionColorB,
    shapeCornerRoundness: activeShapeLayer?.cornerRoundness ?? 0,
    setShapeCornerRoundness,
    shapeSupportsCornerRoundness: supportsConstructorShapeCornerRoundness(activeShapeLayer?.shapeKey || null),
    shapeWidthCm: activeShapeDimensionsCm.widthCm,
    shapeHeightCm: activeShapeDimensionsCm.heightCm,
    activeShapeVisualMetricsCm,
    setShapeWidthCm,
    setShapeDimensionCm,
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
    addUploadedFileAsLayer,
    uploadWidthCm: activeUploadLayer?.widthCm || 0,
    uploadHeightCm: activeUploadLayer?.heightCm || 0,
    handleUploadScaleChange,
    setUploadDimensionCm,
    removeUploadedFile,
    handleLayerPointerDown,
    applyLayerResize,
    centerActiveLayerPosition,
    setEditingTextLayerId,
    selectLayer,
    selectLayerIds,
    openLayerEditor,
    addTextLayer,
    addShapeLayer,
    focusLayer,
    removeLayer,
    removeActiveLayer,
    duplicateActiveLayer,
    copyActiveLayer,
    pasteCopiedLayer,
    moveActiveLayer,
    reorderLayers,
    undo,
    redo,
    pushHistoryCheckpoint,
    toggleLayerVisibility,
    toggleLayerLock,
    getShapeByKey,
    resetConstructor,
    getResolvedPrintArea,
  };
}

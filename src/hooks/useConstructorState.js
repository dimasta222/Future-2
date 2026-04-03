import { useRef, useState } from "react";
import { getConstructorLineMinAspectRatio, getConstructorLineVisualMetrics, getConstructorShape, getConstructorShapeTightBounds, getConstructorTextFont, getConstructorTextGradient, readImageContentBounds } from "../components/constructor/constructorConfig.js";
import { getShapeFrameMetricsPx } from "../utils/constructor/shapeFrame.js";

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
const SNAP_THRESHOLD_PX = 4;
const UPLOAD_RATIO_TOLERANCE = 0.02;
const textMeasureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const textMeasureContext = textMeasureCanvas?.getContext("2d") || null;

function normalizeRotationDeg(value) {
  const normalized = Number(value) || 0;
  return ((normalized % 360) + 360) % 360;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  buildPreviewSrc,
  buildTelegramLink,
  readFileAsDataUrl,
  readImageSize,
}) {
  const initialProduct = products[0] || FALLBACK_PRODUCT;

  const [activeTab, setActiveTab] = useState("textile");
  const [productKey, setProductKey] = useState(initialProduct.key || "");
  const [side, setSide] = useState("front");
  const [color, setColor] = useState(initialProduct.colors?.[0] || "Чёрный");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [editingTextLayerId, setEditingTextLayerId] = useState(null);
  const [activeSnapGuides, setActiveSnapGuides] = useState([]);
  const printAreaRef = useRef(null);
  const layerIdRef = useRef(0);
  const uploadedFileIdRef = useRef(0);
  const copiedLayerRef = useRef(null);
  const historyPastRef = useRef([]);
  const historyFutureRef = useRef([]);
  const lastHistorySnapshotRef = useRef(null);

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
  const printArea = product.printAreas?.[side] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
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
  const meaningfulLayers = layers.filter(isMeaningfulLayer);
  const meaningfulFrontLayers = meaningfulLayers.filter((layer) => getLayerSide(layer) === "front");
  const meaningfulBackLayers = meaningfulLayers.filter((layer) => getLayerSide(layer) === "back");
  const hasDecoration = meaningfulLayers.length > 0;
  const canSubmitOrder = Boolean(size && hasDecoration && qty >= 1);
  const currentTotal = product.price * qty;
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

  const getLayerDefaultPosition = (layerType) => (layerType === "text" ? { x: 50, y: 28 } : { x: 50, y: 50 });
  const getPhysicalPrintArea = (targetSide = side) => {
    const targetArea = product.printAreas?.[targetSide] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
    return {
      widthCm: targetArea?.physicalWidthCm || 40,
      heightCm: targetArea?.physicalHeightCm || 50,
    };
  };
  const getPrintAreaPixelSize = (targetSide = side) => {
    if (targetSide === side && printAreaRef.current) {
      const bounds = printAreaRef.current.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        return {
          widthPx: bounds.width,
          heightPx: bounds.height,
        };
      }
    }

    const targetArea = product.printAreas?.[targetSide] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
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
  const getLogicalPrintAreaSize = (layerSide = side) => {
    const { widthCm, heightCm } = getPhysicalPrintArea(layerSide);
    return {
      widthPx: Math.max(MIN_LINE_LENGTH_PX, convertCmToCanvasPx(widthCm || 1)),
      heightPx: Math.max(MIN_LINE_HEIGHT_PX, convertCmToCanvasPx(heightCm || 1)),
    };
  };
  const getLogicalLineMaxLengthPx = (layerSide = side) => {
    const { widthPx, heightPx } = getLogicalPrintAreaSize(layerSide);
    return roundCanvasPx(Math.max(MIN_LINE_LENGTH_PX, Math.hypot(widthPx, heightPx)));
  };
  const getPhysicalLineMaxLengthCm = (layerSide = side) => {
    const { widthCm, heightCm } = getPhysicalPrintArea(layerSide);
    return Number(Math.max(0.2, Math.hypot(widthCm, heightCm)).toFixed(3));
  };
  const clampLineWidthPx = (value, layerSide = side, minWidthPx = MIN_LINE_LENGTH_PX) => {
    const maxWidthPx = getLogicalLineMaxLengthPx(layerSide);
    return roundCanvasPx(Math.min(maxWidthPx, Math.max(minWidthPx, Number(value) || minWidthPx)));
  };
  const clampLineHeightPx = (value, layerSide = side) => {
    const { heightPx: maxHeightPx } = getLogicalPrintAreaSize(layerSide);
    return roundCanvasPx(Math.min(maxHeightPx, Math.max(MIN_LINE_HEIGHT_PX, Number(value) || MIN_LINE_HEIGHT_PX)));
  };
  const getLineHeightPxFromStrokeWidth = (strokeWidth, layerSide = side) => {
    const rawHeightPx = Math.max(MIN_LINE_HEIGHT_PX, (Number(strokeWidth) || DEFAULT_LINE_STROKE_WIDTH) * LINE_HEIGHT_PER_STROKE_UNIT_PX);
    return clampLineHeightPx(rawHeightPx, layerSide);
  };
  const getLineDimensionsCmFromPx = (layer, { lineWidthPx, lineHeightPx }, layerSide = side) => {
    const { heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide);
    const maxLineLengthCm = getPhysicalLineMaxLengthCm(layerSide);
    const lineAspectRatio = Math.max(0.2, (Number(lineWidthPx) || MIN_LINE_LENGTH_PX) / Math.max(1, Number(lineHeightPx) || MIN_LINE_HEIGHT_PX));
    const visualMetrics = getConstructorLineVisualMetrics(layer?.shapeKey, layer?.strokeWidth, lineAspectRatio);
    const visibleWidthPx = (Number(lineWidthPx) || 0) * (visualMetrics.visibleWidthPx / Math.max(1, visualMetrics.layoutWidthPx));
    const visibleHeightPx = (Number(lineHeightPx) || 0) * (visualMetrics.visibleHeightPx / Math.max(1, visualMetrics.layoutHeightPx));

    return {
      widthCm: clampShapeCm(convertCanvasPxToCm(visibleWidthPx), maxLineLengthCm),
      heightCm: clampShapeCm(convertCanvasPxToCm(visibleHeightPx), maxHeightCm),
    };
  };
  const getShapeCmAspectRatio = (shapeKey, layerSide = side) => {
    const intrinsicAspectRatio = getShapeIntrinsicAspectRatio(shapeKey);
    const { widthCm: printAreaWidthCm, heightCm: printAreaHeightCm } = getPhysicalPrintArea(layerSide);
    const { widthPx: printAreaWidthPx, heightPx: printAreaHeightPx } = getPrintAreaPixelSize(layerSide);
    const scaleX = printAreaWidthPx / Math.max(0.001, printAreaWidthCm);
    const scaleY = printAreaHeightPx / Math.max(0.001, printAreaHeightCm);
    return Math.max(0.05, intrinsicAspectRatio * (scaleY / Math.max(0.001, scaleX)));
  };
  const getShapeDimensionsFromWidthCm = (shapeKey, nextWidthCm, layerSide = side) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide);
    const aspectRatioCm = getShapeCmAspectRatio(shapeKey, layerSide);
    const widthCm = clampShapeCm(nextWidthCm, maxWidthCm);
    const heightCm = Number((widthCm / aspectRatioCm).toFixed(3));

    if (heightCm <= maxHeightCm) {
      return { widthCm, heightCm };
    }

    const fittedHeightCm = clampShapeCm(maxHeightCm, maxHeightCm);
    return {
      widthCm: Number((fittedHeightCm * aspectRatioCm).toFixed(3)),
      heightCm: fittedHeightCm,
    };
  };
  const getDefaultShapeDimensionsCm = (shapeKey, layerSide = side) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide);
    const preferredWidthCm = Math.max(4, maxWidthCm * 0.4);
    const preferredHeightCm = Math.max(4, maxHeightCm * 0.4);
    const aspectRatioCm = getShapeCmAspectRatio(shapeKey, layerSide);

    let widthCm = preferredWidthCm;
    let heightCm = Number((widthCm / aspectRatioCm).toFixed(3));

    if (heightCm > preferredHeightCm) {
      heightCm = preferredHeightCm;
      widthCm = Number((heightCm * aspectRatioCm).toFixed(3));
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
  const getStoredLineCanvasDimensions = (layer, layerSide = side) => {
    const fallbackHeightPx = Number.isFinite(Number(layer?.heightCm))
      ? convertCmToCanvasPx(layer.heightCm)
      : getLineHeightPxFromStrokeWidth(layer?.strokeWidth, layerSide);
    const lineHeightPx = clampLineHeightPx(
      Number.isFinite(Number(layer?.lineHeightPx)) ? layer.lineHeightPx : fallbackHeightPx,
      layerSide,
    );
    const minLineWidthPx = getLineMinWidthPx(layer, lineHeightPx);

    return {
      lineWidthPx: clampLineWidthPx(
        Number.isFinite(Number(layer?.lineWidthPx)) ? layer.lineWidthPx : convertCmToCanvasPx(layer?.widthCm ?? 12),
        layerSide,
        minLineWidthPx,
      ),
      lineHeightPx,
    };
  };
  const getLineCanvasDimensions = (layer, layerSide = side) => {
    if (Number.isFinite(Number(layer?.lineWidthPx)) || Number.isFinite(Number(layer?.widthCm))) {
      return getStoredLineCanvasDimensions(layer, layerSide);
    }

    const fallbackWidthCm = getDefaultShapeDimensionsCm(layer?.shapeKey || getConstructorShape().key, layerSide).widthCm;
    return getStoredLineCanvasDimensions({ ...layer, widthCm: fallbackWidthCm }, layerSide);
  };
  const normalizeLineShapeLayer = (layer, layerSide = side) => {
    if (!isLineShapeKey(layer?.shapeKey)) return layer;

    const { lineWidthPx, lineHeightPx } = getLineCanvasDimensions(layer, layerSide);
    const lineDimensionsCm = getLineDimensionsCmFromPx(layer, { lineWidthPx, lineHeightPx }, layerSide);

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
  const currentOrderLines = [
    { side: "front", layers: meaningfulFrontLayers },
    { side: "back", layers: meaningfulBackLayers },
  ].filter(({ layers: nextLayers }) => nextLayers.length > 0).map(({ side: orderSide, layers: nextLayers }) => ({
    productName: product.displayName,
    color: resolvedColor,
    size,
    qty,
    side: orderSide,
    layerSummary: nextLayers.map(buildLayerSummary),
    total: currentTotal,
  }));
  const orderMeta = [
    ["Текстиль", product.name],
    ["Материал", product.material || "Уточняется"],
    ["Плотность", product.densityLabel || "Уточняется"],
    ["Цвет", resolvedColor],
    ["Размер", size || "Не выбран"],
    ["Слоёв спереди", `${meaningfulFrontLayers.length}`],
    ["Слоёв сзади", `${meaningfulBackLayers.length}`],
    ["Количество", `${qty} шт`],
  ];
  const getVisibleLayerAspectRatio = (layer) => {
    const visibleWidth = Number(layer?.renderFrame?.contentBounds?.width) || Number(layer?.width) || 1;
    const visibleHeight = Number(layer?.renderFrame?.contentBounds?.height) || Number(layer?.height) || 1;
    return Math.max(0.01, visibleWidth / Math.max(1, visibleHeight));
  };

  const getAssetCmAspectRatio = (intrinsicAspectRatio, layerSide = side) => {
    const { widthCm: printAreaWidthCm, heightCm: printAreaHeightCm } = getPhysicalPrintArea(layerSide);
    const { widthPx: printAreaWidthPx, heightPx: printAreaHeightPx } = getPrintAreaPixelSize(layerSide);
    const scaleX = printAreaWidthPx / Math.max(0.001, printAreaWidthCm);
    const scaleY = printAreaHeightPx / Math.max(0.001, printAreaHeightCm);
    return Math.max(0.05, intrinsicAspectRatio * (scaleY / Math.max(0.001, scaleX)));
  };

  const getUploadAspectRatio = (layer) => getAssetCmAspectRatio(getVisibleLayerAspectRatio(layer), getLayerSide(layer));

  const getUploadDimensionsFromWidthCm = (layer, nextWidthCm) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(layer));
    const aspectRatio = getUploadAspectRatio(layer);
    const clampedWidthCm = clampCm(nextWidthCm, maxWidthCm);
    const derivedHeightCm = Number((clampedWidthCm / aspectRatio).toFixed(3));

    if (derivedHeightCm <= maxHeightCm) {
      return { widthCm: clampedWidthCm, heightCm: derivedHeightCm };
    }

    const fitHeightCm = clampCm(maxHeightCm, maxHeightCm);
    return {
      widthCm: Number((fitHeightCm * aspectRatio).toFixed(3)),
      heightCm: fitHeightCm,
    };
  };
  const getDefaultUploadDimensionsCm = ({ width, height, layerSide = side }) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide);
    const targetArea = product.printAreas?.[layerSide] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
    // Upload dimensions are stored in cm, but preview layout uses percent axes with different physical scales.
    // We normalize area units by physical axis scales so initial width/height preserve bitmap aspect ratio in preview.
    const areaWidthUnits = Math.max(1, (Number(targetArea?.width) || 1) * maxWidthCm);
    const areaHeightUnits = Math.max(1, (Number(targetArea?.height) || 1) * maxHeightCm);
    const naturalWidth = Number(width);
    const naturalHeight = Number(height);

    if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
      return {
        widthCm: Number((maxWidthCm * 0.7).toFixed(3)),
        heightCm: Number((maxHeightCm * 0.7).toFixed(3)),
      };
    }

    const maxAllowedWidthUnits = areaWidthUnits * 0.7;
    const maxAllowedHeightUnits = areaHeightUnits * 0.7;
    const scaleX = maxAllowedWidthUnits / naturalWidth;
    const scaleY = maxAllowedHeightUnits / naturalHeight;
    const scaleRatio = Math.min(scaleX, scaleY, 1);
    const finalWidthUnits = naturalWidth * scaleRatio;
    const finalHeightUnits = naturalHeight * scaleRatio;
    const widthPercent = (finalWidthUnits / areaWidthUnits) * 100;
    const heightPercent = (finalHeightUnits / areaHeightUnits) * 100;

    const widthCm = Number(((maxWidthCm * widthPercent) / 100).toFixed(3));
    const heightCm = Number(((maxHeightCm * heightPercent) / 100).toFixed(3));

    if (import.meta.env.DEV) {
      const sourceRatio = naturalWidth / naturalHeight;
      const previewWidthUnits = (widthCm / maxWidthCm) * areaWidthUnits;
      const previewHeightUnits = (heightCm / maxHeightCm) * areaHeightUnits;
      const previewRatio = previewHeightUnits > 0 ? (previewWidthUnits / previewHeightUnits) : sourceRatio;
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
    weight: DEFAULT_TEXT_FONT.boldWeight ?? DEFAULT_TEXT_WEIGHT,
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
      strokeStyle: "none",
      strokeWidth: resolvedStrokeWidth,
      strokeColor: getDefaultTextColor() === "#ffffff" ? "#111111" : "#ffffff",
      effectType: "none",
      effectAngle: -45,
      effectDistance: 20,
      effectColor: "#824ef0",
      distortionColorA: "#ed5bb7",
      distortionColorB: "#1cb8d8",
      rotationDeg: 0,
      widthCm: defaultDimensions.widthCm,
      heightCm: defaultDimensions.heightCm,
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

  const buildUploadLayer = ({ id: _sourceId, src, uploadName, width, height, ...overrides }) => {
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
      widthCm: defaultDimensions.widthCm,
      heightCm: defaultDimensions.heightCm,
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

    const { widthCm: areaWidthCm, heightCm: areaHeightCm } = getPhysicalPrintArea(getLayerSide(resolvedLayer));

    if (resolvedLayer.type === "upload") {
      const widthCm = resolvedLayer.widthCm;
      const heightCm = resolvedLayer.heightCm;
      if (!widthCm || !heightCm) return null;
      const width = Math.min(areaWidth, areaWidth * (widthCm / areaWidthCm));
      const height = Math.min(areaHeight, areaHeight * (heightCm / areaHeightCm));
      return { areaWidth, areaHeight, width, height };
    }

    if (resolvedLayer.type === "shape") {
      const isLineShape = isLineShapeKey(resolvedLayer.shapeKey);
      const { widthPx: logicalAreaWidthPx, heightPx: logicalAreaHeightPx } = getLogicalPrintAreaSize(getLayerSide(resolvedLayer));
      const lineDimensions = isLineShape ? getLineCanvasDimensions(resolvedLayer, getLayerSide(resolvedLayer)) : null;
      const widthCm = resolvedLayer.widthCm;
      const heightCm = resolvedLayer.heightCm ?? widthCm;
      const baseWidth = isLineShape
        ? areaWidth * ((lineDimensions?.lineWidthPx || MIN_LINE_LENGTH_PX) / logicalAreaWidthPx)
        : Math.min(areaWidth, areaWidth * (widthCm / areaWidthCm));
      const baseHeight = isLineShape
        ? areaHeight * ((lineDimensions?.lineHeightPx || MIN_LINE_HEIGHT_PX) / logicalAreaHeightPx)
        : Math.min(areaHeight, areaHeight * (heightCm / areaHeightCm));
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
      return {
        areaWidth,
        areaHeight,
        width: rotatedWidth,
        height: rotatedHeight,
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
    const contentHeight = resolvedText.trim().length
      ? Math.min(areaHeight, Math.max(1, contentMetrics.contentHeightPx))
      : Math.max(1, (resolvedLayer.size ?? 36) * (resolvedLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT));
    const boxHeight = Math.min(areaHeight, Math.max(1, contentHeight));
    return {
      areaWidth,
      areaHeight,
      width: boxWidth,
      height: boxHeight,
      boxWidth,
      boxHeight,
      contentWidth: Math.min(areaWidth, Math.max(1, contentMetrics.contentWidthPx)),
      contentHeight,
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

    const minX = (metrics.width / 2 / metrics.areaWidth) * 100;
    const maxX = 100 - minX;
    const minY = (metrics.height / 2 / metrics.areaHeight) * 100;
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

    const top = centerYPx - (metrics.height / 2);
    const bottom = centerYPx + (metrics.height / 2);

    if (layer?.type !== "text") {
      return {
        left: centerXPx - (metrics.width / 2),
        right: centerXPx + (metrics.width / 2),
        top,
        bottom,
        width: metrics.width,
        height: metrics.height,
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
      width: right - left,
      height: bottom - top,
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
    setProductKey(nextProductKey);
    setSize("");
    if (!nextProduct.colors.includes(resolvedColor)) {
      setColor(nextProduct.colors[0]);
    }
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

    const nextUploadedFiles = await Promise.all(files.map(async (file) => {
      const src = await readFileAsDataUrl(file);
      const dimensions = await readImageSize(src);
      const renderFrame = await readImageContentBounds(src);

      return {
        id: nextUploadedFileId(),
        src,
        uploadName: file.name,
        width: dimensions.width,
        height: dimensions.height,
        renderFrame,
      };
    }));

    setUploadedFiles((currentFiles) => [...currentFiles, ...nextUploadedFiles]);
    event.target.value = "";
  };

  const addUploadedFileAsLayer = (uploadedFileId) => {
    const uploadedFile = uploadedFiles.find((file) => file.id === uploadedFileId) || null;
    if (!uploadedFile) return;

    pushHistoryCheckpoint();
    const nextLayer = buildUploadLayer(uploadedFile);
    addLayer(nextLayer, "upload");
  };

  const handleUploadScaleChange = (event) => {
    if (!activeUploadLayer) return;
    pushHistoryCheckpoint();
    const nextWidthCm = Number(event.target.value);
    const nextDimensions = getUploadDimensionsFromWidthCm(activeUploadLayer, nextWidthCm);
    updateLayer(activeUploadLayer.id, (layer) => ({
      ...layer,
      ...nextDimensions,
      position: clampLayerPosition(layer.position, { ...layer, ...nextDimensions }, getLayerMetrics(layer, nextDimensions)),
    }));
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

      if (nextLayer.type === "upload" || nextLayer.type === "shape") {
        if (nextLayer.type === "upload" && patch.widthCm != null && patch.heightCm != null) {
          const fitted = fitUniformLayerToArea(nextLayer, nextLayer.widthCm, nextLayer.heightCm);
          nextLayer.widthCm = fitted.widthCm;
          nextLayer.heightCm = fitted.heightCm;
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
          }
        } else {
          nextLayer.widthCm = clampCm(nextLayer.widthCm ?? layer.widthCm ?? 1, maxWidthCm);
          nextLayer.heightCm = clampCm(nextLayer.heightCm ?? layer.heightCm ?? 1, maxHeightCm);
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
          strokeWidth: nextStrokeWidth,
          lineWidthPx: nextLineWidthPx,
          lineHeightPx: getLineHeightPxFromStrokeWidth(nextStrokeWidth, layerSide),
        }, layerSide);
      }

      return {
        ...layer,
        shapeKey: resolvedShapeKey,
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
  const setShapeWidthCm = (nextWidthCm) => {
    if (!activeShapeLayer) return;
    pushHistoryCheckpoint();
    updateLayer(activeShapeLayer.id, (layer) => {
      const layerSide = getLayerSide(layer);
      const nextLayer = isLineShapeKey(layer.shapeKey)
        ? normalizeLineShapeLayer({
          ...layer,
          lineWidthPx: clampLineWidthPx(convertCmToCanvasPx(nextWidthCm), layerSide),
        }, layerSide)
        : {
          ...layer,
          ...getShapeDimensionsFromWidthCm(activeShapeLayer.shapeKey, nextWidthCm, layerSide),
        };

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

  return {
    activeTab,
    setActiveTab,
    productKey,
    side,
    setSide: handleSideChange,
    color: resolvedColor,
    size,
    setSize,
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
    textWeight: activeTextLayer?.weight || (activeTextFont.boldWeight ?? DEFAULT_TEXT_WEIGHT),
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
    shapeWidthCm: activeShapeDimensionsCm.widthCm,
    shapeHeightCm: activeShapeDimensionsCm.heightCm,
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
    addUploadedFileAsLayer,
    uploadWidthCm: activeUploadLayer?.widthCm || 0,
    uploadHeightCm: activeUploadLayer?.heightCm || 0,
    handleUploadScaleChange,
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
  };
}

import { useRef, useState } from "react";
import { getConstructorShape, getConstructorTextFont, getConstructorTextGradient } from "../components/constructor/constructorConfig.js";

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
  preset: "Принт",
  shape: "Фигура",
};

const DEFAULT_TEXT_FONT = getConstructorTextFont("outfit");
const DEFAULT_TEXT_GRADIENT = getConstructorTextGradient("future-pulse");

const TEXT_ALIGN_LABELS = {
  left: "слева",
  center: "по центру",
  right: "справа",
};

const DEFAULT_TEXT_LINE_HEIGHT = 1.05;
const DEFAULT_TEXT_WEIGHT = 700;
const MIN_TEXT_FONT_SIZE = 12;
const MAX_TEXT_FONT_SIZE = 400;
const SNAP_THRESHOLD_PX = 6;
const textMeasureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const textMeasureContext = textMeasureCanvas?.getContext("2d") || null;

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

function getTextBoxHeightPx({
  text,
  fontFamily,
  fontSize,
  fontWeight,
  fontStyle,
  lineHeight,
  letterSpacing,
  boxWidthPx,
}) {
  if (!textMeasureContext) return Math.max(1, fontSize * lineHeight);

  textMeasureContext.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const lines = wrapTextToWidth(text, boxWidthPx, letterSpacing);
  const sampleMetrics = textMeasureContext.measureText(String(text || "") || "Hg");
  const glyphHeightPx = Math.max(1, (sampleMetrics.actualBoundingBoxAscent || fontSize * 0.72) + (sampleMetrics.actualBoundingBoxDescent || fontSize * 0.18));
  const lineHeightPx = fontSize * lineHeight;

  return Math.max(1, glyphHeightPx + Math.max(0, lines.length - 1) * lineHeightPx);
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
  presetPrints,
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
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [editingTextLayerId, setEditingTextLayerId] = useState(null);
  const [activeSnapGuides, setActiveSnapGuides] = useState([]);
  const printAreaRef = useRef(null);
  const layerIdRef = useRef(0);

  const product = products.find((item) => item.key === productKey) || initialProduct;
  const safeColors = product.colors?.length ? product.colors : ["Чёрный"];
  const resolvedColor = safeColors.includes(color) ? color : safeColors[0];
  const getLayerSide = (layer) => (layer?.side === "back" ? "back" : "front");
  const isMeaningfulLayer = (layer) => {
    if (layer.type === "upload") return Boolean(layer.src);
    if (layer.type === "text") return Boolean(layer.value.trim());
    if (layer.type === "preset") return Boolean(layer.presetKey);
    if (layer.type === "shape") return Boolean(layer.shapeKey);
    return false;
  };
  const printArea = product.printAreas?.[side] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
  const previewSrc = buildPreviewSrc({ product, color: resolvedColor, side, size });
  const sideLayers = layers.filter((layer) => getLayerSide(layer) === side);
  const rawActiveLayer = layers.find((layer) => layer.id === activeLayerId) || null;
  const activeLayer = rawActiveLayer && getLayerSide(rawActiveLayer) === side ? rawActiveLayer : null;
  const activeUploadLayer = activeLayer?.type === "upload" ? activeLayer : null;
  const activeTextLayer = activeLayer?.type === "text" ? activeLayer : null;
  const activePresetLayer = activeLayer?.type === "preset" ? activeLayer : null;
  const activeShapeLayer = activeLayer?.type === "shape" ? activeLayer : null;
  const activeTextFont = getConstructorTextFont(activeTextLayer?.fontKey || DEFAULT_TEXT_FONT.key);
  const meaningfulLayers = layers.filter(isMeaningfulLayer);
  const meaningfulFrontLayers = meaningfulLayers.filter((layer) => getLayerSide(layer) === "front");
  const meaningfulBackLayers = meaningfulLayers.filter((layer) => getLayerSide(layer) === "back");
  const hasDecoration = meaningfulLayers.length > 0;
  const canSubmitOrder = Boolean(size && hasDecoration && qty >= 1);
  const currentTotal = product.price * qty;
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
      const fillSummary = layer.fillMode === "gradient"
        ? `градиент ${getConstructorTextGradient(layer.gradientKey).label}`
        : `цвет ${layer.color}`;
      const strokeSummary = layer.strokeStyle && layer.strokeStyle !== "none" ? `, обводка ${layer.strokeStyle} ${layer.strokeWidth ?? 13}px ${layer.strokeColor}` : "";
      const effectSummary = layer.effectType === "drop-shadow"
        ? `, тень ${layer.effectAngle ?? -45}°/${layer.effectDistance ?? 20}`
        : layer.effectType === "distort"
          ? `, искажение ${layer.effectAngle ?? -55}°/${layer.effectDistance ?? 9}`
          : "";
      return `${layer.name}: ${shape?.label || "Фигура"}, ${fillSummary}${strokeSummary}, размер ${layer.widthCm ?? 0} × ${layer.heightCm ?? 0} см${effectSummary}`;
    }

    const preset = presetPrints.find((item) => item.key === layer.presetKey);
    return `${layer.name}: ${preset?.label || "Принт"}, размер ${layer.widthCm ?? 0} × ${layer.heightCm ?? 0} см`;
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
  const nextLayerId = (type) => {
    layerIdRef.current += 1;
    return `${type}-${layerIdRef.current}`;
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

  const getLayerDefaultPosition = (layerType) => (layerType === "text" ? { x: 50, y: 78 } : { x: 50, y: 50 });
  const getPhysicalPrintArea = (targetSide = side) => {
    const targetArea = product.printAreas?.[targetSide] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
    return {
      widthCm: targetArea?.physicalWidthCm || 40,
      heightCm: targetArea?.physicalHeightCm || 50,
    };
  };
  const clampCm = (value, maxValue) => Number(Math.min(maxValue, Math.max(1, Number(value))).toFixed(1));
  const getUploadAspectRatio = (layer) => {
    if (!layer?.width || !layer?.height) return 1;
    return layer.width / layer.height;
  };
  const getUploadDimensionsFromWidthCm = (layer, nextWidthCm) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(layer));
    const aspectRatio = getUploadAspectRatio(layer);
    const clampedWidthCm = clampCm(nextWidthCm, maxWidthCm);
    const derivedHeightCm = Number((clampedWidthCm / aspectRatio).toFixed(1));

    if (derivedHeightCm <= maxHeightCm) {
      return { widthCm: clampedWidthCm, heightCm: derivedHeightCm };
    }

    const fitHeightCm = clampCm(maxHeightCm, maxHeightCm);
    return {
      widthCm: Number((fitHeightCm * aspectRatio).toFixed(1)),
      heightCm: fitHeightCm,
    };
  };
  const getDefaultUploadDimensionsCm = ({ width, height, layerSide = side }) => {
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(layerSide);
    const fitWidthCm = maxWidthCm * 0.7;
    const fitHeightCm = maxHeightCm * 0.7;
    const aspectRatio = width && height ? width / height : 1;

    if (!aspectRatio || Number.isNaN(aspectRatio)) {
      return { widthCm: Number(fitWidthCm.toFixed(1)), heightCm: Number(fitHeightCm.toFixed(1)) };
    }

    const widthRatio = fitWidthCm / width;
    const heightRatio = fitHeightCm / height;
    const scaleRatio = Math.min(widthRatio, heightRatio);
    return {
      widthCm: Number((width * scaleRatio).toFixed(1)),
      heightCm: Number((height * scaleRatio).toFixed(1)),
    };
  };

  const LAYER_ADD_OFFSETS = {
    text: { x: 0, y: 4.5 },
    shape: { x: 3.5, y: 3.5 },
    preset: { x: 5, y: 2.5 },
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
    textBoxWidth: 88,
    lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
    letterSpacing: 1,
    textAlign: "center",
    strokeWidth: 0,
    strokeColor: getDefaultTextColor() === "#ffffff" ? "#111111" : "#ffffff",
    shadowEnabled: false,
    shadowMode: "soft",
    shadowColor: "#111111",
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    shadowBlur: 14,
    scaleX: 1,
    scaleY: 1,
    side: overrides.side || side,
    position: getLayerDefaultPosition("text"),
    ...overrides,
  });

  const buildPresetLayer = (overrides = {}) => ({
    id: nextLayerId("preset"),
    type: "preset",
    name: LAYER_TYPE_LABELS.preset,
    isAutoNamed: true,
    visible: true,
    locked: false,
    presetKey: presetPrints[0]?.key || "",
    widthCm: 18,
    heightCm: 18,
    side: overrides.side || side,
    position: getLayerDefaultPosition("preset"),
    ...overrides,
  });

  const buildShapeLayer = (overrides = {}) => ({
    id: nextLayerId("shape"),
    type: "shape",
    name: LAYER_TYPE_LABELS.shape,
    isAutoNamed: true,
    visible: true,
    locked: false,
    shapeKey: getConstructorShape(overrides.shapeKey).key,
    fillMode: "solid",
    color: getDefaultTextColor(),
    gradientKey: DEFAULT_TEXT_GRADIENT.key,
    strokeStyle: "none",
    strokeWidth: 13,
    strokeColor: getDefaultTextColor() === "#ffffff" ? "#111111" : "#ffffff",
    effectType: "none",
    effectAngle: -45,
    effectDistance: 20,
    effectColor: "#824ef0",
    distortionColorA: "#ed5bb7",
    distortionColorB: "#1cb8d8",
    widthCm: 16,
    heightCm: 16,
    side: overrides.side || side,
    position: getLayerDefaultPosition("shape"),
    ...overrides,
  });

  const buildUploadLayer = ({ src, uploadName, width, height, ...overrides }) => {
    const resolvedSide = overrides.side || side;
    const defaultDimensions = getDefaultUploadDimensionsCm({ width, height, layerSide: resolvedSide });

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
      widthCm: defaultDimensions.widthCm,
      heightCm: defaultDimensions.heightCm,
      side: resolvedSide,
      position: getLayerDefaultPosition("upload"),
      ...overrides,
    };
  };

  const getPresetByKey = (presetKey) => presetPrints.find((item) => item.key === presetKey) || null;
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
      if (activeLayerId === layerId) {
        const sameSideLayers = nextLayers.filter((layer) => getLayerSide(layer) === removedSide);
        setActiveLayerId(sameSideLayers[sameSideLayers.length - 1]?.id || null);
      }
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
    if (nextTab) setActiveTab(nextTab);
  };

  const handleSideChange = (nextSide) => {
    const resolvedSide = nextSide === "back" ? "back" : "front";
    setSide(resolvedSide);
    setDraggingLayerId(null);
    setEditingTextLayerId(null);
    setActiveSnapGuides([]);

    const nextSideLayers = layers.filter((layer) => getLayerSide(layer) === resolvedSide);
    setActiveLayerId(nextSideLayers[nextSideLayers.length - 1]?.id || null);
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

    if (resolvedLayer.type === "preset") {
      const widthCm = resolvedLayer.widthCm;
      const heightCm = resolvedLayer.heightCm ?? widthCm;
      const width = Math.min(areaWidth, areaWidth * (widthCm / areaWidthCm));
      const height = Math.min(areaHeight, areaHeight * (heightCm / areaHeightCm));
      return { areaWidth, areaHeight, width, height };
    }

    if (resolvedLayer.type === "shape") {
      const widthCm = resolvedLayer.widthCm;
      const heightCm = resolvedLayer.heightCm ?? widthCm;
      const width = Math.min(areaWidth, areaWidth * (widthCm / areaWidthCm));
      const height = Math.min(areaHeight, areaHeight * (heightCm / areaHeightCm));
      return { areaWidth, areaHeight, width, height };
    }
    const resolvedText = String(resolvedLayer.value || "");
    const widthPercent = Math.min(100, Math.max(20, resolvedLayer.textBoxWidth ?? 88));
    const width = Math.min(areaWidth, areaWidth * (widthPercent / 100));
    const resolvedFont = getConstructorTextFont(resolvedLayer.fontKey || DEFAULT_TEXT_FONT.key);
    const fontFamily = resolvedLayer.fontFamily || resolvedFont.family || DEFAULT_TEXT_FONT.family;
    const fontWeight = resolvedFont.supportsBold
      ? (resolvedLayer.weight ?? resolvedFont.regularWeight ?? DEFAULT_TEXT_WEIGHT)
      : (resolvedFont.regularWeight ?? 400);
    const fontStyle = resolvedFont.supportsItalic && resolvedLayer.italic ? "italic" : "normal";
    const height = Math.min(areaHeight, getTextBoxHeightPx({
      text: resolvedLayer.uppercase ? resolvedText.toUpperCase() : resolvedText,
      fontFamily,
      fontSize: resolvedLayer.size ?? 36,
      fontWeight,
      fontStyle,
      lineHeight: resolvedLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
      letterSpacing: resolvedLayer.letterSpacing ?? 1,
      boxWidthPx: width,
    }));
    return { areaWidth, areaHeight, width, height };
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

  const getTabByLayerType = (layerType) => {
    if (layerType === "upload") return "upload";
    if (layerType === "text") return "text";
    if (layerType === "preset") return "prints";
    if (layerType === "shape") return "shapes";
    return null;
  };

  const selectLayer = (layerId) => {
    const nextLayer = layers.find((layer) => layer.id === layerId) || null;
    setActiveLayerId(layerId);

    if (!nextLayer || nextLayer.type !== "text") {
      setEditingTextLayerId(null);
    }
  };

  const openLayerEditor = (layerId) => {
    const nextLayer = layers.find((layer) => layer.id === layerId) || null;
    if (!nextLayer) return;

    setActiveLayerId(layerId);

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
    setProductKey(nextProductKey);
    setSize("");
    if (!nextProduct.colors.includes(resolvedColor)) {
      setColor(nextProduct.colors[0]);
    }
  };

  const handleColorChange = (nextColor) => {
    const nextResolvedColor = nextColor || safeColors[0];
    const previousAutoTextColor = resolvedColor === "Белый" ? "#111111" : "#ffffff";
    setColor(nextResolvedColor);
    setLayers((currentLayers) => currentLayers.map((layer) => {
      if (layer.type !== "text" || layer.textFillMode !== "solid" || layer.color !== previousAutoTextColor) return layer;
      return { ...layer, color: getDefaultTextColor(nextResolvedColor) };
    }));
  };

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = await readFileAsDataUrl(file);
    const dimensions = await readImageSize(src);
    const nextLayer = buildUploadLayer({ src, uploadName: file.name, ...dimensions });
    addLayer(nextLayer, "upload");
    event.target.value = "";
  };

  const handleUploadScaleChange = (event) => {
    if (!activeUploadLayer) return;
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

  const handleUploadRemove = () => {
    if (!activeUploadLayer) return;
    removeLayerById(activeUploadLayer.id);
  };

  const centerActiveLayerPosition = () => {
    if (!activeLayer) return;
    updateLayer(activeLayer.id, { position: getLayerDefaultPosition(activeLayer.type) });
  };

  const getCombinedSnapGuidesPx = (excludeLayerId, areaWidth, areaHeight) => {
    const guides = getSnapGuidesPx(areaWidth, areaHeight);

    layers.forEach((layer) => {
      if (!layer.visible || layer.id === excludeLayerId) return;
      const metrics = getLayerMetrics(layer);
      if (!metrics?.width || !metrics?.height) return;
      const centerXPx = (layer.position.x / 100) * areaWidth;
      const centerYPx = (layer.position.y / 100) * areaHeight;
      const left = centerXPx - (metrics.width / 2);
      const right = centerXPx + (metrics.width / 2);
      const top = centerYPx - (metrics.height / 2);
      const bottom = centerYPx + (metrics.height / 2);
      guides.vertical.push(left, centerXPx, right);
      guides.horizontal.push(top, centerYPx, bottom);
    });

    return guides;
  };

  const handleLayerPointerDown = (layerId, event) => {
    const targetLayer = layers.find((layer) => layer.id === layerId);
    if (!targetLayer) return;

    selectLayer(layerId);

    if (targetLayer.locked || !printAreaRef.current) return;

    event.preventDefault();

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const startPointer = { x: event.clientX, y: event.clientY };
    const startPosition = { ...targetLayer.position };
    let hasDragged = false;

    const updatePosition = (clientX, clientY) => {
      if (!printAreaRef.current) return;

      const rect = printAreaRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const metrics = getLayerMetrics(targetLayer);
      const layerWidthPx = metrics?.width ?? 0;
      const layerHeightPx = metrics?.height ?? 0;
      const guides = getCombinedSnapGuidesPx(layerId, rect.width, rect.height);

      let nextCenterXPx = ((startPosition.x / 100) * rect.width) + (clientX - startPointer.x);
      let nextCenterYPx = ((startPosition.y / 100) * rect.height) + (clientY - startPointer.y);

      if (layerWidthPx > 0) {
        nextCenterXPx = clamp(nextCenterXPx, layerWidthPx / 2, rect.width - layerWidthPx / 2);
      }
      if (layerHeightPx > 0) {
        nextCenterYPx = clamp(nextCenterYPx, layerHeightPx / 2, rect.height - layerHeightPx / 2);
      }

      const snappedX = snapIntervalToGuides(nextCenterXPx - (layerWidthPx / 2), layerWidthPx, guides.vertical);
      const snappedY = snapIntervalToGuides(nextCenterYPx - (layerHeightPx / 2), layerHeightPx, guides.horizontal);

      const snappedCenterXPx = snappedX.startPx + (layerWidthPx / 2);
      const snappedCenterYPx = snappedY.startPx + (layerHeightPx / 2);

      const nextPosition = clampLayerPosition({
        x: (snappedCenterXPx / rect.width) * 100,
        y: (snappedCenterYPx / rect.height) * 100,
      }, targetLayer, metrics);

      setActiveSnapGuides([
        ...(snappedX.guide == null ? [] : [{ orientation: "vertical", positionPercent: (snappedX.guide / rect.width) * 100 }]),
        ...(snappedY.guide == null ? [] : [{ orientation: "horizontal", positionPercent: (snappedY.guide / rect.height) * 100 }]),
      ]);

      updateLayer(layerId, (layer) => {
        if (layer.position.x === nextPosition.x && layer.position.y === nextPosition.y) return layer;
        return { ...layer, position: nextPosition };
      });
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
        setDraggingLayerId(layerId);
      }

      updatePosition(moveEvent.clientX, moveEvent.clientY);
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
    const nextLayer = buildTextLayer();
    nextLayer.position = getNextAddedLayerPosition(nextLayer);
    addLayer(nextLayer, "text");
    setEditingTextLayerId(nextLayer.id);
  };

  const addPresetLayer = () => {
    const nextLayer = buildPresetLayer();
    nextLayer.position = getNextAddedLayerPosition(nextLayer);
    addLayer(nextLayer, "prints");
  };

  const addShapeLayer = (shapeKey) => {
    const nextLayer = buildShapeLayer(shapeKey ? { shapeKey } : {});
    nextLayer.position = getNextAddedLayerPosition(nextLayer);
    addLayer(nextLayer, "shapes");
  };

  const removeActiveLayer = () => {
    if (!activeLayer) return;
    removeLayerById(activeLayer.id);
  };

  const removeLayer = (layerId) => {
    if (!layerId) return;
    removeLayerById(layerId);
  };

  const duplicateActiveLayer = () => {
    if (!activeLayer) return;

    let nextLayer;

    if (activeLayer.type === "text") {
      nextLayer = buildTextLayer({
        ...activeLayer,
        name: `${activeLayer.name} копия`,
        isAutoNamed: false,
        position: clampLayerPosition({ x: activeLayer.position.x + 4, y: activeLayer.position.y + 4 }, activeLayer),
      });
    }

    if (activeLayer.type === "preset") {
      nextLayer = buildPresetLayer({
        ...activeLayer,
        name: `${activeLayer.name} копия`,
        isAutoNamed: false,
        position: clampLayerPosition({ x: activeLayer.position.x + 4, y: activeLayer.position.y + 4 }, activeLayer),
      });
    }

    if (activeLayer.type === "upload") {
      nextLayer = buildUploadLayer({
        ...activeLayer,
        name: `${activeLayer.name} копия`,
        isAutoNamed: false,
        position: clampLayerPosition({ x: activeLayer.position.x + 4, y: activeLayer.position.y + 4 }, activeLayer),
      });
    }

    if (activeLayer.type === "shape") {
      nextLayer = buildShapeLayer({
        ...activeLayer,
        name: `${activeLayer.name} копия`,
        isAutoNamed: false,
        position: clampLayerPosition({ x: activeLayer.position.x + 4, y: activeLayer.position.y + 4 }, activeLayer),
      });
    }

    if (!nextLayer) return;
    addLayer(nextLayer, activeLayer.type === "preset" ? "prints" : activeLayer.type === "shape" ? "shapes" : activeLayer.type);
  };

  const moveActiveLayer = (direction) => {
    if (!activeLayer) return;

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
    updateLayer(layerId, (layer) => ({ ...layer, visible: !layer.visible }));
  };

  const toggleLayerLock = (layerId) => {
    updateLayer(layerId, (layer) => ({ ...layer, locked: !layer.locked }));
  };

  const normalizeTextLayerState = (candidateLayer, previousLayer = candidateLayer) => {
    const nextLayer = { ...candidateLayer };
    nextLayer.scaleX = Number(Math.min(6, Math.max(0.2, nextLayer.scaleX ?? previousLayer.scaleX ?? 1)).toFixed(3));
    nextLayer.scaleY = Number(Math.min(6, Math.max(0.2, nextLayer.scaleY ?? previousLayer.scaleY ?? 1)).toFixed(3));
    nextLayer.size = Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, Number(nextLayer.size ?? previousLayer.size ?? 36)));
    nextLayer.textBoxWidth = Math.min(100, Math.max(20, Number(nextLayer.textBoxWidth ?? previousLayer.textBoxWidth ?? 88)));
    nextLayer.lineHeight = Math.min(1.8, Math.max(0.85, Number(nextLayer.lineHeight ?? previousLayer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT)));
    nextLayer.letterSpacing = Number(Math.min(24, Math.max(-8, Number(nextLayer.letterSpacing ?? previousLayer.letterSpacing ?? 1))).toFixed(2));
    nextLayer.strokeWidth = Number(Math.min(6, Math.max(0, Number(nextLayer.strokeWidth ?? previousLayer.strokeWidth ?? 0))).toFixed(2));
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

      if (nextLayer.type === "upload" || nextLayer.type === "preset" || nextLayer.type === "shape") {
        if (nextLayer.type === "upload" && patch.widthCm != null && patch.heightCm != null) {
          const fitted = fitUniformLayerToArea(nextLayer, nextLayer.widthCm, nextLayer.heightCm);
          nextLayer.widthCm = fitted.widthCm;
          nextLayer.heightCm = fitted.heightCm;
        } else {
          nextLayer.widthCm = clampCm(nextLayer.widthCm ?? layer.widthCm ?? 1, maxWidthCm);
          nextLayer.heightCm = clampCm(nextLayer.heightCm ?? layer.heightCm ?? 1, maxHeightCm);
        }
      }

      if (nextLayer.type === "text") {
        return normalizeTextLayerState(nextLayer, layer);
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

  const updateActivePresetLayer = (patch) => {
    if (!activePresetLayer) return;
    updateLayer(activePresetLayer.id, (layer) => ({ ...layer, ...patch }));
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
  const setTextSize = (nextSize) => updateActiveTextLayer({ size: Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, Number(nextSize))) });
  const setTextColor = (nextColor) => updateActiveTextLayer({ textFillMode: "solid", color: nextColor });
  const setTextGradientKey = (nextGradientKey) => {
    const nextGradient = getConstructorTextGradient(nextGradientKey);
    updateActiveTextLayer({ textFillMode: "gradient", gradientKey: nextGradient.key });
  };
  const setTextWeight = (nextWeight) => {
    if (!activeTextLayer || !activeTextFont.supportsBold) return;

    const minWeight = activeTextFont.regularWeight ?? 400;
    const maxWeight = activeTextFont.boldWeight ?? nextWeight;
    updateActiveTextLayer({ weight: Math.min(maxWeight, Math.max(minWeight, Number(nextWeight))) });
  };
  const setTextItalic = (nextItalic) => {
    if (!activeTextLayer || !activeTextFont.supportsItalic) return;
    updateActiveTextLayer({ italic: nextItalic });
  };
  const setTextUnderline = (nextUnderline) => updateActiveTextLayer({ underline: nextUnderline });
  const setTextStrikethrough = (nextStrikethrough) => updateActiveTextLayer({ strikethrough: nextStrikethrough });
  const setTextUppercase = (nextUppercase) => updateActiveTextLayer({ uppercase: nextUppercase });
  const setTextFontKey = (nextFontKey) => {
    const nextFont = getConstructorTextFont(nextFontKey);
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
  const setTextBoxWidth = (nextTextBoxWidth) => updateActiveTextLayer({ textBoxWidth: Math.min(100, Math.max(20, Number(nextTextBoxWidth))) });
  const setTextLineHeight = (nextLineHeight) => updateActiveTextLayer({ lineHeight: Math.min(1.8, Math.max(0.85, Number(nextLineHeight.toFixed(2)))) });
  const setTextLetterSpacing = (nextLetterSpacing) => updateActiveTextLayer({ letterSpacing: nextLetterSpacing });
  const setTextAlign = (nextTextAlign) => updateActiveTextLayer({ textAlign: nextTextAlign });
  const setTextStrokeWidth = (nextStrokeWidth) => updateActiveTextLayer({ strokeWidth: Math.min(6, Math.max(0, Number(nextStrokeWidth))) });
  const setTextStrokeColor = (nextStrokeColor) => updateActiveTextLayer({ strokeColor: nextStrokeColor });
  const setTextShadowEnabled = (nextShadowEnabled) => updateActiveTextLayer({ shadowEnabled: nextShadowEnabled, shadowMode: "soft" });
  const setTextShadowColor = (nextShadowColor) => updateActiveTextLayer({ shadowColor: nextShadowColor });
  const setTextShadowOffsetX = (nextShadowOffsetX) => updateActiveTextLayer({ shadowOffsetX: Math.min(24, Math.max(-24, Math.round(nextShadowOffsetX))) });
  const setTextShadowOffsetY = (nextShadowOffsetY) => updateActiveTextLayer({ shadowOffsetY: Math.min(24, Math.max(-24, Math.round(nextShadowOffsetY))) });
  const setTextShadowBlur = (nextShadowBlur) => updateActiveTextLayer({ shadowBlur: Math.min(32, Math.max(0, Math.round(nextShadowBlur))) });
  const setPresetKey = (nextPresetKey) => updateActivePresetLayer({ presetKey: nextPresetKey });
  const setPresetWidthCm = (nextWidthCm) => {
    if (!activePresetLayer) return;
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(activePresetLayer));
    const nextDimensions = {
      widthCm: clampCm(nextWidthCm, maxWidthCm),
      heightCm: clampCm(nextWidthCm, maxHeightCm),
    };
    updateLayer(activePresetLayer.id, (layer) => ({
      ...layer,
      ...nextDimensions,
      position: clampLayerPosition(layer.position, { ...layer, ...nextDimensions }, getLayerMetrics(layer, nextDimensions)),
    }));
  };
  const setShapeKey = (nextShapeKey) => updateActiveShapeLayer({ shapeKey: getConstructorShape(nextShapeKey).key });
  const setShapeColor = (nextColor) => updateActiveShapeLayer({ fillMode: "solid", color: nextColor });
  const setShapeGradientKey = (nextGradientKey) => updateActiveShapeLayer({ fillMode: "gradient", gradientKey: getConstructorTextGradient(nextGradientKey).key });
  const setShapeStrokeStyle = (nextStrokeStyle) => updateActiveShapeLayer((layer) => ({
    ...layer,
    strokeStyle: nextStrokeStyle,
    strokeWidth: nextStrokeStyle === "none"
      ? layer.strokeWidth ?? 13
      : Math.max(1, layer.strokeWidth ?? 13),
  }));
  const setShapeStrokeWidth = (nextStrokeWidth) => updateActiveShapeLayer({ strokeWidth: Math.min(24, Math.max(1, Number(nextStrokeWidth))) });
  const setShapeStrokeColor = (nextStrokeColor) => updateActiveShapeLayer({ strokeColor: nextStrokeColor });
  const setShapeEffectType = (nextEffectType) => updateActiveShapeLayer({ effectType: nextEffectType });
  const setShapeEffectAngle = (nextEffectAngle) => updateActiveShapeLayer({ effectAngle: Math.min(180, Math.max(-180, Math.round(nextEffectAngle))) });
  const setShapeEffectDistance = (nextEffectDistance) => updateActiveShapeLayer({ effectDistance: Math.min(40, Math.max(0, Math.round(nextEffectDistance))) });
  const setShapeEffectColor = (nextEffectColor) => updateActiveShapeLayer({ effectColor: nextEffectColor });
  const setShapeDistortionColorA = (nextColor) => updateActiveShapeLayer({ distortionColorA: nextColor });
  const setShapeDistortionColorB = (nextColor) => updateActiveShapeLayer({ distortionColorB: nextColor });
  const setShapeWidthCm = (nextWidthCm) => {
    if (!activeShapeLayer) return;
    const { widthCm: maxWidthCm, heightCm: maxHeightCm } = getPhysicalPrintArea(getLayerSide(activeShapeLayer));
    const nextDimensions = {
      widthCm: clampCm(nextWidthCm, maxWidthCm),
      heightCm: clampCm(nextWidthCm, maxHeightCm),
    };
    updateLayer(activeShapeLayer.id, (layer) => ({
      ...layer,
      ...nextDimensions,
      position: clampLayerPosition(layer.position, { ...layer, ...nextDimensions }, getLayerMetrics(layer, nextDimensions)),
    }));
  };

  const telegramLink = buildTelegramLink(currentOrderLines);

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
    textBoxWidth: activeTextLayer?.textBoxWidth ?? 88,
    setTextBoxWidth,
    textLineHeight: activeTextLayer?.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
    setTextLineHeight,
    textLetterSpacing: activeTextLayer?.letterSpacing ?? 1,
    setTextLetterSpacing,
    textAlign: activeTextLayer?.textAlign || "center",
    setTextAlign,
    textStrokeWidth: activeTextLayer?.strokeWidth ?? 0,
    setTextStrokeWidth,
    textStrokeColor: activeTextLayer?.strokeColor || (getDefaultTextColor() === "#ffffff" ? "#111111" : "#ffffff"),
    setTextStrokeColor,
    textShadowEnabled: activeTextLayer?.shadowEnabled ?? false,
    setTextShadowEnabled,
    textShadowMode: "soft",
    textShadowColor: activeTextLayer?.shadowColor || "#111111",
    setTextShadowColor,
    textShadowOffsetX: activeTextLayer?.shadowOffsetX ?? 0,
    setTextShadowOffsetX,
    textShadowOffsetY: activeTextLayer?.shadowOffsetY ?? 2,
    setTextShadowOffsetY,
    textShadowBlur: activeTextLayer?.shadowBlur ?? 14,
    setTextShadowBlur,
    textScaleX: activeTextLayer?.scaleX ?? 1,
    textScaleY: activeTextLayer?.scaleY ?? 1,
    presetKey: activePresetLayer?.presetKey || "",
    setPresetKey,
    presetWidthCm: activePresetLayer?.widthCm || 18,
    presetHeightCm: activePresetLayer?.heightCm || 18,
    setPresetWidthCm,
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
    shapeWidthCm: activeShapeLayer?.widthCm || 16,
    shapeHeightCm: activeShapeLayer?.heightCm || 16,
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
    uploadWidthCm: activeUploadLayer?.widthCm || 0,
    uploadHeightCm: activeUploadLayer?.heightCm || 0,
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
    focusLayer,
    removeLayer,
    removeActiveLayer,
    duplicateActiveLayer,
    moveActiveLayer,
    reorderLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    getPresetByKey,
    getShapeByKey,
  };
}

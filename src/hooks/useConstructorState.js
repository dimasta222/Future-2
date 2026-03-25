import { useRef, useState } from "react";
import { getConstructorTextFont, getConstructorTextGradient } from "../components/constructor/constructorConfig.js";

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
};

const DEFAULT_TEXT_FONT = getConstructorTextFont("outfit");
const DEFAULT_TEXT_GRADIENT = getConstructorTextGradient("future-pulse");

const TEXT_ALIGN_LABELS = {
  left: "слева",
  center: "по центру",
  right: "справа",
};

const DEFAULT_TEXT_LINE_HEIGHT = 1.05;

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
  const printAreaRef = useRef(null);
  const layerIdRef = useRef(0);

  const product = products.find((item) => item.key === productKey) || initialProduct;
  const safeColors = product.colors?.length ? product.colors : ["Чёрный"];
  const resolvedColor = safeColors.includes(color) ? color : safeColors[0];
  const printArea = product.printAreas?.[side] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
  const previewSrc = buildPreviewSrc({ product, color: resolvedColor, side });
  const activeLayer = layers.find((layer) => layer.id === activeLayerId) || null;
  const activeUploadLayer = activeLayer?.type === "upload" ? activeLayer : null;
  const activeTextLayer = activeLayer?.type === "text" ? activeLayer : null;
  const activePresetLayer = activeLayer?.type === "preset" ? activeLayer : null;
  const meaningfulLayers = layers.filter((layer) => {
    if (layer.type === "upload") return Boolean(layer.src);
    if (layer.type === "text") return Boolean(layer.value.trim());
    if (layer.type === "preset") return Boolean(layer.presetKey);
    return false;
  });
  const hasDecoration = meaningfulLayers.length > 0;
  const canSubmitOrder = Boolean(size && hasDecoration && qty >= 1);
  const currentTotal = product.price * qty;
  const currentOrderLine = {
    productName: product.displayName,
    color: resolvedColor,
    size,
    qty,
    side,
    layerSummary: meaningfulLayers.map((layer) => {
      if (layer.type === "upload") {
        return `${layer.name}: ${layer.uploadName}`;
      }

      if (layer.type === "text") {
        const textPreview = layer.value;
        const textEffects = [];
        if ((layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT) !== DEFAULT_TEXT_LINE_HEIGHT) textEffects.push(`межстрочный ${layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT}`);
        if ((layer.strokeWidth ?? 0) > 0) textEffects.push(`обводка ${layer.strokeWidth}px`);
        if (layer.shadowEnabled) textEffects.push(`${layer.shadowMode === "soft" ? "мягкая" : "жесткая"} тень ${layer.shadowOffsetX ?? 0}/${layer.shadowOffsetY ?? 2}${layer.shadowMode === "soft" ? `/${layer.shadowBlur ?? 14}` : ""}`);
        return `${layer.name}: «${textPreview.trim()}», шрифт ${layer.fontLabel || DEFAULT_TEXT_FONT.label}, ширина текстового блока ${layer.textBoxWidth ?? 88}%, интервал ${layer.letterSpacing ?? 1}px, выравнивание ${TEXT_ALIGN_LABELS[layer.textAlign] || TEXT_ALIGN_LABELS.center}${textEffects.length ? `, эффекты ${textEffects.join(", ")}` : ""}`;
      }

      const preset = presetPrints.find((item) => item.key === layer.presetKey);
      return `${layer.name}: ${preset?.label || "Принт"}`;
    }),
    total: currentTotal,
  };
  const orderMeta = [
    ["Текстиль", product.name],
    ["Материал", product.material || "Уточняется"],
    ["Плотность", product.densityLabel || "Уточняется"],
    ["Цвет", resolvedColor],
    ["Размер", size || "Не выбран"],
    ["Сторона", side === "front" ? "Спереди" : "Сзади"],
    ["Количество", `${qty} шт`],
    ["Слоёв", `${meaningfulLayers.length}`],
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
    weight: 700,
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
    shadowMode: "hard",
    shadowColor: "#111111",
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    shadowBlur: 14,
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
    scale: 52,
    position: getLayerDefaultPosition("preset"),
    ...overrides,
  });

  const buildUploadLayer = ({ src, uploadName, width, height, ...overrides }) => ({
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
    scale: 78,
    position: getLayerDefaultPosition("upload"),
    ...overrides,
  });

  const getPresetByKey = (presetKey) => presetPrints.find((item) => item.key === presetKey) || null;

  const updateLayer = (layerId, updater) => {
    setLayers((currentLayers) => currentLayers.map((layer) => {
      if (layer.id !== layerId) return layer;
      return typeof updater === "function" ? updater(layer) : { ...layer, ...updater };
    }));
  };

  const removeLayerById = (layerId) => {
    setLayers((currentLayers) => {
      const nextLayers = reindexAutoNamedLayers(currentLayers.filter((layer) => layer.id !== layerId));
      if (activeLayerId === layerId) {
        setActiveLayerId(nextLayers[nextLayers.length - 1]?.id || null);
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

  const getLayerMetrics = (layer, nextScale = layer.scale) => {
    if (!printAreaRef.current || !layer) return null;

    const { width: areaWidth, height: areaHeight } = printAreaRef.current.getBoundingClientRect();
    if (!areaWidth || !areaHeight) return null;

    if (layer.type === "upload") {
      if (!layer.width || !layer.height) return null;
      const aspectRatio = layer.width / layer.height;
      const preferredWidth = areaWidth * (nextScale / 100);
      const width = Math.min(preferredWidth, areaHeight * aspectRatio, areaWidth);
      const height = aspectRatio ? width / aspectRatio : areaHeight;
      return { areaWidth, areaHeight, width, height };
    }

    if (layer.type === "preset") {
      const width = Math.min(areaWidth * (nextScale / 100), areaWidth);
      return { areaWidth, areaHeight, width, height: width };
    }

    const resolvedText = String(layer.value || "");
    const manualLines = resolvedText.split(/\r?\n/);
    const widthPercent = Math.min(100, Math.max(20, layer.textBoxWidth ?? 88));
    const width = Math.min(areaWidth, areaWidth * (widthPercent / 100));
    const averageCharWidth = Math.max(1, layer.size * 0.56 + (layer.letterSpacing ?? 1));
    const charsPerLine = Math.max(1, Math.floor(width / averageCharWidth));
    const lineCount = manualLines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);

    const height = Math.min(areaHeight, lineCount * layer.size * (layer.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT));
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

  const resolveLayerPositionFromPointer = (clientX, clientY, layer) => {
    if (!printAreaRef.current || !layer) return layer?.position || getLayerDefaultPosition("upload");
    const rect = printAreaRef.current.getBoundingClientRect();
    const nextPosition = {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
    return clampLayerPosition(nextPosition, layer);
  };

  const focusLayer = (layerId) => {
    const nextLayer = layers.find((layer) => layer.id === layerId) || null;
    setActiveLayerId(layerId);
    if (!nextLayer) return;
    if (nextLayer.type === "upload") setActiveTab("upload");
    if (nextLayer.type === "text") setActiveTab("text");
    if (nextLayer.type === "preset") setActiveTab("prints");
    if (nextLayer.type !== "text") setEditingTextLayerId(null);
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
    const nextScale = Number(event.target.value);
    updateLayer(activeUploadLayer.id, (layer) => ({
      ...layer,
      scale: nextScale,
      position: clampLayerPosition(layer.position, layer, getLayerMetrics(layer, nextScale)),
    }));
  };

  const handleUploadRemove = () => {
    if (!activeUploadLayer) return;
    removeLayerById(activeUploadLayer.id);
  };

  const centerActiveLayerPosition = () => {
    if (!activeLayer) return;
    updateLayer(activeLayer.id, { position: getLayerDefaultPosition(activeLayer.type) });
  };

  const handleLayerPointerDown = (layerId, event) => {
    const targetLayer = layers.find((layer) => layer.id === layerId);
    if (!targetLayer) return;

    setActiveLayerId(layerId);
    if (targetLayer.type === "upload") setActiveTab("upload");
    if (targetLayer.type === "text") setActiveTab("text");
    if (targetLayer.type === "preset") setActiveTab("prints");
    if (targetLayer.type !== "text") setEditingTextLayerId(null);

    if (targetLayer.locked || !printAreaRef.current) return;

    event.preventDefault();

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const updatePosition = (clientX, clientY) => {
      const nextPosition = resolveLayerPositionFromPointer(clientX, clientY, targetLayer);
      updateLayer(layerId, (layer) => {
        if (layer.position.x === nextPosition.x && layer.position.y === nextPosition.y) return layer;
        return { ...layer, position: nextPosition };
      });
    };

    setDraggingLayerId(layerId);
    node.setPointerCapture?.(pointerId);
    updatePosition(event.clientX, event.clientY);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const stopDragging = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      setDraggingLayerId(null);
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
    addLayer(nextLayer, "text");
    setEditingTextLayerId(nextLayer.id);
  };

  const addPresetLayer = () => {
    const nextLayer = buildPresetLayer();
    addLayer(nextLayer, "prints");
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

    if (!nextLayer) return;
    addLayer(nextLayer, activeLayer.type === "preset" ? "prints" : activeLayer.type);
  };

  const moveActiveLayer = (direction) => {
    if (!activeLayer) return;

    setLayers((currentLayers) => {
      const currentIndex = currentLayers.findIndex((layer) => layer.id === activeLayer.id);
      if (currentIndex === -1) return currentLayers;

      const nextIndex = direction === "up" ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= currentLayers.length) return currentLayers;

      const nextLayers = [...currentLayers];
      const [movedLayer] = nextLayers.splice(currentIndex, 1);
      nextLayers.splice(nextIndex, 0, movedLayer);
      return nextLayers;
    });
  };

  const toggleLayerVisibility = (layerId) => {
    updateLayer(layerId, (layer) => ({ ...layer, visible: !layer.visible }));
  };

  const toggleLayerLock = (layerId) => {
    updateLayer(layerId, (layer) => ({ ...layer, locked: !layer.locked }));
  };

  const updateActiveTextLayer = (patch) => {
    if (!activeTextLayer) return;
    updateLayer(activeTextLayer.id, (layer) => ({ ...layer, ...patch }));
  };

  const updateActivePresetLayer = (patch) => {
    if (!activePresetLayer) return;
    updateLayer(activePresetLayer.id, (layer) => ({ ...layer, ...patch }));
  };

  const setTextValue = (nextValue) => {
    if (!activeTextLayer) return;

    const normalizedValue = String(nextValue).replace(/\r/g, "");
    updateLayer(activeTextLayer.id, { value: normalizedValue });
  };
  const setTextSize = (nextSize) => updateActiveTextLayer({ size: nextSize });
  const setTextColor = (nextColor) => updateActiveTextLayer({ textFillMode: "solid", color: nextColor });
  const setTextGradientKey = (nextGradientKey) => {
    const nextGradient = getConstructorTextGradient(nextGradientKey);
    updateActiveTextLayer({ textFillMode: "gradient", gradientKey: nextGradient.key });
  };
  const setTextWeight = (nextWeight) => updateActiveTextLayer({ weight: nextWeight });
  const setTextFontKey = (nextFontKey) => {
    const nextFont = getConstructorTextFont(nextFontKey);
    updateActiveTextLayer({ fontKey: nextFont.key, fontFamily: nextFont.family, fontLabel: nextFont.label });
  };
  const setTextBoxWidth = (nextTextBoxWidth) => updateActiveTextLayer({ textBoxWidth: Math.min(100, Math.max(20, Math.round(nextTextBoxWidth))) });
  const setTextLineHeight = (nextLineHeight) => updateActiveTextLayer({ lineHeight: Math.min(1.8, Math.max(0.85, Number(nextLineHeight.toFixed(2)))) });
  const setTextLetterSpacing = (nextLetterSpacing) => updateActiveTextLayer({ letterSpacing: nextLetterSpacing });
  const setTextAlign = (nextTextAlign) => updateActiveTextLayer({ textAlign: nextTextAlign });
  const setTextStrokeWidth = (nextStrokeWidth) => updateActiveTextLayer({ strokeWidth: Math.min(6, Math.max(0, Number(nextStrokeWidth))) });
  const setTextStrokeColor = (nextStrokeColor) => updateActiveTextLayer({ strokeColor: nextStrokeColor });
  const setTextShadowEnabled = (nextShadowEnabled) => updateActiveTextLayer({ shadowEnabled: nextShadowEnabled });
  const setTextShadowMode = (nextShadowMode) => updateActiveTextLayer({ shadowMode: nextShadowMode });
  const setTextShadowColor = (nextShadowColor) => updateActiveTextLayer({ shadowColor: nextShadowColor });
  const setTextShadowOffsetX = (nextShadowOffsetX) => updateActiveTextLayer({ shadowOffsetX: Math.min(24, Math.max(-24, Math.round(nextShadowOffsetX))) });
  const setTextShadowOffsetY = (nextShadowOffsetY) => updateActiveTextLayer({ shadowOffsetY: Math.min(24, Math.max(-24, Math.round(nextShadowOffsetY))) });
  const setTextShadowBlur = (nextShadowBlur) => updateActiveTextLayer({ shadowBlur: Math.min(32, Math.max(0, Math.round(nextShadowBlur))) });
  const setPresetKey = (nextPresetKey) => updateActivePresetLayer({ presetKey: nextPresetKey });
  const setPresetScale = (nextScale) => {
    if (!activePresetLayer) return;
    updateLayer(activePresetLayer.id, (layer) => ({
      ...layer,
      scale: nextScale,
      position: clampLayerPosition(layer.position, layer, getLayerMetrics(layer, nextScale)),
    }));
  };

  const telegramLink = buildTelegramLink([currentOrderLine]);

  return {
    activeTab,
    setActiveTab,
    productKey,
    side,
    setSide,
    color: resolvedColor,
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
    textValue: activeTextLayer?.value || "",
    setTextValue,
    textSize: activeTextLayer?.size || 36,
    setTextSize,
    textFillMode: activeTextLayer?.textFillMode || "solid",
    textColor: activeTextLayer?.color || getDefaultTextColor(),
    setTextColor,
    textGradientKey: activeTextLayer?.gradientKey || DEFAULT_TEXT_GRADIENT.key,
    setTextGradientKey,
    textWeight: activeTextLayer?.weight || 700,
    setTextWeight,
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
    textShadowMode: activeTextLayer?.shadowMode || "hard",
    setTextShadowMode,
    textShadowColor: activeTextLayer?.shadowColor || "#111111",
    setTextShadowColor,
    textShadowOffsetX: activeTextLayer?.shadowOffsetX ?? 0,
    setTextShadowOffsetX,
    textShadowOffsetY: activeTextLayer?.shadowOffsetY ?? 2,
    setTextShadowOffsetY,
    textShadowBlur: activeTextLayer?.shadowBlur ?? 14,
    setTextShadowBlur,
    presetKey: activePresetLayer?.presetKey || "",
    setPresetKey,
    presetScale: activePresetLayer?.scale || 52,
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
  };
}
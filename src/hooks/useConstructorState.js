import { useRef, useState } from "react";

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
  const [uploadDesign, setUploadDesign] = useState(null);
  const [uploadScale, setUploadScale] = useState(78);
  const [uploadPosition, setUploadPosition] = useState({ x: 50, y: 50 });
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textWeight, setTextWeight] = useState(700);
  const [textUppercase, setTextUppercase] = useState(true);
  const [presetKey, setPresetKey] = useState("");
  const [presetScale, setPresetScale] = useState(52);
  const printAreaRef = useRef(null);

  const product = products.find((item) => item.key === productKey) || initialProduct;
  const safeColors = product.colors?.length ? product.colors : ["Чёрный"];
  const resolvedColor = safeColors.includes(color) ? color : safeColors[0];
  const printArea = product.printAreas?.[side] || product.printAreas?.front || FALLBACK_PRODUCT.printAreas.front;
  const previewSrc = buildPreviewSrc({ product, color: resolvedColor, side });
  const selectedPreset = presetPrints.find((item) => item.key === presetKey) || null;
  const hasDecoration = Boolean(uploadDesign || textValue.trim() || selectedPreset);
  const canSubmitOrder = Boolean(size && hasDecoration && qty >= 1);
  const currentTotal = product.price * qty;
  const currentOrderLine = {
    productName: product.displayName,
    color: resolvedColor,
    size,
    qty,
    side,
    uploadName: uploadDesign?.name || "",
    text: textValue.trim(),
    presetLabel: selectedPreset?.label || "",
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
  ];
  const orderDecorItems = [
    uploadDesign ? `Файл: ${uploadDesign.name}` : null,
    textValue.trim() ? `Текст: ${textValue.trim()}` : null,
    selectedPreset ? `Принт: ${selectedPreset.label}` : null,
  ].filter(Boolean);

  const getUploadMetrics = (scaleValue = uploadScale) => {
    if (!printAreaRef.current || !uploadDesign?.width || !uploadDesign?.height) return null;

    const { width: areaWidth, height: areaHeight } = printAreaRef.current.getBoundingClientRect();
    if (!areaWidth || !areaHeight) return null;

    const aspectRatio = uploadDesign.width / uploadDesign.height;
    const preferredWidth = areaWidth * (scaleValue / 100);
    const width = Math.min(preferredWidth, areaHeight * aspectRatio, areaWidth);
    const height = aspectRatio ? width / aspectRatio : areaHeight;

    return { areaWidth, areaHeight, width, height };
  };

  const clampUploadPosition = (position, metrics = getUploadMetrics()) => {
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    if (!metrics) {
      return { x: clamp(position.x, 0, 100), y: clamp(position.y, 0, 100) };
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

  const resolveUploadPositionFromPointer = (clientX, clientY) => {
    if (!printAreaRef.current) return uploadPosition;
    const rect = printAreaRef.current.getBoundingClientRect();
    const nextPosition = {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
    return clampUploadPosition(nextPosition);
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
    if (textColor === previousAutoTextColor) {
      setTextColor(nextResolvedColor === "Белый" ? "#111111" : "#ffffff");
    }
  };

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = await readFileAsDataUrl(file);
    const dimensions = await readImageSize(src);
    setUploadDesign({ name: file.name, src, ...dimensions });
    setUploadPosition({ x: 50, y: 50 });
    setActiveTab("upload");
  };

  const handleUploadScaleChange = (event) => {
    const nextScale = Number(event.target.value);
    setUploadScale(nextScale);
    setUploadPosition((current) => clampUploadPosition(current, getUploadMetrics(nextScale)));
  };

  const handleUploadRemove = () => {
    setUploadDesign(null);
    setUploadPosition({ x: 50, y: 50 });
    setIsDraggingUpload(false);
  };

  const centerUploadPosition = () => {
    setUploadPosition({ x: 50, y: 50 });
  };

  const handleUploadPointerDown = (event) => {
    if (!uploadDesign || !printAreaRef.current) return;

    event.preventDefault();

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const updatePosition = (clientX, clientY) => {
      const nextPosition = resolveUploadPositionFromPointer(clientX, clientY);
      setUploadPosition((current) => (
        current.x === nextPosition.x && current.y === nextPosition.y ? current : nextPosition
      ));
    };

    setIsDraggingUpload(true);
    node.setPointerCapture?.(pointerId);
    updatePosition(event.clientX, event.clientY);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const stopDragging = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      setIsDraggingUpload(false);
      node.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  const telegramLink = buildTelegramLink([currentOrderLine]);
  const overlayText = textUppercase ? textValue.toUpperCase() : textValue;

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
    uploadDesign,
    uploadScale,
    uploadPosition,
    isDraggingUpload,
    textValue,
    setTextValue,
    textSize,
    setTextSize,
    textColor,
    setTextColor,
    textWeight,
    setTextWeight,
    textUppercase,
    setTextUppercase,
    presetKey,
    setPresetKey,
    presetScale,
    setPresetScale,
    printAreaRef,
    product,
    printArea,
    previewSrc,
    selectedPreset,
    canSubmitOrder,
    currentTotal,
    orderMeta,
    orderDecorItems,
    telegramLink,
    overlayText,
    handleProductChange,
    handleColorChange,
    handleUploadChange,
    handleUploadScaleChange,
    handleUploadRemove,
    handleUploadPointerDown,
    centerUploadPosition,
  };
}
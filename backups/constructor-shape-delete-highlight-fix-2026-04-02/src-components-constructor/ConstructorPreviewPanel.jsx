import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildConstructorShapeSvg, getConstructorLineVisualMetrics, getConstructorTextFont } from "./constructorConfig.js";
import { resizeLayer } from "../../utils/constructor/resize/resizeLayer.js";
import { getShapeFrameMetricsPx } from "../../utils/constructor/shapeFrame.js";

const DEFAULT_TEXT_SHADOW = {
  light: "0 2px 14px rgba(0,0,0,.16)",
  dark: "0 2px 14px rgba(0,0,0,.32)",
};

const LOGICAL_PRINT_PX_PER_CM = 10;

const RESIZE_HANDLES = [
  { key: "nw", x: -1, y: -1, cursor: "nwse-resize", style: { left: -8, top: -8 } },
  { key: "n", x: 0, y: -1, cursor: "ns-resize", style: { left: "50%", top: -8, transform: "translateX(-50%)" } },
  { key: "ne", x: 1, y: -1, cursor: "nesw-resize", style: { right: -8, top: -8 } },
  { key: "e", x: 1, y: 0, cursor: "ew-resize", style: { right: -8, top: "50%", transform: "translateY(-50%)" } },
  { key: "se", x: 1, y: 1, cursor: "nwse-resize", style: { right: -8, bottom: -8 } },
  { key: "s", x: 0, y: 1, cursor: "ns-resize", style: { left: "50%", bottom: -8, transform: "translateX(-50%)" } },
  { key: "sw", x: -1, y: 1, cursor: "nesw-resize", style: { left: -8, bottom: -8 } },
  { key: "w", x: -1, y: 0, cursor: "ew-resize", style: { left: -8, top: "50%", transform: "translateY(-50%)" } },
];

const TEXT_RESIZE_HANDLE_KEYS = new Set(["nw", "ne", "se", "sw", "e", "w"]);
const LINE_SHAPE_HANDLE_KEYS = new Set(["e", "w"]);
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

function measureTextSelectionBounds(node) {
  if (!node) return null;

  const textValue = String(node.textContent || "").replace(/\r/g, "");
  if (!textValue.trim().length) return null;

  const doc = node.ownerDocument;
  if (!doc?.createRange) return null;

  const range = doc.createRange();
  range.selectNodeContents(node);
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
  if (!rects.length) return null;

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return {
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
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

function isSelectAllShortcut(event) {
  const key = String(event.key || "").toLowerCase();
  return key === "a" && (event.metaKey || event.ctrlKey) && !event.altKey;
}


export default function ConstructorPreviewPanel({
  side,
  onSideChange,
  topOverlay,
  previewSrc,
  productName,
  color,
  printAreaRef,
  printArea,
  layers,
  activeLayerId,
  draggingLayerId,
  editingTextLayerId,
  onLayerPointerDown,
  onLayerEditOpen,
  onPreviewBackgroundPointerDown,
  onActiveTextValueChange,
  onEditingTextLayerChange,
  onLayerResize,
  onActiveTextMetricsChange,
  getPresetByKey,
  getShapeByKey,
  getTextGradientByKey,
}) {
  const [resizingLayerId, setResizingLayerId] = useState(null);
  const [printAreaPixelSize, setPrintAreaPixelSize] = useState({ width: 0, height: 0 });
  const editableTextLayerRefs = useRef({});
  const textContentLayerRefs = useRef({});
  const textLayerRefs = useRef({});
  const lastFocusedEditingLayerIdRef = useRef(null);
  const activeTextMetricsRef = useRef(null);
  const physicalWidthCm = printArea?.physicalWidthCm || 40;
  const physicalHeightCm = printArea?.physicalHeightCm || 50;

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

    if (node.textContent !== editingLayerValue) {
      node.textContent = editingLayerValue;
    }

    if (document.activeElement !== node) {
      node.focus();
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
      const textContentNode = textContentLayerRefs.current[activeTextLayer.id];

      if (!printAreaBounds?.width || !printAreaBounds?.height || !textLayerNode || !textContentNode) {
        if (activeTextMetricsRef.current) {
          activeTextMetricsRef.current = null;
          onActiveTextMetricsChange?.(null);
        }
        return;
      }

      const textLayerBounds = textLayerNode.getBoundingClientRect();
      const textSelectionBounds = measureTextSelectionBounds(textContentNode);
      const boxWidthPx = Number(textLayerBounds.width.toFixed(2));
      const boxHeightPx = Number(Math.max(textLayerBounds.height, 1).toFixed(2));
      const contentWidthPx = Number(Math.min(boxWidthPx, Math.max(textSelectionBounds?.width || 0, 0)).toFixed(2));
      const contentHeightPx = Number(Math.max(textSelectionBounds?.height || 0, 0).toFixed(2));
      const nextValue = {
        layerId: activeTextLayer.id,
        boxWidthPx,
        boxHeightPx,
        contentWidthPx,
        contentHeightPx,
      };
      const currentValue = activeTextMetricsRef.current;
      if (
        currentValue?.layerId === nextValue.layerId
        && currentValue?.boxWidthPx === nextValue.boxWidthPx
        && currentValue?.boxHeightPx === nextValue.boxHeightPx
        && currentValue?.contentWidthPx === nextValue.contentWidthPx
        && currentValue?.contentHeightPx === nextValue.contentHeightPx
      ) {
        return;
      }
      activeTextMetricsRef.current = nextValue;

      onActiveTextMetricsChange?.({
        contentWidthCm: Number(((contentWidthPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        contentHeightCm: Number(((contentHeightPx / printAreaBounds.height) * physicalHeightCm).toFixed(1)),
        boxWidthCm: Number(((boxWidthPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        boxHeightCm: Number(((boxHeightPx / printAreaBounds.height) * physicalHeightCm).toFixed(1)),
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
    activeTextLayer?.textAlign,
    editingTextLayerId,
    onActiveTextMetricsChange,
    physicalHeightCm,
    physicalWidthCm,
    printAreaRef,
    resizingLayerId,
  ]);

  const getLayerRenderSize = (layer) => ({
    width: `${((layer.widthCm || 1) / physicalWidthCm) * 100}%`,
    height: `${((layer.heightCm || 1) / physicalHeightCm) * 100}%`,
  });

  const getShapeRenderFrame = (layer) => {
    const printAreaWidthPx = Math.max(1, Number(printAreaPixelSize.width) || 0);
    const printAreaHeightPx = Math.max(1, Number(printAreaPixelSize.height) || 0);
    const isLineShape = getShapeByKey(layer.shapeKey)?.category === "lines";
    const logicalPrintAreaWidthPx = Math.max(1, physicalWidthCm * LOGICAL_PRINT_PX_PER_CM);
    const logicalPrintAreaHeightPx = Math.max(1, physicalHeightCm * LOGICAL_PRINT_PX_PER_CM);
    const fallbackWidthPx = ((layer.widthCm || 1) / physicalWidthCm) * printAreaWidthPx;
    const fallbackHeightPx = ((layer.heightCm || 1) / physicalHeightCm) * printAreaHeightPx;
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
    if (layer.locked || layer.id !== activeLayerId || !printAreaRef.current || !onLayerResize) return;

    event.preventDefault();
    event.stopPropagation();

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
      rotationDeg: layer.type === "shape" ? Number(layer.rotationDeg) || 0 : 0,
    };

    const updateResize = (clientX, clientY) => {
      const patch = resizeLayer({
        layer,
        handle,
        pointer: { x: clientX, y: clientY },
        printAreaBounds,
        dragState,
        physicalWidthCm,
        physicalHeightCm,
      });

      if (!patch) return;
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

    const buttons = handles.map((handle) => (
      <button
        key={handle.key}
        type="button"
        data-constructor-interactive="true"
        aria-label={`Изменить размер слоя: ${handle.key}`}
        onPointerDown={(event) => handleLayerResizePointerDown(layer, handle, event)}
        style={{
          position: "absolute",
          width: 14,
          height: 14,
          padding: 0,
          borderRadius: 5,
          border: "1px solid rgba(255,255,255,.32)",
          background: resizingLayerId === layer.id ? "linear-gradient(180deg, rgba(232,67,147,.96), rgba(108,92,231,.96))" : "rgba(15,15,18,.9)",
          boxShadow: resizingLayerId === layer.id ? "0 10px 24px rgba(232,67,147,.24)" : "0 8px 18px rgba(0,0,0,.22)",
          cursor: handle.cursor,
          pointerEvents: "auto",
          touchAction: "none",
          zIndex: 3,
          ...handle.style,
          ...(options.handleStyleOverrides?.[handle.key] || null),
        }}
      />
    ));

    return buttons;
  };

  const handlePreviewBackgroundPointerDown = (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-constructor-interactive="true"]')) return;
    onPreviewBackgroundPointerDown?.();
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
    <div className="constructor-preview" style={{ minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", gap: 8, padding: 6, borderRadius: 999, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          {[["front", "Спереди"], ["back", "Спина"]].map(([key, label]) => <button key={label} type="button" onClick={() => onSideChange(key)} className={`tb ${side === key ? "ta" : "ti"}`} style={{ padding: "10px 20px", minWidth: 128 }}>{label}</button>)}
        </div>
      </div>

      {topOverlay ? <div style={{ position: "sticky", top: 12, zIndex: 7, marginBottom: 14 }}>{topOverlay}</div> : null}

      <div style={{ position: "relative", minHeight: 640 }} onPointerDown={handlePreviewBackgroundPointerDown}>
        <img src={previewSrc} alt={`${productName} — ${color}`} draggable={false} style={{ width: "100%", display: "block", userSelect: "none", WebkitUserDrag: "none" }} />
        <div ref={printAreaRef} style={{ position: "absolute", left: `${printArea.left}%`, top: `${printArea.top}%`, width: `${printArea.width}%`, height: `${printArea.height}%`, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {layers.map((layer, index) => {
            if (!layer.visible) return null;

            const active = layer.id === activeLayerId;
            const dragging = layer.id === draggingLayerId;
            const frameStyle = active ? "0 0 0 1px rgba(232,67,147,.82)" : "none";

            if (layer.type === "preset") {
              const preset = getPresetByKey(layer.presetKey);
              if (!preset) return null;
              const layerSize = getLayerRenderSize(layer);

              return (
                <div
                  key={layer.id}
                  data-constructor-interactive="true"
                  role="presentation"
                  onPointerDown={(event) => onLayerPointerDown(layer.id, event)}
                  onDoubleClick={() => onLayerEditOpen(layer.id)}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: "translate(-50%, -50%)", width: layerSize.width, height: layerSize.height, maxWidth: "100%", maxHeight: "100%", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: frameStyle, borderRadius: 14, zIndex: index + 1 }}
                >
                  <img src={preset.src} alt={preset.label} draggable={false} style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "fill", display: "block", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.25))" }} />
                  {renderResizeHandles(layer)}
                </div>
              );
            }

            if (layer.type === "upload") {
              const layerSize = getLayerRenderSize(layer);

              return (
                <div
                  key={layer.id}
                  data-constructor-interactive="true"
                  role="presentation"
                  onPointerDown={(event) => onLayerPointerDown(layer.id, event)}
                  onDoubleClick={() => onLayerEditOpen(layer.id)}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: "translate(-50%, -50%)", width: layerSize.width, height: layerSize.height, maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: frameStyle, borderRadius: 14, zIndex: index + 1 }}
                >
                  <img src={layer.src} alt={layer.uploadName} draggable={false} style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.24))", userSelect: "none", WebkitUserDrag: "none" }} />
                  {renderResizeHandles(layer)}
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
                    left: `calc(${shapeRenderFrame.leftPercent}% - 8px)`,
                    top: `${shapeRenderFrame.centerYPercent}%`,
                    transform: "translateY(-50%)",
                  },
                  e: {
                    right: `calc(${shapeRenderFrame.rightPercent}% - 8px)`,
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
                preserveAspectRatio: shapePreserveAspectRatio,
                lineAspectRatio,
              });
              const shapeSvgMarkup = baseShapeSvgMarkup;
              const effectOffset = getDirectionalOffset(layer.effectAngle ?? -45, layer.effectDistance ?? 0);
              const baseShadowSvgMarkup = buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.effectColor || "#824ef0",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
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
                  role="presentation"
                  onPointerDown={(event) => onLayerPointerDown(layer.id, event)}
                  onDoubleClick={() => onLayerEditOpen(layer.id)}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`, width: shapeRenderFrame.outerWidth, height: shapeRenderFrame.outerHeight, maxWidth: "none", maxHeight: "none", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: isLineShape ? "none" : frameStyle, borderRadius: 0, zIndex: index + 1, overflow: "visible" }}
                >
                  <div style={{ position: "absolute", ...shapeRenderFrame.innerStyle, pointerEvents: "none" }}>
                    {layer.effectType === "drop-shadow" ? (
                      <div
                        aria-hidden="true"
                        style={{ ...svgLayerBaseStyle, transform: `translate(${effectOffset.x}px, ${effectOffset.y}px)`, opacity: 0.78 }}
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
                </div>
              );
            }

            const overlayText = layer.value;
            const editing = layer.id === editingTextLayerId;
            const hasVisibleText = overlayText.trim().length > 0;
            const showEmptyTextPlaceholder = active && !hasVisibleText;
            if (!hasVisibleText && !active && !editing) return null;

            const showTextBoxGuides = active;
            const resizing = resizingLayerId === layer.id;
            const allowTextEditing = active && editing && !layer.locked;
            const textGuideShadow = showTextBoxGuides
              ? `${frameStyle}, inset 0 0 0 1px rgba(255,255,255,.24)`
              : frameStyle;
            const textShadowValue = layer.shadowEnabled
              ? `${layer.shadowOffsetX ?? 0}px ${layer.shadowOffsetY ?? 2}px ${layer.shadowBlur ?? 14}px ${layer.shadowColor || "#111111"}`
              : color === "Белый"
                ? DEFAULT_TEXT_SHADOW.light
                : DEFAULT_TEXT_SHADOW.dark;
            const layerFont = getConstructorTextFont(layer.fontKey);
            const activeGradient = layer.textFillMode === "gradient" ? getTextGradientByKey(layer.gradientKey) : null;
            const textDecorationLine = getTextDecorationLine(layer);
            const decorationColor = activeGradient ? layer.color || (color === "Белый" ? "#111111" : "#ffffff") : layer.color;
            const textTransform = layer.uppercase ? "uppercase" : "none";
            const fontWeight = layerFont.supportsBold ? layer.weight : (layerFont.regularWeight ?? 400);
            const fontStyle = layerFont.supportsItalic && layer.italic ? "italic" : "normal";
            const textMinHeight = !hasVisibleText && (active || editing)
              ? `${Math.max(layer.size * (layer.lineHeight ?? 1.05), layer.size)}px`
              : undefined;

            return (
              <div
                key={layer.id}
                data-constructor-interactive="true"
                ref={(node) => {
                  textLayerRefs.current[layer.id] = node;
                }}
                role="presentation"
                onPointerDown={allowTextEditing ? undefined : (event) => onLayerPointerDown(layer.id, event)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onLayerEditOpen(layer.id);
                }}
                style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: "translate(-50%, -50%)", transformOrigin: "center center", width: `${layer.textBoxWidth ?? 88}%`, maxWidth: "100%", minHeight: textMinHeight, padding: 0, textAlign: layer.textAlign || "center", fontSize: `${layer.size}px`, lineHeight: layer.lineHeight ?? 1.05, fontWeight, fontStyle, fontFamily: layer.fontFamily || "'Outfit', sans-serif", color: activeGradient ? "transparent" : layer.color, letterSpacing: `${layer.letterSpacing ?? 1}px`, WebkitTextStroke: (layer.strokeWidth ?? 0) > 0 ? `${layer.strokeWidth}px ${layer.strokeColor || "#111111"}` : "0 transparent", paintOrder: "stroke fill", whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", textShadow: textShadowValue, pointerEvents: "auto", cursor: allowTextEditing ? "text" : resizing ? "nwse-resize" : layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: allowTextEditing ? "auto" : "none", boxShadow: showTextBoxGuides ? textGuideShadow : "none", borderRadius: 0, outline: "none", outlineOffset: 0, background: "transparent", zIndex: index + 1 }}
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
                    style={{ minHeight: textMinHeight, outline: "none", cursor: "text", userSelect: "text", WebkitUserSelect: "text", color: activeGradient ? "transparent" : layer.color, backgroundImage: activeGradient ? activeGradient.css : "none", WebkitBackgroundClip: activeGradient ? "text" : "border-box", backgroundClip: activeGradient ? "text" : "border-box", WebkitTextFillColor: activeGradient ? "transparent" : layer.color, caretColor: layer.color || "#f0eef5", fontStyle, textTransform: "none", textDecorationLine, textDecorationColor: decorationColor, textDecorationThickness: textDecorationLine === "none" ? undefined : "0.08em", textUnderlineOffset: layer.underline ? "0.14em" : undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", padding: 0, margin: 0 }}
                  />
                ) : (
                  <div
                    ref={(node) => {
                      textContentLayerRefs.current[layer.id] = node;
                    }}
                    style={{ minHeight: textMinHeight, outline: "none", cursor: "inherit", color: activeGradient ? "transparent" : layer.color, backgroundImage: activeGradient ? activeGradient.css : "none", WebkitBackgroundClip: activeGradient ? "text" : "border-box", backgroundClip: activeGradient ? "text" : "border-box", WebkitTextFillColor: activeGradient ? "transparent" : layer.color, caretColor: layer.color || "#f0eef5", fontStyle, textTransform, textDecorationLine, textDecorationColor: decorationColor, textDecorationThickness: textDecorationLine === "none" ? undefined : "0.08em", textUnderlineOffset: layer.underline ? "0.14em" : undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", padding: 0, margin: 0 }}
                  >
                    {overlayText}
                  </div>
                )}
                {showEmptyTextPlaceholder ? (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: layer.textAlign === "left" ? "flex-start" : layer.textAlign === "right" ? "flex-end" : "center", color: "rgba(240,238,245,.32)", textShadow: "none", pointerEvents: "none", fontSize: "0.58em", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform }}>
                    Введите текст
                  </span>
                ) : null}
                {showTextBoxGuides ? renderResizeHandles(layer) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

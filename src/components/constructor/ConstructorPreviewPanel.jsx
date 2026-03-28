import { useEffect, useRef, useState } from "react";
import { buildConstructorShapeSvg, getConstructorTextFont } from "./constructorConfig.js";
import { svgToDataUri } from "../../shared/textilePreviewHelpers.js";

const DEFAULT_TEXT_SHADOW = {
  light: "0 2px 14px rgba(0,0,0,.16)",
  dark: "0 2px 14px rgba(0,0,0,.32)",
};

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const SNAP_THRESHOLD_PX = 4;

function getSnapGuidesPx(areaWidth, areaHeight) {
  return {
    vertical: [0, areaWidth / 2, areaWidth],
    horizontal: [0, areaHeight / 2, areaHeight],
  };
}

function snapValueToGuides(valuePx, guidePositions, thresholdPx = SNAP_THRESHOLD_PX) {
  let best = null;
  guidePositions.forEach((guide) => {
    const distance = Math.abs(guide - valuePx);
    if (distance > thresholdPx) return;
    if (!best || distance < best.distance) best = { valuePx: guide, guide, distance };
  });
  return best ? { valuePx: best.valuePx, guide: best.guide } : { valuePx, guide: null };
}

function dedupeGuides(guides) {
  const seen = new Set();
  return guides.filter((guide) => {
    const key = `${guide.orientation}:${guide.positionPercent.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function isCornerHandle(handle) {
  return handle.x !== 0 && handle.y !== 0;
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
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
    left,
    right,
    top,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getMeasuredLayerBounds(layer, layerNode, textNode) {
  if (layer?.type === "text") {
    const measuredBounds = measureTextSelectionBounds(textNode);
    if (measuredBounds) return measuredBounds;
  }

  return layerNode?.getBoundingClientRect() || null;
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
  activeSnapGuides = [],
  editingTextLayerId,
  onLayerPointerDown,
  onLayerEditOpen,
  onPreviewBackgroundPointerDown,
  onActiveTextValueChange,
  onEditingTextLayerChange,
  onLayerResize,
  onHistoryCheckpoint,
  onActiveTextMetricsChange,
  onRemoveLayer,
  getPresetByKey,
  getShapeByKey,
  getTextGradientByKey,
}) {
  const [resizingLayerId, setResizingLayerId] = useState(null);
  const [_activeTextFrameMetrics, setActiveTextFrameMetrics] = useState(null);
  const [resizeSnapGuides, setResizeSnapGuides] = useState([]);
  const editableTextLayerRefs = useRef({});
  const textContentLayerRefs = useRef({});
  const textLayerRefs = useRef({});
  const layerElementRefs = useRef({});
  const physicalWidthCm = printArea?.physicalWidthCm || 40;
  const physicalHeightCm = printArea?.physicalHeightCm || 50;

  useEffect(() => {
    if (!editingTextLayerId) return;

    const node = editableTextLayerRefs.current[editingTextLayerId];
    if (!node) return;

    const editingLayer = layers.find((layer) => layer.id === editingTextLayerId);
    const nextTextValue = editingLayer?.value || "";

    if (node.textContent !== nextTextValue) {
      node.textContent = nextTextValue;
    }

    node.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingTextLayerId, layers]);

  useEffect(() => {
    const activeTextLayer = layers.find((layer) => layer.id === activeLayerId && layer.type === "text") || null;

    if (!activeTextLayer || !printAreaRef.current) {
      const clearFrame = window.requestAnimationFrame(() => {
        setActiveTextFrameMetrics(null);
        onActiveTextMetricsChange?.(null);
      });

      return () => window.cancelAnimationFrame(clearFrame);
    }

    const frame = window.requestAnimationFrame(() => {
      const printAreaBounds = printAreaRef.current?.getBoundingClientRect();
      const textLayerNode = textLayerRefs.current[activeTextLayer.id];
      const textContentNode = textContentLayerRefs.current[activeTextLayer.id];

      if (!printAreaBounds?.width || !printAreaBounds?.height || !textLayerNode || !textContentNode) {
        setActiveTextFrameMetrics(null);
        onActiveTextMetricsChange?.(null);
        return;
      }

      const textLayerBounds = textLayerNode.getBoundingClientRect();
      const textSelectionBounds = measureTextSelectionBounds(textContentNode);
      const boxWidthPx = Number(textLayerBounds.width.toFixed(2));
      const boxHeightPx = Number(Math.max(textLayerBounds.height, 1).toFixed(2));
      const contentWidthPx = Number(Math.max(textSelectionBounds?.width || 0, 0).toFixed(2));
      const contentHeightPx = Number(Math.max(textSelectionBounds?.height || 0, 0).toFixed(2));

      setActiveTextFrameMetrics((currentValue) => {
        const nextValue = {
          layerId: activeTextLayer.id,
          boxWidthPx,
          boxHeightPx,
          contentWidthPx,
          contentHeightPx,
        };

        if (
          currentValue?.layerId === nextValue.layerId
          && currentValue?.boxWidthPx === nextValue.boxWidthPx
          && currentValue?.boxHeightPx === nextValue.boxHeightPx
          && currentValue?.contentWidthPx === nextValue.contentWidthPx
          && currentValue?.contentHeightPx === nextValue.contentHeightPx
        ) {
          return currentValue;
        }

        return nextValue;
      });

      onActiveTextMetricsChange?.({
        contentWidthCm: Number(((contentWidthPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        contentHeightCm: Number(((contentHeightPx / printAreaBounds.height) * physicalHeightCm).toFixed(1)),
        boxWidthCm: Number(((boxWidthPx / printAreaBounds.width) * physicalWidthCm).toFixed(1)),
        boxHeightCm: Number(((boxHeightPx / printAreaBounds.height) * physicalHeightCm).toFixed(1)),
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeLayerId, layers, editingTextLayerId, onActiveTextMetricsChange, physicalHeightCm, physicalWidthCm, printAreaRef, resizingLayerId]);

  const getLayerRenderSize = (layer) => ({
    width: `${((layer.widthCm || 1) / physicalWidthCm) * 100}%`,
    height: `${((layer.heightCm || 1) / physicalHeightCm) * 100}%`,
  });

  const getAllSnapGuidesPx = (excludeLayerId, areaBounds) => {
    const guides = getSnapGuidesPx(areaBounds.width, areaBounds.height);

    layers.forEach((layer) => {
      if (!layer.visible || layer.id === excludeLayerId) return;
      const node = layerElementRefs.current[layer.id];
      if (!node) return;
      const bounds = getMeasuredLayerBounds(layer, node, textContentLayerRefs.current[layer.id]);
      if (!bounds?.width || !bounds?.height) return;
      const left = bounds.left - areaBounds.left;
      const top = bounds.top - areaBounds.top;
      const right = left + bounds.width;
      const bottom = top + bounds.height;
      guides.vertical.push(left, (left + right) / 2, right);
      guides.horizontal.push(top, (top + bottom) / 2, bottom);
    });

    return guides;
  };

  const renderDeleteButton = (layer) => {
    if (!layer || layer.id !== activeLayerId || layer.locked) return null;

    return (
      <button
        type="button"
        data-constructor-interactive="true"
        aria-label={`Удалить слой ${layer.name}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemoveLayer?.(layer.id);
        }}
        style={{
          position: "absolute",
          right: 0,
          top: "100%",
          transform: "translateY(8px)",
          width: 30,
          height: 30,
          padding: 0,
          borderRadius: 10,
          border: "1px solid rgba(232,67,147,.22)",
          background: "rgba(232,67,147,.08)",
          color: "rgba(255,194,222,.86)",
          boxShadow: "0 10px 18px rgba(0,0,0,.2)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 6,
        }}
      >
        <DeleteIcon />
      </button>
    );
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

    onHistoryCheckpoint?.();

    const startPointer = { x: event.clientX, y: event.clientY };
    const startWidthCm = layer.widthCm ?? 0;
    const startHeightCm = layer.heightCm ?? 0;
    const startRenderedWidth = layerBounds.width;
    const startRenderedHeight = layerBounds.height;

    const updateResize = (clientX, clientY) => {
      const deltaX = clientX - startPointer.x;
      const deltaY = clientY - startPointer.y;
      setResizeSnapGuides([]);
      const horizontalGrowth = handle.x === 0 ? 0 : deltaX * handle.x * 2;
      const verticalGrowth = handle.y === 0 ? 0 : deltaY * handle.y * 2;

      if (layer.type === "text") {
        const minTextBoxSizePx = 20;
        const startBoundsLeft = layerBounds.left - printAreaBounds.left;
        const startBoundsTop = layerBounds.top - printAreaBounds.top;
        const startBoundsRight = startBoundsLeft + startRenderedWidth;
        const startBoundsBottom = startBoundsTop + startRenderedHeight;

        if (handle.x !== 0 && handle.y === 0) {
          const guides = getAllSnapGuidesPx(layer.id, printAreaBounds);
          let nextLeftPx = startBoundsLeft;
          let nextRightPx = startBoundsRight;
          let snappedGuide = null;

          if (handle.x > 0) {
            const proposedRight = clamp(startBoundsRight + deltaX, startBoundsLeft + minTextBoxSizePx, printAreaBounds.width);
            const snapped = snapValueToGuides(proposedRight, guides.vertical);
            nextRightPx = clamp(snapped.valuePx, startBoundsLeft + minTextBoxSizePx, printAreaBounds.width);
            snappedGuide = snapped.guide;
          } else {
            const proposedLeft = clamp(startBoundsLeft + deltaX, 0, startBoundsRight - minTextBoxSizePx);
            const snapped = snapValueToGuides(proposedLeft, guides.vertical);
            nextLeftPx = clamp(snapped.valuePx, 0, startBoundsRight - minTextBoxSizePx);
            snappedGuide = snapped.guide;
          }

          const nextWidthPx = Math.max(minTextBoxSizePx, nextRightPx - nextLeftPx);
          const nextCenterX = (nextLeftPx + nextRightPx) / 2;

          setResizeSnapGuides(snappedGuide == null ? [] : [{ orientation: "vertical", positionPercent: (snappedGuide / printAreaBounds.width) * 100 }]);

          onLayerResize(layer.id, {
            textBoxWidth: (nextWidthPx / printAreaBounds.width) * 100,
            position: {
              x: (nextCenterX / printAreaBounds.width) * 100,
              y: layer.position.y,
            },
          });
          return;
        }

        if (isCornerHandle(handle)) {
          const guides = getAllSnapGuidesPx(layer.id, printAreaBounds);
          const fixedCornerX = handle.x > 0 ? startBoundsLeft : startBoundsRight;
          const fixedCornerY = handle.y > 0 ? startBoundsTop : startBoundsBottom;
          const startDraggedCornerX = handle.x > 0 ? startBoundsRight : startBoundsLeft;
          const startDraggedCornerY = handle.y > 0 ? startBoundsBottom : startBoundsTop;
          const proposedDraggedCornerX = startDraggedCornerX + deltaX;
          const proposedDraggedCornerY = startDraggedCornerY + deltaY;
          const snappedX = snapValueToGuides(proposedDraggedCornerX, guides.vertical);
          const snappedY = snapValueToGuides(proposedDraggedCornerY, guides.horizontal);
          const draggedCornerX = handle.x > 0
            ? clamp(snappedX.valuePx, fixedCornerX + minTextBoxSizePx, printAreaBounds.width)
            : clamp(snappedX.valuePx, 0, fixedCornerX - minTextBoxSizePx);
          const draggedCornerY = handle.y > 0
            ? clamp(snappedY.valuePx, fixedCornerY + minTextBoxSizePx, printAreaBounds.height)
            : clamp(snappedY.valuePx, 0, fixedCornerY - minTextBoxSizePx);

          const requestedWidthPx = Math.abs(draggedCornerX - fixedCornerX);
          const requestedHeightPx = Math.abs(draggedCornerY - fixedCornerY);
          const widthMultiplier = requestedWidthPx / Math.max(1, startRenderedWidth);
          const heightMultiplier = requestedHeightPx / Math.max(1, startRenderedHeight);
          const requestedMultiplier = Math.abs(widthMultiplier - 1) >= Math.abs(heightMultiplier - 1)
            ? widthMultiplier
            : heightMultiplier;
          const minMultiplier = Math.max(
            minTextBoxSizePx / Math.max(1, startRenderedWidth),
            minTextBoxSizePx / Math.max(1, startRenderedHeight),
            0.2,
          );
          const maxWidthPx = handle.x > 0 ? printAreaBounds.width - fixedCornerX : fixedCornerX;
          const maxHeightPx = handle.y > 0 ? printAreaBounds.height - fixedCornerY : fixedCornerY;
          const maxMultiplier = Math.max(minMultiplier, Math.min(
            maxWidthPx / Math.max(1, startRenderedWidth),
            maxHeightPx / Math.max(1, startRenderedHeight),
          ));
          const uniformMultiplier = clamp(requestedMultiplier, minMultiplier, maxMultiplier);
          const nextWidthPx = Math.max(minTextBoxSizePx, startRenderedWidth * uniformMultiplier);
          const nextHeightPx = Math.max(minTextBoxSizePx, startRenderedHeight * uniformMultiplier);

          let nextLeftPx;
          let nextRightPx;
          let nextTopPx;
          let nextBottomPx;

          if (handle.x > 0) {
            nextLeftPx = fixedCornerX;
            nextRightPx = fixedCornerX + nextWidthPx;
          } else {
            nextRightPx = fixedCornerX;
            nextLeftPx = fixedCornerX - nextWidthPx;
          }

          if (handle.y > 0) {
            nextTopPx = fixedCornerY;
            nextBottomPx = fixedCornerY + nextHeightPx;
          } else {
            nextBottomPx = fixedCornerY;
            nextTopPx = fixedCornerY - nextHeightPx;
          }

          const nextCenterX = (nextLeftPx + nextRightPx) / 2;
          const nextCenterY = (nextTopPx + nextBottomPx) / 2;

          setResizeSnapGuides(dedupeGuides([
            ...(snappedX.guide == null ? [] : [{ orientation: "vertical", positionPercent: (snappedX.guide / printAreaBounds.width) * 100 }]),
            ...(snappedY.guide == null ? [] : [{ orientation: "horizontal", positionPercent: (snappedY.guide / printAreaBounds.height) * 100 }]),
          ]));

          onLayerResize(layer.id, {
            size: (layer.size ?? 36) * uniformMultiplier,
            textBoxWidth: (nextWidthPx / printAreaBounds.width) * 100,
            letterSpacing: (layer.letterSpacing ?? 1) * uniformMultiplier,
            strokeWidth: (layer.strokeWidth ?? 0) * uniformMultiplier,
            position: {
              x: (nextCenterX / printAreaBounds.width) * 100,
              y: (nextCenterY / printAreaBounds.height) * 100,
            },
            ...(layer.shadowEnabled ? {
              shadowOffsetX: (layer.shadowOffsetX ?? 0) * uniformMultiplier,
              shadowOffsetY: (layer.shadowOffsetY ?? 2) * uniformMultiplier,
              shadowBlur: (layer.shadowBlur ?? 14) * uniformMultiplier,
            } : {}),
          });
          return;
        }
        return;
      }

      const nextWidthCm = startWidthCm + ((horizontalGrowth / printAreaBounds.width) * physicalWidthCm);
      const nextHeightCm = startHeightCm + ((verticalGrowth / printAreaBounds.height) * physicalHeightCm);

      if (isCornerHandle(handle)) {
        const guides = getAllSnapGuidesPx(layer.id, printAreaBounds);
        const startBoundsLeft = layerBounds.left - printAreaBounds.left;
        const startBoundsTop = layerBounds.top - printAreaBounds.top;
        const startBoundsRight = startBoundsLeft + startRenderedWidth;
        const startBoundsBottom = startBoundsTop + startRenderedHeight;
        const fixedCornerX = handle.x > 0 ? startBoundsLeft : startBoundsRight;
        const fixedCornerY = handle.y > 0 ? startBoundsTop : startBoundsBottom;
        const startDraggedCornerX = handle.x > 0 ? startBoundsRight : startBoundsLeft;
        const startDraggedCornerY = handle.y > 0 ? startBoundsBottom : startBoundsTop;
        const proposedDraggedCornerX = startDraggedCornerX + deltaX;
        const proposedDraggedCornerY = startDraggedCornerY + deltaY;
        const snappedX = snapValueToGuides(proposedDraggedCornerX, guides.vertical);
        const snappedY = snapValueToGuides(proposedDraggedCornerY, guides.horizontal);
        const draggedCornerX = handle.x > 0
          ? clamp(snappedX.valuePx, fixedCornerX + 1, printAreaBounds.width)
          : clamp(snappedX.valuePx, 0, fixedCornerX - 1);
        const draggedCornerY = handle.y > 0
          ? clamp(snappedY.valuePx, fixedCornerY + 1, printAreaBounds.height)
          : clamp(snappedY.valuePx, 0, fixedCornerY - 1);

        const requestedWidthPx = Math.abs(draggedCornerX - fixedCornerX);
        const requestedHeightPx = Math.abs(draggedCornerY - fixedCornerY);
        const widthMultiplier = requestedWidthPx / Math.max(1, startRenderedWidth);
        const heightMultiplier = requestedHeightPx / Math.max(1, startRenderedHeight);
        const requestedMultiplier = Math.abs(widthMultiplier - 1) >= Math.abs(heightMultiplier - 1)
          ? widthMultiplier
          : heightMultiplier;
        const maxWidthPx = handle.x > 0 ? printAreaBounds.width - fixedCornerX : fixedCornerX;
        const maxHeightPx = handle.y > 0 ? printAreaBounds.height - fixedCornerY : fixedCornerY;
        const maxMultiplier = Math.max(0.05, Math.min(
          maxWidthPx / Math.max(1, startRenderedWidth),
          maxHeightPx / Math.max(1, startRenderedHeight),
        ));
        const uniformMultiplier = clamp(requestedMultiplier, 0.05, maxMultiplier);
        const nextWidthPx = Math.max(1, startRenderedWidth * uniformMultiplier);
        const nextHeightPx = Math.max(1, startRenderedHeight * uniformMultiplier);

        let nextLeftPx;
        let nextRightPx;
        let nextTopPx;
        let nextBottomPx;

        if (handle.x > 0) {
          nextLeftPx = fixedCornerX;
          nextRightPx = fixedCornerX + nextWidthPx;
        } else {
          nextRightPx = fixedCornerX;
          nextLeftPx = fixedCornerX - nextWidthPx;
        }

        if (handle.y > 0) {
          nextTopPx = fixedCornerY;
          nextBottomPx = fixedCornerY + nextHeightPx;
        } else {
          nextBottomPx = fixedCornerY;
          nextTopPx = fixedCornerY - nextHeightPx;
        }

        const nextCenterX = (nextLeftPx + nextRightPx) / 2;
        const nextCenterY = (nextTopPx + nextBottomPx) / 2;

        setResizeSnapGuides(dedupeGuides([
          ...(snappedX.guide == null ? [] : [{ orientation: "vertical", positionPercent: (snappedX.guide / printAreaBounds.width) * 100 }]),
          ...(snappedY.guide == null ? [] : [{ orientation: "horizontal", positionPercent: (snappedY.guide / printAreaBounds.height) * 100 }]),
        ]));

        onLayerResize(layer.id, {
          widthCm: startWidthCm * uniformMultiplier,
          heightCm: startHeightCm * uniformMultiplier,
          position: {
            x: (nextCenterX / printAreaBounds.width) * 100,
            y: (nextCenterY / printAreaBounds.height) * 100,
          },
        });
        return;
      }

      onLayerResize(layer.id, {
        ...(handle.x !== 0 ? { widthCm: nextWidthCm } : {}),
        ...(handle.y !== 0 ? { heightCm: nextHeightCm } : {}),
      });
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
      setResizeSnapGuides([]);
      node.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  };

  const renderResizeHandles = (layer) => {
    if (layer.locked || layer.id !== activeLayerId) return null;

    const handles = layer.type === "text"
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
        }}
      />
    ));

    return buttons;
  };

  const handlePreviewBackgroundPointerDown = (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-constructor-interactive="true"]')) return;
    setResizeSnapGuides([]);
    onPreviewBackgroundPointerDown?.();
  };

  const visibleSnapGuides = dedupeGuides([...(activeSnapGuides || []), ...resizeSnapGuides]);

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
          {visibleSnapGuides.map((guide, index) => (
            <div
              key={`snap-guide-${guide.orientation}-${index}-${guide.positionPercent.toFixed(3)}`}
              aria-hidden="true"
              style={guide.orientation === "vertical"
                ? { position: "absolute", top: 0, bottom: 0, left: `${guide.positionPercent}%`, width: 1, transform: "translateX(-0.5px)", background: "linear-gradient(180deg, rgba(90,160,255,.08), rgba(90,160,255,.96), rgba(90,160,255,.08))", boxShadow: "0 0 0 1px rgba(90,160,255,.12), 0 0 12px rgba(90,160,255,.28)", pointerEvents: "none", zIndex: 50 }
                : { position: "absolute", left: 0, right: 0, top: `${guide.positionPercent}%`, height: 1, transform: "translateY(-0.5px)", background: "linear-gradient(90deg, rgba(90,160,255,.08), rgba(90,160,255,.96), rgba(90,160,255,.08))", boxShadow: "0 0 0 1px rgba(90,160,255,.12), 0 0 12px rgba(90,160,255,.28)", pointerEvents: "none", zIndex: 50 }
              }
            />
          ))}
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
                  ref={(node) => { layerElementRefs.current[layer.id] = node; }}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: "translate(-50%, -50%)", width: layerSize.width, height: layerSize.height, maxWidth: "100%", maxHeight: "100%", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: frameStyle, borderRadius: 14, zIndex: index + 1 }}
                >
                  <img src={preset.src} alt={preset.label} draggable={false} style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "fill", display: "block", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.25))" }} />
                  {renderResizeHandles(layer)}
                  {renderDeleteButton(layer)}
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
                  ref={(node) => { layerElementRefs.current[layer.id] = node; }}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: "translate(-50%, -50%)", width: layerSize.width, height: layerSize.height, maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: frameStyle, borderRadius: 14, zIndex: index + 1 }}
                >
                  <img src={layer.src} alt={layer.uploadName} draggable={false} style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.24))", userSelect: "none", WebkitUserDrag: "none" }} />
                  {renderResizeHandles(layer)}
                  {renderDeleteButton(layer)}
                </div>
              );
            }

            if (layer.type === "shape") {
              const shape = getShapeByKey(layer.shapeKey);
              if (!shape) return null;
              const layerSize = getLayerRenderSize(layer);
              const shapeGradient = layer.fillMode === "gradient" ? getTextGradientByKey(layer.gradientKey) : null;
              const shapeSrc = svgToDataUri(buildConstructorShapeSvg({
                shape,
                fillMode: layer.fillMode,
                color: layer.color,
                gradient: shapeGradient,
                strokeStyle: layer.strokeStyle,
                strokeColor: layer.strokeColor,
                strokeWidth: layer.strokeWidth,
              }));
              const effectOffset = getDirectionalOffset(layer.effectAngle ?? -45, layer.effectDistance ?? 0);
              const shadowSrc = svgToDataUri(buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.effectColor || "#824ef0",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
              }));
              const distortSrcA = svgToDataUri(buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.distortionColorA || "#ed5bb7",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
              }));
              const distortSrcB = svgToDataUri(buildConstructorShapeSvg({
                shape,
                fillMode: "solid",
                color: layer.distortionColorB || "#1cb8d8",
                strokeStyle: layer.strokeStyle,
                strokeColor: "transparent",
                strokeWidth: layer.strokeWidth,
              }));

              return (
                <div
                  key={layer.id}
                  data-constructor-interactive="true"
                  role="presentation"
                  onPointerDown={(event) => onLayerPointerDown(layer.id, event)}
                  onDoubleClick={() => onLayerEditOpen(layer.id)}
                  ref={(node) => { layerElementRefs.current[layer.id] = node; }}
                  style={{ position: "absolute", left: `${layer.position.x}%`, top: `${layer.position.y}%`, transform: "translate(-50%, -50%)", width: layerSize.width, height: layerSize.height, maxWidth: "100%", maxHeight: "100%", pointerEvents: "auto", cursor: layer.locked ? "default" : dragging ? "grabbing" : "grab", touchAction: "none", boxShadow: frameStyle, borderRadius: 0, zIndex: index + 1 }}
                >
                  <div style={{ position: "relative", width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" }}>
                    {layer.effectType === "drop-shadow" ? (
                      <img src={shadowSrc} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "fill", display: "block", transform: `translate(${effectOffset.x}px, ${effectOffset.y}px)`, opacity: 0.78, userSelect: "none", WebkitUserDrag: "none", pointerEvents: "none" }} />
                    ) : null}
                    {layer.effectType === "distort" ? (
                      <>
                        <img src={distortSrcA} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "fill", display: "block", transform: `translate(${effectOffset.x}px, ${effectOffset.y}px)`, opacity: 1, userSelect: "none", WebkitUserDrag: "none", pointerEvents: "none" }} />
                        <img src={distortSrcB} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "fill", display: "block", transform: `translate(${-effectOffset.x}px, ${-effectOffset.y}px)`, opacity: 1, userSelect: "none", WebkitUserDrag: "none", pointerEvents: "none" }} />
                      </>
                    ) : null}
                    <img src={shapeSrc} alt={shape.label} draggable={false} style={{ position: "relative", width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "fill", display: "block", userSelect: "none", WebkitUserDrag: "none" }} />
                  </div>
                  {renderResizeHandles(layer)}
                  {renderDeleteButton(layer)}
                </div>
              );
            }

            const overlayText = layer.value;
            const editing = layer.id === editingTextLayerId;
            const hasVisibleText = overlayText.trim().length > 0;
            const showEmptyTextPlaceholder = !hasVisibleText;

            const showTextBoxGuides = active || !hasVisibleText;
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
            const textMinHeight = !hasVisibleText
              ? `${Math.max(layer.size * (layer.lineHeight ?? 1.05), layer.size)}px`
              : undefined;
            return (
              <div
                key={layer.id}
                data-constructor-interactive="true"
                ref={(node) => { layerElementRefs.current[layer.id] = node; textLayerRefs.current[layer.id] = node; }}
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
                    onFocus={() => onEditingTextLayerChange(layer.id)}
                    onBlur={() => onEditingTextLayerChange(null)}
                    onInput={(event) => {
                      const nextValue = event.currentTarget.innerText.replace(/\r/g, "").replace(/\n$/, "");
                      onActiveTextValueChange(nextValue);
                    }}
                    style={{ minHeight: textMinHeight, outline: "none", cursor: "text", color: activeGradient ? "transparent" : layer.color, backgroundImage: activeGradient ? activeGradient.css : "none", WebkitBackgroundClip: activeGradient ? "text" : "border-box", backgroundClip: activeGradient ? "text" : "border-box", WebkitTextFillColor: activeGradient ? "transparent" : layer.color, caretColor: layer.color || "#f0eef5", fontStyle, textTransform: "none", textDecorationLine, textDecorationColor: decorationColor, textDecorationThickness: textDecorationLine === "none" ? undefined : "0.08em", textUnderlineOffset: layer.underline ? "0.14em" : undefined, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word", hyphens: "none", padding: 0, margin: 0 }}
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
                {renderDeleteButton(layer)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

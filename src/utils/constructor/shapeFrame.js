import { getConstructorShape, getConstructorShapeTightBounds } from "../../components/constructor/constructorConfig.js";

function getDirectionalOffset(angle, distance) {
  const radians = ((Number(angle) || 0) * Math.PI) / 180;
  const radius = Math.max(0, Number(distance) || 0);

  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function getShapeStrokePaddingPx(layer, shape, baseWidthPx, baseHeightPx) {
  const resolvedShape = shape || getConstructorShape(layer?.shapeKey);
  const bounds = getConstructorShapeTightBounds(resolvedShape.key);
  const safeBoundsWidth = Math.max(1, Number(bounds?.width) || 1);
  const safeBoundsHeight = Math.max(1, Number(bounds?.height) || 1);
  const safeBaseWidthPx = Math.max(0, Number(baseWidthPx) || 0);
  const safeBaseHeightPx = Math.max(0, Number(baseHeightPx) || 0);
  const rawStrokeWidth = Math.max(0, Number(layer?.strokeWidth) || 0);
  const hasVisibleStroke = rawStrokeWidth > 0 && (resolvedShape.category === "lines" || layer?.strokeStyle !== "none");

  if (!hasVisibleStroke) {
    return { x: 0, y: 0 };
  }

  // Constructor shape stroke is treated as an inner stroke for factual sizing,
  // so it must not expand the outer visual bounds of the shape frame.
  if (resolvedShape.category === "lines") {
    return { x: 0, y: 0 };
  }

  return { x: 0, y: 0 };
}

export function getShapeFrameMetricsPx(layer, { baseWidthPx, baseHeightPx }) {
  const shape = getConstructorShape(layer?.shapeKey);
  const safeBaseWidthPx = Math.max(0, Number(baseWidthPx) || 0);
  const safeBaseHeightPx = Math.max(0, Number(baseHeightPx) || 0);
  const strokePadding = getShapeStrokePaddingPx(layer, shape, safeBaseWidthPx, safeBaseHeightPx);
  const effectOffset = getDirectionalOffset(layer?.effectAngle ?? -45, layer?.effectDistance ?? 0);
  const effectType = layer?.effectType || "none";

  let leftEffectPaddingPx = 0;
  let rightEffectPaddingPx = 0;
  let topEffectPaddingPx = 0;
  let bottomEffectPaddingPx = 0;

  if (effectType === "drop-shadow") {
    leftEffectPaddingPx = Math.max(0, -effectOffset.x);
    rightEffectPaddingPx = Math.max(0, effectOffset.x);
    topEffectPaddingPx = Math.max(0, -effectOffset.y);
    bottomEffectPaddingPx = Math.max(0, effectOffset.y);
  }

  if (effectType === "distort") {
    leftEffectPaddingPx = Math.abs(effectOffset.x);
    rightEffectPaddingPx = Math.abs(effectOffset.x);
    topEffectPaddingPx = Math.abs(effectOffset.y);
    bottomEffectPaddingPx = Math.abs(effectOffset.y);
  }

  const leftPaddingPx = strokePadding.x + leftEffectPaddingPx;
  const rightPaddingPx = strokePadding.x + rightEffectPaddingPx;
  const topPaddingPx = strokePadding.y + topEffectPaddingPx;
  const bottomPaddingPx = strokePadding.y + bottomEffectPaddingPx;

  return {
    baseWidthPx: safeBaseWidthPx,
    baseHeightPx: safeBaseHeightPx,
    contentWidthPx: safeBaseWidthPx,
    contentHeightPx: safeBaseHeightPx,
    leftPaddingPx,
    rightPaddingPx,
    topPaddingPx,
    bottomPaddingPx,
    frameWidthPx: safeBaseWidthPx + leftPaddingPx + rightPaddingPx,
    frameHeightPx: safeBaseHeightPx + topPaddingPx + bottomPaddingPx,
  };
}
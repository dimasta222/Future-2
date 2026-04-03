const MIN_TEXT_BOX_WIDTH_PX = 4;
const MIN_TEXT_HEIGHT_PX = 4;
const MIN_TEXT_FONT_SIZE = 12;
const TEXT_BOX_MIN_WIDTH_SAFETY_PX = 2;

const textMeasureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const textMeasureContext = textMeasureCanvas?.getContext?.("2d") || null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isCornerHandle(handle) {
  return handle?.x !== 0 && handle?.y !== 0;
}

function getTextMeasureFont(layer) {
  const safeFontSize = Math.max(1, Number(layer?.size) || 36);
  const fontStyle = layer?.italic ? "italic" : "normal";
  const fontWeight = Number(layer?.weight) || 400;
  const fontFamily = layer?.fontFamily || "'Outfit', sans-serif";
  return `${fontStyle} ${fontWeight} ${safeFontSize}px ${fontFamily}`;
}

function getMinimalTextBoxWidthPx(layer) {
  if (!layer || !textMeasureContext) return MIN_TEXT_BOX_WIDTH_PX;

  const resolvedText = String(layer.value || "").replace(/\r/g, "");
  const renderedText = layer.uppercase ? resolvedText.toUpperCase() : resolvedText;
  const glyphs = Array.from(renderedText).filter((char) => char !== "\n");
  if (!glyphs.length) return MIN_TEXT_BOX_WIDTH_PX;

  const nonWhitespaceGlyphs = glyphs.filter((char) => char.trim().length > 0);
  const measureChars = nonWhitespaceGlyphs.length ? nonWhitespaceGlyphs : glyphs;

  textMeasureContext.font = getTextMeasureFont(layer);
  const widestGlyphWidth = measureChars.reduce((maxWidth, glyph) => {
    const glyphWidth = textMeasureContext.measureText(glyph).width;
    return Math.max(maxWidth, glyphWidth);
  }, 0);

  const strokePadding = Math.max(0, Number(layer.strokeWidth) || 0) * 2;
  const minWidthPx = Math.ceil(widestGlyphWidth + strokePadding + TEXT_BOX_MIN_WIDTH_SAFETY_PX);
  return Math.max(MIN_TEXT_BOX_WIDTH_PX, minWidthPx);
}

export function resizeTextLayer({
  layer,
  handle,
  pointer,
  printAreaBounds,
  dragState,
}) {
  if (!layer || !handle || !pointer || !printAreaBounds || !dragState) return null;

  const {
    startRenderedWidth,
    startRenderedHeight,
    startTextBoxWidthPercent,
    startBoundsLeft,
    startBoundsTop,
    startBoundsRight,
    startBoundsBottom,
  } = dragState;

  if (handle.x !== 0 && handle.y === 0) {
    const minTextBoxWidthPx = getMinimalTextBoxWidthPx(layer);
    const clampedPointerX = Math.min(printAreaBounds.width, Math.max(0, pointer.x - printAreaBounds.left));
    let nextLeftPx = startBoundsLeft;
    let nextRightPx = startBoundsRight;

    if (handle.x > 0) {
      nextRightPx = Math.max(startBoundsLeft + minTextBoxWidthPx, clampedPointerX);
    } else {
      nextLeftPx = Math.min(startBoundsRight - minTextBoxWidthPx, clampedPointerX);
    }

    const nextWidthPx = Math.max(minTextBoxWidthPx, nextRightPx - nextLeftPx);
    const nextCenterX = (nextLeftPx + nextRightPx) / 2;

    return {
      textBoxWidth: (nextWidthPx / printAreaBounds.width) * 100,
      position: {
        x: (nextCenterX / printAreaBounds.width) * 100,
        y: layer.position.y,
      },
    };
  }

  if (!isCornerHandle(handle)) return null;

  const clampedPointerX = Math.min(printAreaBounds.width, Math.max(0, pointer.x - printAreaBounds.left));
  const clampedPointerY = Math.min(printAreaBounds.height, Math.max(0, pointer.y - printAreaBounds.top));
  const fixedX = handle.x > 0 ? startBoundsLeft : startBoundsRight;
  const fixedY = handle.y > 0 ? startBoundsTop : startBoundsBottom;
  const startVectorX = handle.x > 0 ? startRenderedWidth : -startRenderedWidth;
  const startVectorY = handle.y > 0 ? startRenderedHeight : -startRenderedHeight;
  const pointerVectorX = clampedPointerX - fixedX;
  const pointerVectorY = clampedPointerY - fixedY;
  const dot = (pointerVectorX * startVectorX) + (pointerVectorY * startVectorY);
  const base = Math.max(1, (startVectorX * startVectorX) + (startVectorY * startVectorY));
  const requestedMultiplier = dot / base;
  const maxWidthPx = handle.x > 0 ? (printAreaBounds.width - fixedX) : fixedX;
  const maxHeightPx = handle.y > 0 ? (printAreaBounds.height - fixedY) : fixedY;
  const minFontSizeMultiplier = MIN_TEXT_FONT_SIZE / Math.max(MIN_TEXT_FONT_SIZE, layer.size ?? MIN_TEXT_FONT_SIZE);
  const minWidthMultiplier = MIN_TEXT_BOX_WIDTH_PX / Math.max(1, startRenderedWidth);
  const minHeightMultiplier = MIN_TEXT_HEIGHT_PX / Math.max(1, startRenderedHeight);
  const maxWidthMultiplier = maxWidthPx / Math.max(1, startRenderedWidth);
  const maxHeightMultiplier = maxHeightPx / Math.max(1, startRenderedHeight);
  const minUniformMultiplier = Math.max(minFontSizeMultiplier, minWidthMultiplier, minHeightMultiplier);
  const maxUniformMultiplier = Math.max(minUniformMultiplier, Math.min(maxWidthMultiplier, maxHeightMultiplier));
  const uniformMultiplier = clamp(requestedMultiplier, minUniformMultiplier, maxUniformMultiplier);
  const nextWidthPx = Math.max(MIN_TEXT_BOX_WIDTH_PX, startRenderedWidth * uniformMultiplier);
  const nextHeightPx = Math.max(MIN_TEXT_HEIGHT_PX, startRenderedHeight * uniformMultiplier);

  let nextLeftPx = startBoundsLeft;
  let nextRightPx = startBoundsRight;
  let nextTopPx = startBoundsTop;
  let nextBottomPx = startBoundsBottom;

  if (handle.x > 0) {
    nextLeftPx = fixedX;
    nextRightPx = fixedX + nextWidthPx;
  } else {
    nextRightPx = fixedX;
    nextLeftPx = fixedX - nextWidthPx;
  }

  if (handle.y > 0) {
    nextTopPx = fixedY;
    nextBottomPx = fixedY + nextHeightPx;
  } else {
    nextBottomPx = fixedY;
    nextTopPx = fixedY - nextHeightPx;
  }

  const nextCenterX = (nextLeftPx + nextRightPx) / 2;
  const nextCenterY = (nextTopPx + nextBottomPx) / 2;

  return {
    size: (layer.size ?? 36) * uniformMultiplier,
    textBoxWidth: startTextBoxWidthPercent * uniformMultiplier,
    letterSpacing: (layer.letterSpacing ?? 1) * uniformMultiplier,
    strokeWidth: (layer.strokeWidth ?? 0) * uniformMultiplier,
    position: {
      x: (nextCenterX / printAreaBounds.width) * 100,
      y: (nextCenterY / printAreaBounds.height) * 100,
    },
    ...(layer.shadowEnabled
      ? {
        shadowOffsetX: (layer.shadowOffsetX ?? 0) * uniformMultiplier,
        shadowOffsetY: (layer.shadowOffsetY ?? 2) * uniformMultiplier,
        shadowBlur: (layer.shadowBlur ?? 14) * uniformMultiplier,
      }
      : {}),
  };
}

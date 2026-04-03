const MIN_ASSET_WIDTH_PX = 4;
const MIN_ASSET_HEIGHT_PX = 4;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isCornerHandle(handle) {
  return handle?.x !== 0 && handle?.y !== 0;
}

function getUniformCornerScaleMultiplier({
  requestedWidthPx,
  requestedHeightPx,
  startRenderedWidth,
  startRenderedHeight,
}) {
  const safeStartWidth = Math.max(MIN_ASSET_WIDTH_PX, Number(startRenderedWidth) || MIN_ASSET_WIDTH_PX);
  const safeStartHeight = Math.max(MIN_ASSET_HEIGHT_PX, Number(startRenderedHeight) || MIN_ASSET_HEIGHT_PX);
  const diagonalLengthSq = (safeStartWidth ** 2) + (safeStartHeight ** 2);

  if (!diagonalLengthSq) {
    return 1;
  }

  const projectedScale = (
    (requestedWidthPx * safeStartWidth) + (requestedHeightPx * safeStartHeight)
  ) / diagonalLengthSq;
  const minScale = Math.max(
    MIN_ASSET_WIDTH_PX / safeStartWidth,
    MIN_ASSET_HEIGHT_PX / safeStartHeight,
  );

  return Math.max(minScale, projectedScale);
}

export function resizeImageLayer({
  handle,
  pointer,
  printAreaBounds,
  dragState,
  physicalWidthCm,
  physicalHeightCm,
}) {
  if (!handle || !pointer || !printAreaBounds || !dragState) return null;

  const {
    startRenderedWidth,
    startRenderedHeight,
    startBoundsLeft,
    startBoundsTop,
    startBoundsRight,
    startBoundsBottom,
  } = dragState;

  const localPointerX = clamp(pointer.x - printAreaBounds.left, 0, printAreaBounds.width);
  const localPointerY = clamp(pointer.y - printAreaBounds.top, 0, printAreaBounds.height);
  const toWidthCm = (widthPx) => (widthPx / printAreaBounds.width) * physicalWidthCm;
  const toHeightCm = (heightPx) => (heightPx / printAreaBounds.height) * physicalHeightCm;
  const toPositionX = (xPx) => (xPx / printAreaBounds.width) * 100;
  const toPositionY = (yPx) => (yPx / printAreaBounds.height) * 100;

  if (isCornerHandle(handle)) {
    const fixedLeft = handle.x > 0 ? startBoundsLeft : null;
    const fixedRight = handle.x < 0 ? startBoundsRight : null;
    const fixedTop = handle.y > 0 ? startBoundsTop : null;
    const fixedBottom = handle.y < 0 ? startBoundsBottom : null;
    const requestedWidthPx = handle.x > 0
      ? Math.max(MIN_ASSET_WIDTH_PX, localPointerX - fixedLeft)
      : Math.max(MIN_ASSET_WIDTH_PX, fixedRight - localPointerX);
    const requestedHeightPx = handle.y > 0
      ? Math.max(MIN_ASSET_HEIGHT_PX, localPointerY - fixedTop)
      : Math.max(MIN_ASSET_HEIGHT_PX, fixedBottom - localPointerY);
    const uniformMultiplier = getUniformCornerScaleMultiplier({
      requestedWidthPx,
      requestedHeightPx,
      startRenderedWidth,
      startRenderedHeight,
    });
    const nextWidthPx = Math.max(MIN_ASSET_WIDTH_PX, startRenderedWidth * uniformMultiplier);
    const nextHeightPx = Math.max(MIN_ASSET_HEIGHT_PX, startRenderedHeight * uniformMultiplier);
    const nextLeft = handle.x > 0 ? fixedLeft : fixedRight - nextWidthPx;
    const nextTop = handle.y > 0 ? fixedTop : fixedBottom - nextHeightPx;

    return {
      widthCm: toWidthCm(nextWidthPx),
      heightCm: toHeightCm(nextHeightPx),
      position: {
        x: toPositionX(nextLeft + (nextWidthPx / 2)),
        y: toPositionY(nextTop + (nextHeightPx / 2)),
      },
    };
  }

  if (handle.x !== 0) {
    const nextLeft = handle.x > 0
      ? startBoundsLeft
      : clamp(localPointerX, 0, startBoundsRight - MIN_ASSET_WIDTH_PX);
    const nextRight = handle.x > 0
      ? Math.max(startBoundsLeft + MIN_ASSET_WIDTH_PX, localPointerX)
      : startBoundsRight;
    const requestedWidthPx = Math.max(MIN_ASSET_WIDTH_PX, nextRight - nextLeft);
    const nextWidthPx = Math.max(MIN_ASSET_WIDTH_PX, requestedWidthPx);

    return {
      widthCm: toWidthCm(nextWidthPx),
      position: {
        x: toPositionX(nextLeft + (nextWidthPx / 2)),
        y: toPositionY((startBoundsTop + startBoundsBottom) / 2),
      },
    };
  }

  if (handle.y !== 0) {
    const nextTop = handle.y > 0
      ? startBoundsTop
      : clamp(localPointerY, 0, startBoundsBottom - MIN_ASSET_HEIGHT_PX);
    const nextBottom = handle.y > 0
      ? Math.max(startBoundsTop + MIN_ASSET_HEIGHT_PX, localPointerY)
      : startBoundsBottom;
    const requestedHeightPx = Math.max(MIN_ASSET_HEIGHT_PX, nextBottom - nextTop);
    const nextHeightPx = Math.max(MIN_ASSET_HEIGHT_PX, requestedHeightPx);

    return {
      heightCm: toHeightCm(nextHeightPx),
      position: {
        x: toPositionX((startBoundsLeft + startBoundsRight) / 2),
        y: toPositionY(nextTop + (nextHeightPx / 2)),
      },
    };
  }

  return null;
}

import { getShapeFrameMetricsPx } from "../shapeFrame.js";

const MIN_SHAPE_WIDTH_PX = 4;
const MIN_SHAPE_HEIGHT_PX = 4;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isCornerHandle(handle) {
  return handle?.x !== 0 && handle?.y !== 0;
}

function getAnchoredOuterBounds({
  handle,
  localPointerX,
  localPointerY,
  startBoundsLeft,
  startBoundsTop,
  startBoundsRight,
  startBoundsBottom,
}) {
  if (handle.x !== 0) {
    return {
      left: handle.x > 0 ? startBoundsLeft : clamp(localPointerX, 0, startBoundsRight - MIN_SHAPE_WIDTH_PX),
      right: handle.x > 0 ? Math.max(startBoundsLeft + MIN_SHAPE_WIDTH_PX, localPointerX) : startBoundsRight,
      top: startBoundsTop,
      bottom: startBoundsBottom,
    };
  }

  if (handle.y !== 0) {
    return {
      left: startBoundsLeft,
      right: startBoundsRight,
      top: handle.y > 0 ? startBoundsTop : clamp(localPointerY, 0, startBoundsBottom - MIN_SHAPE_HEIGHT_PX),
      bottom: handle.y > 0 ? Math.max(startBoundsTop + MIN_SHAPE_HEIGHT_PX, localPointerY) : startBoundsBottom,
    };
  }

  return null;
}

function solveBaseSizeFromOuterSize(layer, outerWidthPx, outerHeightPx, fallbackWidthPx, fallbackHeightPx) {
  let baseWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, Number(fallbackWidthPx) || MIN_SHAPE_WIDTH_PX);
  let baseHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, Number(fallbackHeightPx) || MIN_SHAPE_HEIGHT_PX);

  for (let index = 0; index < 3; index += 1) {
    const frameMetrics = getShapeFrameMetricsPx(layer, { baseWidthPx, baseHeightPx });
    baseWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, outerWidthPx - frameMetrics.leftPaddingPx - frameMetrics.rightPaddingPx);
    baseHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, outerHeightPx - frameMetrics.topPaddingPx - frameMetrics.bottomPaddingPx);
  }

  return { baseWidthPx, baseHeightPx };
}

function getUniformCornerScaleMultiplier({
  requestedOuterWidthPx,
  requestedOuterHeightPx,
  startRenderedWidth,
  startRenderedHeight,
  startBaseWidthPx,
  startBaseHeightPx,
}) {
  const safeStartOuterWidth = Math.max(MIN_SHAPE_WIDTH_PX, Number(startRenderedWidth) || MIN_SHAPE_WIDTH_PX);
  const safeStartOuterHeight = Math.max(MIN_SHAPE_HEIGHT_PX, Number(startRenderedHeight) || MIN_SHAPE_HEIGHT_PX);
  const diagonalLengthSq = (safeStartOuterWidth ** 2) + (safeStartOuterHeight ** 2);

  if (!diagonalLengthSq) {
    return 1;
  }

  const projectedScale = (
    (requestedOuterWidthPx * safeStartOuterWidth) + (requestedOuterHeightPx * safeStartOuterHeight)
  ) / diagonalLengthSq;
  const minScale = Math.max(
    MIN_SHAPE_WIDTH_PX / Math.max(MIN_SHAPE_WIDTH_PX, startBaseWidthPx),
    MIN_SHAPE_HEIGHT_PX / Math.max(MIN_SHAPE_HEIGHT_PX, startBaseHeightPx),
  );

  return Math.max(minScale, projectedScale);
}

export function resizeShapeLayer({
  layer,
  handle,
  pointer,
  printAreaBounds,
  dragState,
  physicalWidthCm,
  physicalHeightCm,
}) {
  if (!handle || !pointer || !printAreaBounds || !dragState) return null;

  const {
    startWidthCm,
    startHeightCm,
    startRenderedWidth,
    startRenderedHeight,
    startBoundsLeft,
    startBoundsTop,
    startBoundsRight,
    startBoundsBottom,
  } = dragState;

  const localPointerX = clamp(pointer.x - printAreaBounds.left, 0, printAreaBounds.width);
  const localPointerY = clamp(pointer.y - printAreaBounds.top, 0, printAreaBounds.height);
  const startBaseWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, ((startWidthCm || 1) / physicalWidthCm) * printAreaBounds.width);
  const startBaseHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, ((startHeightCm || 1) / physicalHeightCm) * printAreaBounds.height);
  const toWidthCm = (widthPx) => (widthPx / printAreaBounds.width) * physicalWidthCm;
  const toHeightCm = (heightPx) => (heightPx / printAreaBounds.height) * physicalHeightCm;
  const toPositionX = (xPx) => (xPx / printAreaBounds.width) * 100;
  const toPositionY = (yPx) => (yPx / printAreaBounds.height) * 100;

  if (isCornerHandle(handle)) {
    const fixedOuterLeft = handle.x > 0 ? startBoundsLeft : null;
    const fixedOuterRight = handle.x < 0 ? startBoundsRight : null;
    const fixedOuterTop = handle.y > 0 ? startBoundsTop : null;
    const fixedOuterBottom = handle.y < 0 ? startBoundsBottom : null;

    const requestedOuterWidthPx = handle.x > 0
      ? Math.max(MIN_SHAPE_WIDTH_PX, localPointerX - fixedOuterLeft)
      : Math.max(MIN_SHAPE_WIDTH_PX, fixedOuterRight - localPointerX);
    const requestedOuterHeightPx = handle.y > 0
      ? Math.max(MIN_SHAPE_HEIGHT_PX, localPointerY - fixedOuterTop)
      : Math.max(MIN_SHAPE_HEIGHT_PX, fixedOuterBottom - localPointerY);

    const uniformMultiplier = getUniformCornerScaleMultiplier({
      requestedOuterWidthPx,
      requestedOuterHeightPx,
      startRenderedWidth,
      startRenderedHeight,
      startBaseWidthPx,
      startBaseHeightPx,
    });
    const nextBaseWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, startBaseWidthPx * uniformMultiplier);
    const nextBaseHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, startBaseHeightPx * uniformMultiplier);
    const nextFrameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx: nextBaseWidthPx,
      baseHeightPx: nextBaseHeightPx,
    });
    const nextOuterWidthPx = nextFrameMetrics.frameWidthPx;
    const nextOuterHeightPx = nextFrameMetrics.frameHeightPx;
    const nextOuterLeft = handle.x > 0 ? fixedOuterLeft : fixedOuterRight - nextOuterWidthPx;
    const nextOuterTop = handle.y > 0 ? fixedOuterTop : fixedOuterBottom - nextOuterHeightPx;
    const nextCenterX = nextOuterLeft + (nextOuterWidthPx / 2);
    const nextCenterY = nextOuterTop + (nextOuterHeightPx / 2);

    return {
      widthCm: toWidthCm(nextBaseWidthPx),
      heightCm: toHeightCm(nextBaseHeightPx),
      position: {
        x: toPositionX(nextCenterX),
        y: toPositionY(nextCenterY),
      },
    };
  }

  if (handle.x !== 0) {
    const nextOuterBounds = getAnchoredOuterBounds({
      handle,
      localPointerX,
      localPointerY,
      startBoundsLeft,
      startBoundsTop,
      startBoundsRight,
      startBoundsBottom,
    });
    const nextOuterWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, nextOuterBounds.right - nextOuterBounds.left);
    const nextBaseSize = solveBaseSizeFromOuterSize(
      layer,
      nextOuterWidthPx,
      startRenderedHeight,
      startBaseWidthPx,
      startBaseHeightPx,
    );
    const nextFrameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx: nextBaseSize.baseWidthPx,
      baseHeightPx: startBaseHeightPx,
    });
    const nextCenterX = nextOuterBounds.left + (nextFrameMetrics.frameWidthPx / 2);

    return {
      widthCm: toWidthCm(nextBaseSize.baseWidthPx),
      position: {
        x: toPositionX(nextCenterX),
        y: layer.position.y,
      },
    };
  }

  if (handle.y !== 0) {
    const nextOuterBounds = getAnchoredOuterBounds({
      handle,
      localPointerX,
      localPointerY,
      startBoundsLeft,
      startBoundsTop,
      startBoundsRight,
      startBoundsBottom,
    });
    const nextOuterHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, nextOuterBounds.bottom - nextOuterBounds.top);
    const nextBaseSize = solveBaseSizeFromOuterSize(
      layer,
      startRenderedWidth,
      nextOuterHeightPx,
      startBaseWidthPx,
      startBaseHeightPx,
    );
    const nextFrameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx: startBaseWidthPx,
      baseHeightPx: nextBaseSize.baseHeightPx,
    });
    const nextCenterY = nextOuterBounds.top + (nextFrameMetrics.frameHeightPx / 2);

    return {
      heightCm: toHeightCm(nextBaseSize.baseHeightPx),
      position: {
        x: layer.position.x,
        y: toPositionY(nextCenterY),
      },
    };
  }

  return null;
}

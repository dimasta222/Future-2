import { getConstructorLineMinAspectRatio } from "../../../components/constructor/constructorConfig.js";
import { getShapeFrameMetricsPx } from "../shapeFrame.js";

const MIN_SHAPE_WIDTH_PX = 4;
const MIN_SHAPE_HEIGHT_PX = 4;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getLineRotationRadians(rotationDeg) {
  return ((Number(rotationDeg) || 0) * Math.PI) / 180;
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
    startBaseWidthPx,
    startBaseHeightPx,
    lineLeftInsetPx,
    lineRightInsetPx,
    isLineShape,
    logicalPrintAreaWidthPx,
    logicalPrintAreaHeightPx,
    rotationDeg,
  } = dragState;

  const rawLocalPointerX = pointer.x - printAreaBounds.left;
  const rawLocalPointerY = pointer.y - printAreaBounds.top;
  const localPointerX = clamp(rawLocalPointerX, 0, printAreaBounds.width);
  const localPointerY = clamp(rawLocalPointerY, 0, printAreaBounds.height);
  const resolvedStartBaseWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, Number(startBaseWidthPx) || (((startWidthCm || 1) / physicalWidthCm) * printAreaBounds.width));
  const resolvedStartBaseHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, Number(startBaseHeightPx) || (((startHeightCm || 1) / physicalHeightCm) * printAreaBounds.height));
  const toWidthValue = (widthPx) => (isLineShape
    ? (widthPx / printAreaBounds.width) * Math.max(1, Number(logicalPrintAreaWidthPx) || printAreaBounds.width)
    : (widthPx / printAreaBounds.width) * physicalWidthCm);
  const toHeightValue = (heightPx) => (isLineShape
    ? (heightPx / printAreaBounds.height) * Math.max(1, Number(logicalPrintAreaHeightPx) || printAreaBounds.height)
    : (heightPx / printAreaBounds.height) * physicalHeightCm);
  const toPositionX = (xPx) => (xPx / printAreaBounds.width) * 100;
  const toPositionY = (yPx) => (yPx / printAreaBounds.height) * 100;

  if (isLineShape && handle.x !== 0 && handle.y === 0) {
    const centerX = (startBoundsLeft + startBoundsRight) / 2;
    const centerY = (startBoundsTop + startBoundsBottom) / 2;
    const startRadians = getLineRotationRadians(rotationDeg);
    const leftOffsetFromCenter = (-resolvedStartBaseWidthPx / 2) + Math.max(0, Number(lineLeftInsetPx) || 0);
    const rightOffsetFromCenter = (resolvedStartBaseWidthPx / 2) - Math.max(0, Number(lineRightInsetPx) || 0);
    const startLeftEndpoint = {
      x: centerX + (Math.cos(startRadians) * leftOffsetFromCenter),
      y: centerY + (Math.sin(startRadians) * leftOffsetFromCenter),
    };
    const startRightEndpoint = {
      x: centerX + (Math.cos(startRadians) * rightOffsetFromCenter),
      y: centerY + (Math.sin(startRadians) * rightOffsetFromCenter),
    };
    const fixedEndpoint = handle.x > 0 ? startLeftEndpoint : startRightEndpoint;
    let movingEndpoint = { x: localPointerX, y: localPointerY };
    const deltaX = movingEndpoint.x - fixedEndpoint.x;
    const deltaY = movingEndpoint.y - fixedEndpoint.y;
    const nextAngle = Math.atan2(deltaY, deltaX);
    const minLineLayoutLengthPx = Math.max(
      MIN_SHAPE_WIDTH_PX,
      resolvedStartBaseHeightPx * getConstructorLineMinAspectRatio(layer.shapeKey, layer.strokeWidth),
    );
    const endpointInsetPx = Math.max(0, Number(lineLeftInsetPx) || 0) + Math.max(0, Number(lineRightInsetPx) || 0);
    const minLineVisibleLengthPx = Math.max(MIN_SHAPE_WIDTH_PX, minLineLayoutLengthPx - endpointInsetPx);
    const nextVisibleLengthPx = Math.max(minLineVisibleLengthPx, Math.hypot(deltaX, deltaY));

    movingEndpoint = {
      x: fixedEndpoint.x + (Math.cos(nextAngle) * nextVisibleLengthPx),
      y: fixedEndpoint.y + (Math.sin(nextAngle) * nextVisibleLengthPx),
    };

    const leftEndpoint = handle.x > 0 ? fixedEndpoint : movingEndpoint;
    const rightEndpoint = handle.x > 0 ? movingEndpoint : fixedEndpoint;
    const endpointMidX = (leftEndpoint.x + rightEndpoint.x) / 2;
    const endpointMidY = (leftEndpoint.y + rightEndpoint.y) / 2;
    const centerOffsetFromVisibleMidpoint = (Math.max(0, Number(lineLeftInsetPx) || 0) - Math.max(0, Number(lineRightInsetPx) || 0)) / 2;
    const nextCenterX = endpointMidX - (Math.cos(nextAngle) * centerOffsetFromVisibleMidpoint);
    const nextCenterY = endpointMidY - (Math.sin(nextAngle) * centerOffsetFromVisibleMidpoint);
    const nextBaseWidthPx = Math.hypot(rightEndpoint.x - leftEndpoint.x, rightEndpoint.y - leftEndpoint.y) + endpointInsetPx;
    const nextRotationDeg = Math.atan2(rightEndpoint.y - leftEndpoint.y, rightEndpoint.x - leftEndpoint.x) * (180 / Math.PI);

    return {
      lineWidthPx: toWidthValue(nextBaseWidthPx),
      rotationDeg: nextRotationDeg,
      position: {
        x: toPositionX(nextCenterX),
        y: toPositionY(nextCenterY),
      },
    };
  }

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
      startBaseWidthPx: resolvedStartBaseWidthPx,
      startBaseHeightPx: resolvedStartBaseHeightPx,
    });
    const nextBaseWidthPx = Math.max(MIN_SHAPE_WIDTH_PX, resolvedStartBaseWidthPx * uniformMultiplier);
    const nextBaseHeightPx = Math.max(MIN_SHAPE_HEIGHT_PX, resolvedStartBaseHeightPx * uniformMultiplier);
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
      ...(isLineShape
        ? {
          lineWidthPx: toWidthValue(nextBaseWidthPx),
          lineHeightPx: toHeightValue(nextBaseHeightPx),
        }
        : {
          widthCm: toWidthValue(nextBaseWidthPx),
          heightCm: toHeightValue(nextBaseHeightPx),
        }),
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
      resolvedStartBaseWidthPx,
      resolvedStartBaseHeightPx,
    );
    const nextFrameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx: nextBaseSize.baseWidthPx,
      baseHeightPx: resolvedStartBaseHeightPx,
    });
    const nextCenterX = nextOuterBounds.left + (nextFrameMetrics.frameWidthPx / 2);

    return {
      ...(isLineShape ? { lineWidthPx: toWidthValue(nextBaseSize.baseWidthPx) } : { widthCm: toWidthValue(nextBaseSize.baseWidthPx) }),
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
      resolvedStartBaseWidthPx,
      resolvedStartBaseHeightPx,
    );
    const nextFrameMetrics = getShapeFrameMetricsPx(layer, {
      baseWidthPx: resolvedStartBaseWidthPx,
      baseHeightPx: nextBaseSize.baseHeightPx,
    });
    const nextCenterY = nextOuterBounds.top + (nextFrameMetrics.frameHeightPx / 2);

    return {
      ...(isLineShape ? { lineHeightPx: toHeightValue(nextBaseSize.baseHeightPx) } : { heightCm: toHeightValue(nextBaseSize.baseHeightPx) }),
      position: {
        x: layer.position.x,
        y: toPositionY(nextCenterY),
      },
    };
  }

  return null;
}

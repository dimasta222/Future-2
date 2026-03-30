function isCornerHandle(handle) {
  return handle?.x !== 0 && handle?.y !== 0;
}

export function resizeShapeLayer({
  handle,
  pointer,
  printAreaBounds,
  dragState,
  physicalWidthCm,
  physicalHeightCm,
}) {
  if (!handle || !pointer || !printAreaBounds || !dragState) return null;

  const {
    startPointer,
    startWidthCm,
    startHeightCm,
  } = dragState;

  const deltaX = pointer.x - startPointer.x;
  const deltaY = pointer.y - startPointer.y;
  const horizontalGrowth = handle.x === 0 ? 0 : deltaX * handle.x * 2;
  const verticalGrowth = handle.y === 0 ? 0 : deltaY * handle.y * 2;
  const nextWidthCm = startWidthCm + ((horizontalGrowth / printAreaBounds.width) * physicalWidthCm);
  const nextHeightCm = startHeightCm + ((verticalGrowth / printAreaBounds.height) * physicalHeightCm);

  if (isCornerHandle(handle)) {
    const widthMultiplier = nextWidthCm / startWidthCm;
    const heightMultiplier = nextHeightCm / startHeightCm;
    const uniformMultiplier = Math.abs(widthMultiplier - 1) >= Math.abs(heightMultiplier - 1)
      ? widthMultiplier
      : heightMultiplier;

    return {
      widthCm: startWidthCm * uniformMultiplier,
      heightCm: startHeightCm * uniformMultiplier,
    };
  }

  return {
    ...(handle.x !== 0 ? { widthCm: nextWidthCm } : {}),
    ...(handle.y !== 0 ? { heightCm: nextHeightCm } : {}),
  };
}

import {
  getConstructorTextFont,
  getConstructorTextGradient,
  buildConstructorShapeSvg,
  getConstructorShape,
  getConstructorLineVisualMetrics,
} from "../components/constructor/constructorConfig.js";

const PREVIEW_WIDTH = 1200;
const LOGICAL_PRINT_PX_PER_CM = 10;

function loadImageAsync(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function svgToImg(svgMarkup, widthPx, heightPx) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgMarkup.trim(), "image/svg+xml");
  const svgEl = svgDoc.documentElement;
  svgEl.setAttribute("width", String(widthPx));
  svgEl.setAttribute("height", String(heightPx));
  const serialized = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([serialized], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function getLineAspectRatio(layer) {
  const lineWidthPx = Number(layer.lineWidthPx) || ((layer.widthCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  const lineHeightPx = Number(layer.lineHeightPx) || ((layer.heightCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  return Math.max(0.2, lineWidthPx / Math.max(1, lineHeightPx));
}

function isTextBold(layer) {
  const font = getConstructorTextFont(layer.fontKey || "outfit");
  return (layer.weight ?? font.regularWeight ?? 500) >= 700;
}

function wrapTextForPreview(text, fontStr, maxWidth, letterSpacingPx) {
  const c = document.createElement("canvas");
  const cx = c.getContext("2d");
  cx.font = fontStr;
  if (cx.letterSpacing !== undefined) cx.letterSpacing = `${letterSpacingPx}px`;
  const paragraphs = text.split("\n");
  const lines = [];
  for (const para of paragraphs) {
    if (!para.length) { lines.push(""); continue; }
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const test = line + word;
      if (cx.measureText(test).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = word.trimStart();
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

export async function exportPreviewImage({ previewSrc, layers, printArea }) {
  const mockupImg = await loadImageAsync(previewSrc);
  const scale = PREVIEW_WIDTH / mockupImg.naturalWidth;
  const canvasW = PREVIEW_WIDTH;
  const canvasH = Math.round(mockupImg.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(mockupImg, 0, 0, canvasW, canvasH);

  const areaX = (printArea.left / 100) * canvasW;
  const areaY = (printArea.top / 100) * canvasH;
  const areaW = (printArea.width / 100) * canvasW;
  const physW = printArea.physicalWidthCm;
  const physH = printArea.physicalHeightCm;
  const areaH = printArea.height ? (printArea.height / 100) * canvasH : areaW * (physH / physW);

  const areaLeft = areaX - areaW / 2;
  const areaTop = areaY - areaH / 2;

  for (const layer of layers) {
    if (!layer.visible) continue;

    const cx = areaLeft + (layer.position.x / 100) * areaW;
    const cy = areaTop + (layer.position.y / 100) * areaH;
    const rot = (layer.rotationDeg || 0) * (Math.PI / 180);

    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);

    if (layer.type === "upload") {
      await renderUploadOnCanvas(ctx, layer, areaW, areaH, physW, physH);
    } else if (layer.type === "text") {
      await renderTextOnCanvas(ctx, layer, areaW, areaH, physW, physH, printArea);
    } else if (layer.type === "shape") {
      await renderShapeOnCanvas(ctx, layer, areaW, areaH, physW, physH, printArea);
    }

    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
  });
}

async function renderUploadOnCanvas(ctx, layer, areaW, _areaH, physW, _physH) {
  const pxPerCm = areaW / physW;
  const w = (layer.widthCm ?? 0) * pxPerCm;
  const h = (layer.heightCm ?? 0) * pxPerCm;
  try {
    const img = await loadImageAsync(layer.src);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } catch { /* skip broken images */ }
}

async function renderTextOnCanvas(ctx, layer, areaW, _areaH, physW, _physH, printArea) {
  const font = getConstructorTextFont(layer.fontKey || "outfit");
  const pxPerCm = areaW / physW;
  // sizeScale: хранимые «px-единицы» интерпретируются как baseline (XS)
  // и вырастают пропорционально физическому размеру текущей футболки.
  const baselinePhysW = Number(printArea?.baselinePhysicalWidthCm) || physW;
  const sizeScale = physW / Math.max(0.001, baselinePhysW);
  const fontSizeCm = ((layer.size ?? 24) / LOGICAL_PRINT_PX_PER_CM) * sizeScale;
  const fontSizePx = fontSizeCm * pxPerCm;
  const bold = isTextBold(layer);
  const italic = layer.italic ? "italic " : "";
  const weight = bold ? (font.boldWeight || 800) : (font.regularWeight || 500);
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = ((layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM) * sizeScale;
  const letterSpacingPx = letterSpacingCm * pxPerCm;

  const textValue = layer.uppercase ? (layer.value || "").toUpperCase() : (layer.value || "");
  if (!textValue.trim()) return;

  const fontStr = `${italic}${weight} ${fontSizePx}px ${font.family}`;
  await document.fonts.load(fontStr);

  const boxWidthPx = ((layer.textBoxWidth ?? 60) / 100) * areaW;
  const lines = wrapTextForPreview(textValue, fontStr, boxWidthPx, letterSpacingPx);
  const lineHeightPx = fontSizePx * lineHeight;
  const totalHeight = lines.length * lineHeightPx;
  const align = layer.textAlign || "center";

  const strokeWidthPx = ((layer.strokeWidth ?? 0) / LOGICAL_PRINT_PX_PER_CM) * sizeScale * pxPerCm;

  const shadowOffsetXPx = layer.shadowEnabled ? ((layer.shadowOffsetX ?? 0) / LOGICAL_PRINT_PX_PER_CM) * sizeScale * pxPerCm : 0;
  const shadowOffsetYPx = layer.shadowEnabled ? ((layer.shadowOffsetY ?? 2) / LOGICAL_PRINT_PX_PER_CM) * sizeScale * pxPerCm : 0;
  const shadowBlurPx = layer.shadowEnabled ? ((layer.shadowBlur ?? 14) / LOGICAL_PRINT_PX_PER_CM) * sizeScale * pxPerCm : 0;

  // Render to off-screen canvas with generous padding so we can scan ink bbox
  // and place it so its center matches (cx, cy) in the main ctx.
  const shadowPad = layer.shadowEnabled
    ? Math.ceil(shadowBlurPx + Math.max(Math.abs(shadowOffsetXPx), Math.abs(shadowOffsetYPx)))
    : 0;
  const strokePad = Math.ceil(strokeWidthPx);
  const overshoot = Math.ceil(fontSizePx * 0.45);
  const pad = Math.max(shadowPad, strokePad) + overshoot;

  const offW = Math.ceil(boxWidthPx + pad * 2);
  const offH = Math.ceil(totalHeight + pad * 2);
  const off = document.createElement("canvas");
  off.width = offW;
  off.height = offH;
  const offCtx = off.getContext("2d");
  offCtx.font = fontStr;
  offCtx.textBaseline = "top";
  if (offCtx.letterSpacing !== undefined) offCtx.letterSpacing = `${letterSpacingPx}px`;
  if (layer.shadowEnabled) {
    offCtx.shadowOffsetX = shadowOffsetXPx;
    offCtx.shadowOffsetY = shadowOffsetYPx;
    offCtx.shadowBlur = shadowBlurPx;
    offCtx.shadowColor = layer.shadowColor || "rgba(0,0,0,.5)";
  }

  const gradient = layer.textFillMode === "gradient" ? getConstructorTextGradient(layer.gradientKey) : null;

  for (let i = 0; i < lines.length; i++) {
    const lineY = pad + i * lineHeightPx;
    const lineW = offCtx.measureText(lines[i]).width;
    let lineX;
    if (align === "center") lineX = pad + (boxWidthPx - lineW) / 2;
    else if (align === "right") lineX = pad + boxWidthPx - lineW;
    else lineX = pad;

    if (strokeWidthPx > 0) {
      offCtx.strokeStyle = layer.strokeColor || "#111111";
      offCtx.lineWidth = strokeWidthPx;
      offCtx.lineJoin = "round";
      offCtx.strokeText(lines[i], lineX, lineY);
    }

    if (gradient && gradient.stops?.length >= 2) {
      const grad = offCtx.createLinearGradient(lineX, lineY, lineX + lineW, lineY + lineHeightPx);
      gradient.stops.forEach((stop, idx) => {
        grad.addColorStop(gradient.stops.length === 1 ? 0 : idx / (gradient.stops.length - 1), stop);
      });
      offCtx.fillStyle = grad;
    } else {
      offCtx.fillStyle = layer.color || "#ffffff";
    }
    offCtx.fillText(lines[i], lineX, lineY);

    if (layer.underline || layer.strikethrough) {
      const decorThickness = fontSizePx * 0.06;
      offCtx.save();
      offCtx.shadowColor = "transparent";
      if (layer.underline) offCtx.fillRect(lineX, lineY + fontSizePx * 1.12, lineW, decorThickness);
      if (layer.strikethrough) offCtx.fillRect(lineX, lineY + fontSizePx * 0.55, lineW, decorThickness);
      offCtx.restore();
    }
  }

  // Find ink bbox in off-screen canvas
  let inkCenterX = offW / 2;
  let inkCenterY = offH / 2;
  try {
    const data = offCtx.getImageData(0, 0, offW, offH).data;
    let minX = offW;
    let minY = offH;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < offH; y++) {
      const rowStart = y * offW * 4;
      for (let x = 0; x < offW; x++) {
        if (data[rowStart + x * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= 0 && maxY >= 0) {
      inkCenterX = (minX + maxX + 1) / 2;
      inkCenterY = (minY + maxY + 1) / 2;
    }
  } catch { /* tainted, fallback geometric */ }

  // The main ctx is already translated to (cx, cy). Place off canvas so ink-center hits (0,0).
  ctx.drawImage(off, -inkCenterX, -inkCenterY);
}

async function renderShapeOnCanvas(ctx, layer, areaW, _areaH, physW, _physH, printArea) {
  const shape = getConstructorShape(layer.shapeKey);
  if (!shape) return;

  const isLine = shape.category === "lines";
  const lineAspectRatio = isLine ? getLineAspectRatio(layer) : null;

  let w, h;
  const pxPerCm = areaW / physW;
  const baselinePhysW = Number(printArea?.baselinePhysicalWidthCm) || physW;
  const sizeScale = physW / Math.max(0.001, baselinePhysW);
  if (isLine) {
    const lineWidthPx = Number(layer.lineWidthPx) || ((layer.widthCm || 1) * LOGICAL_PRINT_PX_PER_CM);
    const lineHeightPx = Number(layer.lineHeightPx) || ((layer.heightCm || 1) * LOGICAL_PRINT_PX_PER_CM);
    const vm = getConstructorLineVisualMetrics(layer.shapeKey, layer.strokeWidth, lineAspectRatio);
    w = (lineWidthPx / LOGICAL_PRINT_PX_PER_CM) * (vm.visibleWidthPx / Math.max(1, vm.layoutWidthPx)) * pxPerCm;
    h = (lineHeightPx / LOGICAL_PRINT_PX_PER_CM) * (vm.visibleHeightPx / Math.max(1, vm.layoutHeightPx)) * pxPerCm;
  } else {
    w = (layer.widthCm ?? 0) * pxPerCm;
    h = (layer.heightCm ?? 0) * pxPerCm;
  }

  if (w <= 0 || h <= 0) return;

  const gradient = layer.fillMode === "gradient" ? getConstructorTextGradient(layer.gradientKey) : null;
  const renderScale = 2;
  const renderW = Math.max(1, Math.ceil(w * renderScale));
  const renderH = Math.max(1, Math.ceil(h * renderScale));
  const shapePreserveAspectRatio = isLine ? "xMidYMid meet" : "none";

  function cropLineSvg(svgMarkup, sw) {
    const vm = getConstructorLineVisualMetrics(layer.shapeKey, sw, lineAspectRatio);
    const vbX = vm.leftInsetPx;
    const vbY = (vm.layoutHeightPx / 2) - (vm.visibleHeightPx / 2);
    return svgMarkup.replace(/viewBox="[^"]*"/, `viewBox="${vbX} ${vbY} ${vm.visibleWidthPx} ${vm.visibleHeightPx}"`);
  }

  function buildSvg(overrides = {}) {
    const sw = overrides.strokeWidth ?? (layer.strokeWidth ?? 0);
    let svg = buildConstructorShapeSvg({
      shape,
      fillMode: overrides.fillMode ?? (layer.fillMode || "solid"),
      color: overrides.color ?? (layer.color || "#ffffff"),
      gradient: overrides.gradient !== undefined ? overrides.gradient : gradient,
      strokeStyle: overrides.strokeStyle ?? (layer.strokeStyle || "none"),
      strokeColor: overrides.strokeColor ?? (layer.strokeColor || "transparent"),
      strokeWidth: sw,
      cornerRoundness: layer.cornerRoundness ?? 0,
      lineAspectRatio,
      preserveAspectRatio: shapePreserveAspectRatio,
    });
    if (isLine) svg = cropLineSvg(svg, sw);
    return svg;
  }

  const effectType = layer.effectType || "none";
  const radians = ((layer.effectAngle ?? -45) * Math.PI) / 180;
  const distCm = ((layer.effectDistance ?? 0) / LOGICAL_PRINT_PX_PER_CM) * sizeScale;
  const offsetX = Math.cos(radians) * distCm * pxPerCm;
  const offsetY = Math.sin(radians) * distCm * pxPerCm;

  // Match live constructor: the wrapper centers on position, but the main shape inside
  // is offset by -effectOffset/2 due to asymmetric padding (drop-shadow only).
  const shiftX = effectType === "drop-shadow" ? -offsetX / 2 : 0;
  const shiftY = effectType === "drop-shadow" ? -offsetY / 2 : 0;

  if (effectType === "drop-shadow") {
    const svg = buildSvg({ fillMode: "solid", color: layer.effectColor || "#824ef0", gradient: null, strokeColor: "transparent" });
    const img = await svgToImg(svg, renderW, renderH);
    if (img) {
      ctx.drawImage(img, -w / 2 + offsetX + shiftX, -h / 2 + offsetY + shiftY, w, h);
    }
  }

  if (effectType === "distort") {
    const svgA = buildSvg({ fillMode: "solid", color: layer.distortionColorA || "#ed5bb7", gradient: null, strokeColor: "transparent" });
    const svgB = buildSvg({ fillMode: "solid", color: layer.distortionColorB || "#1cb8d8", gradient: null, strokeColor: "transparent" });
    const [imgA, imgB] = await Promise.all([svgToImg(svgA, renderW, renderH), svgToImg(svgB, renderW, renderH)]);
    if (imgA) ctx.drawImage(imgA, -w / 2 + offsetX, -h / 2 + offsetY, w, h);
    if (imgB) ctx.drawImage(imgB, -w / 2 - offsetX, -h / 2 - offsetY, w, h);
  }

  const mainSvg = buildSvg();
  const mainImg = await svgToImg(mainSvg, renderW, renderH);
  if (mainImg) ctx.drawImage(mainImg, -w / 2 + shiftX, -h / 2 + shiftY, w, h);
}

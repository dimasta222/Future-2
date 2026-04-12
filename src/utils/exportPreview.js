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
      renderTextOnCanvas(ctx, layer, areaW, areaH, physW, physH);
    } else if (layer.type === "shape") {
      await renderShapeOnCanvas(ctx, layer, areaW, areaH, physW, physH);
    }

    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
  });
}

async function renderUploadOnCanvas(ctx, layer, areaW, areaH, physW, physH) {
  const w = ((layer.widthCm ?? 0) / physW) * areaW;
  const h = ((layer.heightCm ?? 0) / physH) * areaH;
  try {
    const img = await loadImageAsync(layer.src);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } catch { /* skip broken images */ }
}

function renderTextOnCanvas(ctx, layer, areaW, _areaH, physW, _physH) {
  const font = getConstructorTextFont(layer.fontKey || "outfit");
  const pxPerCm = areaW / physW;
  const fontSizeCm = (layer.size ?? 24) / LOGICAL_PRINT_PX_PER_CM;
  const fontSizePx = fontSizeCm * pxPerCm;
  const bold = isTextBold(layer);
  const italic = layer.italic ? "italic " : "";
  const weight = bold ? (font.boldWeight || 800) : (font.regularWeight || 500);
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;
  const letterSpacingPx = letterSpacingCm * pxPerCm;

  const textValue = layer.uppercase ? (layer.value || "").toUpperCase() : (layer.value || "");
  if (!textValue.trim()) return;

  const fontStr = `${italic}${weight} ${fontSizePx}px ${font.family}`;
  ctx.font = fontStr;
  ctx.textBaseline = "top";
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${letterSpacingPx}px`;

  const boxWidthPx = ((layer.textBoxWidth ?? 60) / 100) * areaW;
  const lines = wrapTextForPreview(textValue, fontStr, boxWidthPx, letterSpacingPx);
  const lineHeightPx = fontSizePx * lineHeight;
  const totalHeight = lines.length * lineHeightPx;
  const align = layer.textAlign || "center";

  const strokeWidthPx = ((layer.strokeWidth ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;

  if (layer.shadowEnabled) {
    ctx.shadowOffsetX = ((layer.shadowOffsetX ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
    ctx.shadowOffsetY = ((layer.shadowOffsetY ?? 2) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
    ctx.shadowBlur = ((layer.shadowBlur ?? 14) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
    ctx.shadowColor = layer.shadowColor || "rgba(0,0,0,.5)";
  }

  const gradient = layer.textFillMode === "gradient" ? getConstructorTextGradient(layer.gradientKey) : null;

  for (let i = 0; i < lines.length; i++) {
    const lineY = -totalHeight / 2 + i * lineHeightPx;
    const lineW = ctx.measureText(lines[i]).width;
    let lineX;
    if (align === "center") lineX = -lineW / 2;
    else if (align === "right") lineX = boxWidthPx / 2 - lineW;
    else lineX = -boxWidthPx / 2;

    if (strokeWidthPx > 0) {
      ctx.strokeStyle = layer.strokeColor || "#111111";
      ctx.lineWidth = strokeWidthPx;
      ctx.lineJoin = "round";
      ctx.strokeText(lines[i], lineX, lineY);
    }

    if (gradient && gradient.stops?.length >= 2) {
      const grad = ctx.createLinearGradient(lineX, lineY, lineX + lineW, lineY + lineHeightPx);
      gradient.stops.forEach((stop, idx) => {
        grad.addColorStop(gradient.stops.length === 1 ? 0 : idx / (gradient.stops.length - 1), stop);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = layer.color || "#ffffff";
    }
    ctx.fillText(lines[i], lineX, lineY);

    if (layer.underline || layer.strikethrough) {
      const decorThickness = fontSizePx * 0.06;
      ctx.save();
      ctx.shadowColor = "transparent";
      if (layer.underline) ctx.fillRect(lineX, lineY + fontSizePx * 1.12, lineW, decorThickness);
      if (layer.strikethrough) ctx.fillRect(lineX, lineY + fontSizePx * 0.55, lineW, decorThickness);
      ctx.restore();
    }
  }
}

async function renderShapeOnCanvas(ctx, layer, areaW, _areaH, physW, _physH) {
  const shape = getConstructorShape(layer.shapeKey);
  if (!shape) return;

  const isLine = shape.category === "lines";
  const lineAspectRatio = isLine ? getLineAspectRatio(layer) : null;

  let w, h;
  const pxPerCm = areaW / physW;
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
  const distCm = (layer.effectDistance ?? 0) / LOGICAL_PRINT_PX_PER_CM;
  const offsetX = Math.cos(radians) * distCm * pxPerCm;
  const offsetY = Math.sin(radians) * distCm * pxPerCm;

  if (effectType === "drop-shadow") {
    const svg = buildSvg({ fillMode: "solid", color: layer.effectColor || "#824ef0", gradient: null, strokeColor: "transparent" });
    const img = await svgToImg(svg, renderW, renderH);
    if (img) {
      ctx.globalAlpha = 0.78;
      ctx.drawImage(img, -w / 2 + offsetX, -h / 2 + offsetY, w, h);
      ctx.globalAlpha = 1;
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
  if (mainImg) ctx.drawImage(mainImg, -w / 2, -h / 2, w, h);
}

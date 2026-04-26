// Measures ink bbox of a text layer in exactly the same way exportPrintPdf.js
// renders it onto a canvas. Used by the order summary ("sizeLabel") so the
// cm size displayed in the UI matches Photoshop's Trim result on the generated
// PDF to within rounding of 0.1 cm on all tshirt sizes.
//
// Mirrors renderTextViaCanvas() from exportPrintPdf.js (shadow + stroke + text +
// decorations, at TEXT_CANVAS_PX_PER_CM = 120). Cached to avoid recomputing on
// every keystroke.

const TEXT_CANVAS_PX_PER_CM = 120;
const LOGICAL_PRINT_PX_PER_CM = 10;

const cache = new Map();
const MAX_CACHE = 200;

export function clearTextPdfBboxCache() {
  cache.clear();
}

function makeCacheKey(layer, physW, baselinePhysW) {
  return [
    layer.value || "",
    layer.uppercase ? 1 : 0,
    layer.fontFamily || "",
    layer.weight || "",
    layer.italic ? 1 : 0,
    layer.size,
    layer.textBoxWidth,
    layer.lineHeight,
    layer.letterSpacing,
    layer.strokeWidth,
    layer.shadowEnabled ? 1 : 0,
    layer.shadowOffsetX,
    layer.shadowOffsetY,
    layer.shadowBlur,
    layer.underline ? 1 : 0,
    layer.strikethrough ? 1 : 0,
    physW,
    baselinePhysW,
  ].join("|");
}

function wrapText(text, fontStr, maxWidth, letterSpacingPx) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = fontStr;
  ctx.letterSpacing = `${letterSpacingPx || 0}px`;
  const paragraphs = String(text || "").split("\n");
  const out = [];
  for (const para of paragraphs) {
    if (!para.length) { out.push(""); continue; }
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const test = line + word;
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        out.push(line);
        line = word.trimStart();
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

/**
 * Returns { widthCm, heightCm } of the text layer's PDF ink bbox.
 * Returns null if the text is empty, canvas is unavailable, or scan failed.
 */
export function measureTextPdfInkBboxCm({
  layer,
  fontFamily,
  fontWeight,
  fontStyle,
  physicalWidthCm,
  baselinePhysicalWidthCm,
}) {
  if (typeof document === "undefined") return null;
  const rawText = String(layer?.value || "");
  const textValue = layer?.uppercase ? rawText.toUpperCase() : rawText;
  if (!textValue.trim()) return null;
  if (!physicalWidthCm || physicalWidthCm <= 0) return null;

  const safeBaseline = baselinePhysicalWidthCm > 0 ? baselinePhysicalWidthCm : physicalWidthCm;
  const sizeScale = physicalWidthCm / safeBaseline;

  const cacheKey = makeCacheKey({ ...layer, fontFamily, weight: fontWeight, italic: fontStyle === "italic" }, physicalWidthCm, safeBaseline);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // Меряем в baseline (XS) масштабе — canvas всегда одного размера, glyph-метрики
  // и шрифтовый рендер стабильны. Затем умножаем результат на sizeScale, что
  // математически эквивалентно физическому Trim PDF на любой футболке (PDF
  // использует те же формулы: всё умножается на sizeScale).
  const pxPerCm = TEXT_CANVAS_PX_PER_CM;
  const widthPercent = Math.min(100, Math.max(1, layer.textBoxWidth ?? 60));
  const boxWidthCm = (widthPercent / 100) * safeBaseline;
  const fontSizeCm = (layer.size ?? 36) / LOGICAL_PRINT_PX_PER_CM;
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;

  const fontSizePx = fontSizeCm * pxPerCm;
  const boxWidthPx = boxWidthCm * pxPerCm;
  const letterSpacingPx = letterSpacingCm * pxPerCm;
  const strokeWidthPx = ((layer.strokeWidth ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowEnabled = layer.shadowEnabled === true;
  const shadowOffsetXPx = shadowEnabled ? ((layer.shadowOffsetX ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm : 0;
  const shadowOffsetYPx = shadowEnabled ? ((layer.shadowOffsetY ?? 2) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm : 0;
  const shadowBlurPx = shadowEnabled ? ((layer.shadowBlur ?? 14) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm : 0;

  const canvasFontStr = `${fontStyle || "normal"} ${fontWeight || 400} ${fontSizePx}px ${fontFamily || "sans-serif"}`;

  const lines = wrapText(textValue, canvasFontStr, boxWidthPx, letterSpacingPx);
  const lineHeightPx = fontSizePx * lineHeight;
  const textBlockHeight = lines.length * lineHeightPx;

  const shadowPad = shadowEnabled
    ? Math.ceil(shadowBlurPx + Math.max(Math.abs(shadowOffsetXPx), Math.abs(shadowOffsetYPx)))
    : 0;
  const strokePad = Math.ceil(strokeWidthPx);
  const glyphOvershoot = Math.ceil(fontSizePx * 0.35);
  const pad = Math.max(shadowPad, strokePad) + glyphOvershoot;

  const canvasW = Math.ceil(boxWidthPx + pad * 2);
  const canvasH = Math.ceil(textBlockHeight + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  ctx.font = canvasFontStr;
  ctx.textBaseline = "top";
  ctx.letterSpacing = `${letterSpacingPx}px`;

  const align = layer.textAlign || "center";

  if (shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || "#111111";
    ctx.shadowOffsetX = shadowOffsetXPx;
    ctx.shadowOffsetY = shadowOffsetYPx;
    ctx.shadowBlur = shadowBlurPx;
  }

  for (let i = 0; i < lines.length; i++) {
    const lineY = pad + i * lineHeightPx;
    const lineWidth = ctx.measureText(lines[i]).width;
    let lineX = pad;
    if (align === "center") lineX = pad + (boxWidthPx - lineWidth) / 2;
    else if (align === "right") lineX = pad + boxWidthPx - lineWidth;

    if (strokeWidthPx > 0) {
      ctx.strokeStyle = layer.strokeColor || "#111111";
      ctx.lineWidth = strokeWidthPx;
      ctx.lineJoin = "round";
      ctx.strokeText(lines[i], lineX, lineY);
    }
    ctx.fillStyle = layer.color || "#ffffff";
    ctx.fillText(lines[i], lineX, lineY);

    if (layer.underline || layer.strikethrough) {
      const decorThickness = fontSizePx * 0.06;
      ctx.save();
      ctx.shadowColor = "transparent";
      if (layer.underline) ctx.fillRect(lineX, lineY + fontSizePx * 1.12, lineWidth, decorThickness);
      if (layer.strikethrough) ctx.fillRect(lineX, lineY + fontSizePx * 0.55, lineWidth, decorThickness);
      ctx.restore();
    }
  }

  let result = null;
  try {
    const pixels = ctx.getImageData(0, 0, canvasW, canvasH).data;
    let minX = canvasW, minY = canvasH, maxX = -1, maxY = -1;
    for (let y = 0; y < canvasH; y++) {
      const rowStart = y * canvasW * 4;
      for (let x = 0; x < canvasW; x++) {
        // Photoshop Trim "Based On Transparent Pixels" удаляет только полностью
        // прозрачные пиксели (alpha = 0). Используем тот же порог, иначе UI
        // показывает меньший размер, чем PS Trim, из-за antialiasing-окантовки.
        if (pixels[rowStart + x * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= 0 && maxY >= 0) {
      result = {
        widthCm: ((maxX - minX + 1) / pxPerCm) * sizeScale,
        heightCm: ((maxY - minY + 1) / pxPerCm) * sizeScale,
      };
    }
  } catch { /* tainted, return null */ }

  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(cacheKey, result);
  return result;
}

export function clearTextPdfInkBboxCache() {
  cache.clear();
}

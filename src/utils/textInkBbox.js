// Measures real ink-bbox of rendered text by drawing on an off-screen canvas
// and scanning alpha pixels. This gives the actual visible bounds (including
// script font flourishes, italic slants, ascenders/descenders) which match
// what Photoshop sees after a Trim operation.
//
// Result is in pixels at the rendering scale (pxPerCm).
// All offsets are measured from the canvas top-left corner.

const cache = new Map();
const MAX_CACHE = 200;

function makeCacheKey(opts) {
  return [
    opts.text,
    opts.fontFamily,
    opts.fontSize,
    opts.fontWeight,
    opts.fontStyle,
    opts.lineHeight,
    opts.letterSpacing,
    opts.boxWidthPx,
    opts.uppercase ? 1 : 0,
  ].join("|");
}

function wrapText(text, font, boxWidthPx, letterSpacingPx, ctx) {
  ctx.font = font;
  ctx.letterSpacing = `${letterSpacingPx || 0}px`;
  const paragraphs = String(text || "").split("\n");
  const out = [];
  for (const para of paragraphs) {
    if (!para.length) {
      out.push("");
      continue;
    }
    const words = para.split(/(\s+)/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line + word;
      if (ctx.measureText(test).width <= boxWidthPx || !line) {
        line = test;
      } else {
        out.push(line);
        line = word.trimStart();
      }
    }
    if (line.length) out.push(line);
  }
  return out.length ? out : [""];
}

/**
 * Measure real ink bbox of text (post-render, alpha-scanned).
 *
 * @returns {{
 *   inkWidthPx: number,
 *   inkHeightPx: number,
 *   inkLeftOffsetPx: number,    // from top-left of render canvas
 *   inkTopOffsetPx: number,
 *   lineHeightPx: number,
 *   linesCount: number,
 *   layoutWidthPx: number,      // textbox width (= boxWidthPx)
 *   layoutHeightPx: number,     // lines * lineHeight
 *   pxPerCm: number,
 * } | null}
 */
export function measureTextInkBboxPx(opts) {
  if (typeof document === "undefined") return null;
  const text = String(opts.text || "");
  if (!text.trim()) return null;

  const key = makeCacheKey(opts);
  if (cache.has(key)) return cache.get(key);

  const safeFontSize = Math.max(1, Number(opts.fontSize) || 1);
  const safeLineHeight = Math.max(0.5, Number(opts.lineHeight) || 1.05);
  const safeBoxWidthPx = Math.max(1, Number(opts.boxWidthPx) || 1);
  const fontStyle = opts.fontStyle || "normal";
  const fontWeight = opts.fontWeight || 400;
  const fontFamily = opts.fontFamily || "sans-serif";
  const letterSpacingPx = Number(opts.letterSpacing) || 0;

  const fontStr = `${fontStyle} ${fontWeight} ${safeFontSize}px ${fontFamily}`;

  // Render at the same px scale that the source provided.
  const measureCanvas = document.createElement("canvas");
  // Generous padding for italic/script overshoot
  const overshoot = Math.ceil(safeFontSize * 0.6);
  const lines = (() => {
    const tmpCtx = measureCanvas.getContext("2d");
    return wrapText(text, fontStr, safeBoxWidthPx, letterSpacingPx, tmpCtx);
  })();
  const lineHeightPx = safeFontSize * safeLineHeight;
  const layoutHeightPx = Math.max(1, lines.length * lineHeightPx);
  const layoutWidthPx = safeBoxWidthPx;

  const canvasW = Math.ceil(layoutWidthPx + overshoot * 2);
  const canvasH = Math.ceil(layoutHeightPx + overshoot * 2);
  measureCanvas.width = canvasW;
  measureCanvas.height = canvasH;
  const ctx = measureCanvas.getContext("2d");

  ctx.font = fontStr;
  ctx.textBaseline = "top";
  ctx.letterSpacing = `${letterSpacingPx}px`;
  ctx.fillStyle = "#000";

  const align = opts.textAlign || "center";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWidth = ctx.measureText(line).width;
    let x = overshoot;
    if (align === "center") x = overshoot + (layoutWidthPx - lineWidth) / 2;
    else if (align === "right") x = overshoot + layoutWidthPx - lineWidth;
    ctx.fillText(line, x, overshoot + i * lineHeightPx);
  }

  // Scan alpha
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, canvasW, canvasH);
  } catch {
    return null;
  }
  const data = imgData.data;
  let minX = canvasW;
  let minY = canvasH;
  let maxX = -1;
  let maxY = -1;
  // Stride scan for speed: every 1 px to be precise (text is small enough)
  for (let y = 0; y < canvasH; y++) {
    const rowStart = y * canvasW * 4;
    for (let x = 0; x < canvasW; x++) {
      if (data[rowStart + x * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  let result;
  if (maxX < 0 || maxY < 0) {
    result = {
      inkWidthPx: 0,
      inkHeightPx: 0,
      inkLeftOffsetPx: overshoot,
      inkTopOffsetPx: overshoot,
      lineHeightPx,
      linesCount: lines.length,
      layoutWidthPx,
      layoutHeightPx,
      pxPerCm: opts.pxPerCm || null,
    };
  } else {
    result = {
      inkWidthPx: maxX - minX + 1,
      inkHeightPx: maxY - minY + 1,
      inkLeftOffsetPx: minX,
      inkTopOffsetPx: minY,
      lineHeightPx,
      linesCount: lines.length,
      layoutWidthPx,
      layoutHeightPx,
      pxPerCm: opts.pxPerCm || null,
    };
  }

  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, result);
  return result;
}

export function clearTextInkBboxCache() {
  cache.clear();
}

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

function makeCacheKey(layer, physW, baselinePhysW, boxWidthOverride, linesOverride) {
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
    layer.textOutlineOnly ? 1 : 0,
    layer.outlineWidth || 0,
    layer.shadowEnabled ? 1 : 0,
    layer.shadowOffsetX,
    layer.shadowOffsetY,
    layer.shadowBlur,
    layer.underline ? 1 : 0,
    layer.strikethrough ? 1 : 0,
    physW,
    baselinePhysW,
    boxWidthOverride ?? "",
    linesOverride ? linesOverride.join("\u0001") : "",
  ].join("|");
}

// Допуск переноса: ctx.measureText включает trailing letter-spacing после
// последней буквы, а DOM его не рисует — добавляем одну
// letter-spacing к лимиту, иначе короткие строки ложно переносятся.
const WRAP_TOLERANCE_PX = 1;

function wrapText(text, fontStr, maxWidth, letterSpacingPx) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = fontStr;
  ctx.letterSpacing = `${letterSpacingPx || 0}px`;
  const limit = maxWidth + Math.max(0, letterSpacingPx || 0) + WRAP_TOLERANCE_PX;
  const breakLongToken = (token, lines) => {
    let buf = "";
    for (const ch of token) {
      const candidate = buf + ch;
      if (buf && ctx.measureText(candidate).width > limit) {
        lines.push(buf);
        buf = ch;
      } else {
        buf = candidate;
      }
    }
    return buf;
  };
  const paragraphs = String(text || "").split("\n");
  const out = [];
  for (const para of paragraphs) {
    if (!para.length) { out.push(""); continue; }
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const test = line + word;
      if (ctx.measureText(test).width > limit && line.length > 0) {
        out.push(line);
        const trimmed = word.trimStart();
        if (ctx.measureText(trimmed).width > limit) {
          line = breakLongToken(trimmed, out);
        } else {
          line = trimmed;
        }
      } else if (!line && ctx.measureText(test).width > limit) {
        line = breakLongToken(test, out);
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
  // Optional: actual DOM-rendered box width in CURRENT physical cm. When
  // passed, used instead of `(textBoxWidth%/100) * baseline` to derive the
  // wrap width — that way canvas wrap matches DOM exactly even when the box
  // sits exactly at the text edge (snug fit) and sub-pixel rounding would
  // otherwise cause canvas to wrap an extra letter.
  boxWidthCmOverride,
  // Optional: lines as actually wrapped by the DOM. When passed, canvas skips
  // its own wrap step (which can disagree with DOM due to kerning / font
  // features) and renders these exact lines for the alpha-scan ink bbox.
  linesOverride,
}) {
  if (typeof document === "undefined") return null;
  const rawText = String(layer?.value || "");
  const textValue = layer?.uppercase ? rawText.toUpperCase() : rawText;
  if (!textValue.trim()) return null;
  if (!physicalWidthCm || physicalWidthCm <= 0) return null;

  const safeBaseline = baselinePhysicalWidthCm > 0 ? baselinePhysicalWidthCm : physicalWidthCm;
  const sizeScale = physicalWidthCm / safeBaseline;

  const cacheKey = makeCacheKey({ ...layer, fontFamily, weight: fontWeight, italic: fontStyle === "italic" }, physicalWidthCm, safeBaseline, boxWidthCmOverride, linesOverride);
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  // Меряем в baseline (XS) масштабе — canvas всегда одного размера, glyph-метрики
  // и шрифтовый рендер стабильны. Затем умножаем результат на sizeScale, что
  // математически эквивалентно физическому Trim PDF на любой футболке (PDF
  // использует те же формулы: всё умножается на sizeScale).
  const pxPerCm = TEXT_CANVAS_PX_PER_CM;
  const widthPercent = Math.min(100, Math.max(1, layer.textBoxWidth ?? 60));
  // Если задан DOM-override — переводим его в baseline-масштаб, иначе берём
  // ширину из layer.textBoxWidth %.
  const boxWidthCm = boxWidthCmOverride > 0
    ? boxWidthCmOverride / sizeScale
    : (widthPercent / 100) * safeBaseline;
  const fontSizeCm = (layer.size ?? 36) / LOGICAL_PRINT_PX_PER_CM;
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;

  const fontSizePx = fontSizeCm * pxPerCm;
  const boxWidthPx = boxWidthCm * pxPerCm;
  const letterSpacingPx = letterSpacingCm * pxPerCm;
  const isOutlineOnly = !!layer.textOutlineOnly && (Number(layer.outlineWidth) || 0) > 0;
  const sourceStrokeWidth = isOutlineOnly ? (layer.outlineWidth ?? 0) : (layer.strokeWidth ?? 0);
  const strokeColorEffective = isOutlineOnly ? (layer.color || "#ffffff") : (layer.strokeColor || "#111111");
  const strokeWidthPx = (sourceStrokeWidth / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowEnabled = layer.shadowEnabled === true;
  const shadowOffsetXPx = shadowEnabled ? ((layer.shadowOffsetX ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm : 0;
  const shadowOffsetYPx = shadowEnabled ? ((layer.shadowOffsetY ?? 2) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm : 0;
  const shadowBlurPx = shadowEnabled ? ((layer.shadowBlur ?? 14) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm : 0;

  const canvasFontStr = `${fontStyle || "normal"} ${fontWeight || 400} ${fontSizePx}px ${fontFamily || "sans-serif"}`;

  const lines = Array.isArray(linesOverride) && linesOverride.length
    ? linesOverride.map((line) => (layer?.uppercase ? String(line).toUpperCase() : String(line)))
    : wrapText(textValue, canvasFontStr, boxWidthPx, letterSpacingPx);
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
      ctx.strokeStyle = strokeColorEffective;
      ctx.lineWidth = strokeWidthPx;
      ctx.lineJoin = "round";
      ctx.strokeText(lines[i], lineX, lineY);
    }
    ctx.fillStyle = layer.color || "#ffffff";
    if (!isOutlineOnly) {
      ctx.fillText(lines[i], lineX, lineY);
    }

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
      const inkWidthPx = maxX - minX + 1;
      const inkHeightPx = maxY - minY + 1;
      // Координаты ink относительно ВНУТРЕННЕГО layout (без pad), в исходных
      // baseline-cm. Layout начинается в (pad, pad), его размер
      // boxWidthPx × textBlockHeight, центр в (pad + boxWidthPx/2, pad + textBlockHeight/2).
      const layoutWidthCm = (boxWidthPx / pxPerCm) * sizeScale;
      const layoutHeightCm = (textBlockHeight / pxPerCm) * sizeScale;
      const inkLeftOffsetCm = ((minX - pad) / pxPerCm) * sizeScale;
      const inkTopOffsetCm = ((minY - pad) / pxPerCm) * sizeScale;
      const inkCenterXCm = inkLeftOffsetCm + (inkWidthPx / pxPerCm) * sizeScale / 2;
      const inkCenterYCm = inkTopOffsetCm + (inkHeightPx / pxPerCm) * sizeScale / 2;
      const layoutCenterXCm = layoutWidthCm / 2;
      const layoutCenterYCm = layoutHeightCm / 2;
      result = {
        widthCm: (inkWidthPx / pxPerCm) * sizeScale,
        heightCm: (inkHeightPx / pxPerCm) * sizeScale,
        // Дополнительные поля для расчёта inkDyEm в превью:
        // ink-center относительно layout-center (cm). Положительный = ink ниже центра.
        inkOffsetXCm: inkCenterXCm - layoutCenterXCm,
        inkOffsetYCm: inkCenterYCm - layoutCenterYCm,
        layoutWidthCm,
        layoutHeightCm,
        inkLeftOffsetCm,
        inkTopOffsetCm,
        linesCount: lines.length,
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

// === Rotated ink-bbox =========================================================
// Для повёрнутого текста математический AABB глифа (cos+sin) НЕ совпадает с тем,
// что видит Photoshop Trim после поворота: "future" по диагонали распределяет
// буквы неравномерно (короткие "u/r/e" в одном углу, длинные "f/t" — в другом),
// поэтому физический AABB растеризованных глифов уже/выше, чем мат. AABB
// прямоугольника text-block. Чтобы UI совпадал с PS на любых углах, мы
// физически рисуем глифы повёрнутыми и сканируем alpha — это и есть AABB,
// который увидит PS после Trim.

const rotatedCache = new Map();
const MAX_ROTATED_CACHE = 200;

function makeRotatedCacheKey(layer, physW, baselinePhysW, rotationDeg) {
  return `${makeCacheKey(layer, physW, baselinePhysW, undefined, undefined)}|rot=${Math.round(rotationDeg * 1000) / 1000}`;
}

export function measureRotatedTextInkBboxCm({
  layer,
  fontFamily,
  fontWeight,
  fontStyle,
  physicalWidthCm,
  baselinePhysicalWidthCm,
  rotationDeg,
}) {
  if (typeof document === "undefined") return null;
  const rawText = String(layer?.value || "");
  const textValue = layer?.uppercase ? rawText.toUpperCase() : rawText;
  if (!textValue.trim()) return null;
  if (!physicalWidthCm || physicalWidthCm <= 0) return null;
  const rotDeg = Number(rotationDeg) || 0;
  if (!rotDeg) {
    // 0° — обычный путь.
    return measureTextPdfInkBboxCm({
      layer, fontFamily, fontWeight, fontStyle,
      physicalWidthCm, baselinePhysicalWidthCm,
    });
  }

  const safeBaseline = baselinePhysicalWidthCm > 0 ? baselinePhysicalWidthCm : physicalWidthCm;
  const sizeScale = physicalWidthCm / safeBaseline;

  const cacheKey = makeRotatedCacheKey({ ...layer, fontFamily, weight: fontWeight, italic: fontStyle === "italic" }, physicalWidthCm, safeBaseline, rotDeg);
  if (rotatedCache.has(cacheKey)) return rotatedCache.get(cacheKey);

  // Сначала измеряем неповёрнутый ink-bbox — нам нужны точные размеры
  // глифового бокса, чтобы построить минимальный canvas под повёрнутую версию.
  const baseInk = measureTextPdfInkBboxCm({
    layer, fontFamily, fontWeight, fontStyle,
    physicalWidthCm, baselinePhysicalWidthCm,
  });
  if (!baseInk) return null;

  const pxPerCm = TEXT_CANVAS_PX_PER_CM;
  // Берём ink-W/H в baseline, чтобы потом единообразно умножить на sizeScale.
  const inkWBaseCm = baseInk.widthCm / sizeScale;
  const inkHBaseCm = baseInk.heightCm / sizeScale;
  const inkWPx = Math.max(1, Math.ceil(inkWBaseCm * pxPerCm));
  const inkHPx = Math.max(1, Math.ceil(inkHBaseCm * pxPerCm));

  // Размер canvas: max диагональ повёрнутого прямоугольника + запас.
  const diagPx = Math.ceil(Math.sqrt(inkWPx * inkWPx + inkHPx * inkHPx)) + 8;
  const canvasW = diagPx;
  const canvasH = diagPx;

  // Шрифт и параметры — те же, что в основном renderer.
  const fontSizeCm = (layer.size ?? 36) / LOGICAL_PRINT_PX_PER_CM;
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;
  const fontSizePx = fontSizeCm * pxPerCm;
  const letterSpacingPx = letterSpacingCm * pxPerCm;
  const widthPercent = Math.min(100, Math.max(1, layer.textBoxWidth ?? 60));
  const boxWidthCm = (widthPercent / 100) * safeBaseline;
  const boxWidthPx = boxWidthCm * pxPerCm;

  const isOutlineOnly = !!layer.textOutlineOnly && (Number(layer.outlineWidth) || 0) > 0;
  const sourceStrokeWidth = isOutlineOnly ? (layer.outlineWidth ?? 0) : (layer.strokeWidth ?? 0);
  const strokeColorEffective = isOutlineOnly ? (layer.color || "#ffffff") : (layer.strokeColor || "#111111");
  const strokeWidthPx = (sourceStrokeWidth / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;

  const canvasFontStr = `${fontStyle || "normal"} ${fontWeight || 400} ${fontSizePx}px ${fontFamily || "sans-serif"}`;
  const lines = wrapText(textValue, canvasFontStr, boxWidthPx, letterSpacingPx);
  const lineHeightPx = fontSizePx * lineHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  ctx.font = canvasFontStr;
  ctx.textBaseline = "top";
  ctx.letterSpacing = `${letterSpacingPx}px`;

  // Рисуем повёрнутый текст вокруг центра canvas, выровняв глифовый бокс
  // по центру (через смещение -inkOffset). Layout-bbox: boxWidthPx × textBlockHeight.
  // ink-bbox внутри layout: inkLeftOffset/inkTopOffset (cm), смещение от
  // верх-лев layout до верх-лев ink. Чтобы ink-bbox оказался в центре canvas,
  // рисуем layout с offset: cx = canvasW/2 - (inkLeft + inkW/2), относительно
  // top-left layout. То есть text origin = (cx, cy).
  const inkLeftPx = (baseInk.inkLeftOffsetCm / sizeScale) * pxPerCm;
  const inkTopPx = (baseInk.inkTopOffsetCm / sizeScale) * pxPerCm;
  const inkCenterInLayoutXpx = inkLeftPx + inkWPx / 2;
  const inkCenterInLayoutYpx = inkTopPx + inkHPx / 2;
  const layoutOriginXpx = canvasW / 2 - inkCenterInLayoutXpx;
  const layoutOriginYpx = canvasH / 2 - inkCenterInLayoutYpx;

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  // CSS rotate(+θ) y-down — у canvas то же направление вращения.
  ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.translate(-canvasW / 2, -canvasH / 2);

  const align = layer.textAlign || "center";
  for (let i = 0; i < lines.length; i++) {
    const lineY = layoutOriginYpx + i * lineHeightPx;
    const lineWidth = ctx.measureText(lines[i]).width;
    let lineX = layoutOriginXpx;
    if (align === "center") lineX = layoutOriginXpx + (boxWidthPx - lineWidth) / 2;
    else if (align === "right") lineX = layoutOriginXpx + boxWidthPx - lineWidth;

    if (strokeWidthPx > 0) {
      ctx.strokeStyle = strokeColorEffective;
      ctx.lineWidth = strokeWidthPx;
      ctx.lineJoin = "round";
      ctx.strokeText(lines[i], lineX, lineY);
    }
    ctx.fillStyle = layer.color || "#ffffff";
    if (!isOutlineOnly) ctx.fillText(lines[i], lineX, lineY);

    if (layer.underline || layer.strikethrough) {
      const decorThickness = fontSizePx * 0.06;
      if (layer.underline) ctx.fillRect(lineX, lineY + fontSizePx * 1.12, lineWidth, decorThickness);
      if (layer.strikethrough) ctx.fillRect(lineX, lineY + fontSizePx * 0.55, lineWidth, decorThickness);
    }
  }
  ctx.restore();
  // shadow здесь намеренно НЕ рисуем — для измерения нужен только глифовый ink,
  // как видит Photoshop Trim после rasterize векторного PDF (тени тоже видны,
  // но shadow для повёрнутого текста встречается редко; добавим при запросе).

  let result = null;
  try {
    const pixels = ctx.getImageData(0, 0, canvasW, canvasH).data;
    let minX = canvasW, minY = canvasH, maxX = -1, maxY = -1;
    for (let y = 0; y < canvasH; y++) {
      const rowStart = y * canvasW * 4;
      for (let x = 0; x < canvasW; x++) {
        if (pixels[rowStart + x * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= 0 && maxY >= 0) {
      const rotInkWPx = maxX - minX + 1;
      const rotInkHPx = maxY - minY + 1;
      result = {
        widthCm: (rotInkWPx / pxPerCm) * sizeScale,
        heightCm: (rotInkHPx / pxPerCm) * sizeScale,
      };
    }
  } catch { /* tainted */ }

  if (rotatedCache.size >= MAX_ROTATED_CACHE) {
    const firstKey = rotatedCache.keys().next().value;
    rotatedCache.delete(firstKey);
  }
  rotatedCache.set(cacheKey, result);
  return result;
}

export function clearRotatedTextInkBboxCache() {
  rotatedCache.clear();
}

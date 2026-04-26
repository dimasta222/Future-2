/**
 * textGlyphBbox.js — точное измерение visible glyph bbox через парсинг
 * векторных path-ов шрифта (opentype.js).
 *
 * ЗАЧЕМ: ни canvas alpha-scan, ни SVG getBBox не дают пиксельно-точных
 * границ глифа. Подробности — в /memories/repo/constructor-text-clamp-snap.md.
 *
 *   • canvas alpha-scan (textPdfBbox) — недомеряет descender (Chrome-баг
 *     загрузки кастомного шрифта в canvas). Для буквы g 36pt: 2.53cm
 *     вместо реальных ~3.0cm.
 *   • SVG getBBox (textSvgBbox, удалён) — возвращает font-bounding-box
 *     (метрики шрифта, ascent+descent с запасом). Для g 36pt: 4.54cm.
 *   • opentype.js (этот файл) — читает glyph paths из файла шрифта
 *     и считает bbox от векторных команд. Для g 36pt: ~3.0cm — точно.
 *     Используется в Figma, Adobe Express, Google Fonts.
 *
 * ИСПОЛЬЗОВАНИЕ: только источник `clampWidth/Height/OffsetX/Y` в
 * useConstructorState.getLayerMetrics. PDF-export и HTML-preview
 * не трогаем — они и так визуально верны.
 *
 * ASYNC: opentype.load() возвращает Promise. Прогрев — в prewarmGlyphFonts():
 * стартуем загрузку всех шрифтов параллельно при инициализации конструктора.
 * До завершения загрузки measureTextGlyphBboxCm возвращает null —
 * вызывающий код фолбэкается на canvas alpha-scan.
 */

import opentype from "opentype.js";
import { LOCAL_FONTS } from "../generated/localFonts.js";

// Кэш загруженных opentype.Font объектов: variantUrl → Font.
const fontCache = new Map();
// In-flight Promise-ы загрузок: variantUrl → Promise<Font>.
const fontLoadPromises = new Map();

// Family-строка → массив { weight, italic, url }. Заполняется один раз
// из LOCAL_FONTS. Family-строка нормализуется (без кавычек/пробелов).
const familyVariantsCache = new Map();

function normalizeFamily(family) {
  if (!family) return "";
  // Берём первое имя из CSS font-family ("'Inter', sans-serif" → "Inter").
  const first = String(family).split(",")[0].trim();
  return first.replace(/^['"]|['"]$/g, "").trim().toLowerCase();
}

function buildFamilyIndex() {
  if (familyVariantsCache.size > 0) return;
  for (const font of LOCAL_FONTS) {
    if (!font?.urls) continue;
    const familyKey = normalizeFamily(font.family);
    if (!familyKey) continue;
    const variants = familyVariantsCache.get(familyKey) || [];
    for (const [variantKey, url] of Object.entries(font.urls)) {
      const [weightStr, style] = variantKey.split("-");
      variants.push({
        weight: Number(weightStr) || 400,
        italic: style === "italic",
        url,
      });
    }
    familyVariantsCache.set(familyKey, variants);
  }
}

/**
 * Подбирает URL варианта шрифта по family-строке + weight + style.
 * Если точного weight нет — ближайший. Если italic нет — fallback на normal.
 * Возвращает null если family вообще не зарегистрирована (custom-шрифт).
 */
function resolveFontUrl(family, weight = 400, style = "normal") {
  buildFamilyIndex();
  const familyKey = normalizeFamily(family);
  const variants = familyVariantsCache.get(familyKey);
  if (!variants || variants.length === 0) return null;

  const wantItalic = style === "italic";
  // Сначала пытаемся найти italic если просили italic.
  let pool = wantItalic ? variants.filter((v) => v.italic) : variants.filter((v) => !v.italic);
  if (pool.length === 0) pool = variants;

  // Ближайший по weight.
  let best = pool[0];
  let bestDiff = Math.abs(best.weight - weight);
  for (let i = 1; i < pool.length; i++) {
    const d = Math.abs(pool[i].weight - weight);
    if (d < bestDiff) {
      best = pool[i];
      bestDiff = d;
    }
  }
  return best.url;
}

function loadFontByUrl(url) {
  if (!url) return Promise.resolve(null);
  if (fontCache.has(url)) return Promise.resolve(fontCache.get(url));
  if (fontLoadPromises.has(url)) return fontLoadPromises.get(url);

  const promise = new Promise((resolve) => {
    opentype.load(url, (err, font) => {
      if (err || !font) {
        // Не падаем: невозможность спарсить шрифт = clamp фолбэкается.
        console.warn("[textGlyphBbox] failed to load font:", url, err?.message || err);
        fontLoadPromises.delete(url);
        resolve(null);
        return;
      }
      fontCache.set(url, font);
      fontLoadPromises.delete(url);
      resolve(font);
    });
  });
  fontLoadPromises.set(url, promise);
  return promise;
}

/**
 * Прогрев — стартует загрузку всех известных файлов шрифтов в фоне.
 * Вызывать один раз при инициализации конструктора.
 */
export function prewarmGlyphFonts() {
  buildFamilyIndex();
  const seen = new Set();
  for (const variants of familyVariantsCache.values()) {
    for (const v of variants) {
      if (seen.has(v.url)) continue;
      seen.add(v.url);
      loadFontByUrl(v.url).catch(() => {});
    }
  }
}

/**
 * Синхронно возвращает Font если он уже в кэше, иначе стартует загрузку
 * и возвращает null (вызывающий код фолбэкается на другой источник
 * для текущего кадра, но следующий drag получит точные числа).
 */
function getFontSync(family, weight, style) {
  const url = resolveFontUrl(family, weight, style);
  if (!url) return null;
  if (fontCache.has(url)) return fontCache.get(url);
  // Стартуем загрузку в фоне.
  loadFontByUrl(url).catch(() => {});
  return null;
}

/**
 * Точный glyph-bbox многострочного текста.
 *
 * ГИБРИДНАЯ МОДЕЛЬ:
 *   • opentype.js — точная **форма и размер** ink-bbox (bb.y1/y2 от baseline).
 *     Не зависит от Chrome-бага загрузки шрифтов в canvas.
 *   • canvas.measureText().fontBoundingBoxAscent/Descent — **позиция baseline**
 *     в CSS line-box. Эти значения берёт тот же engine что layout-ит CSS,
 *     поэтому они точно совпадают с реальным положением шрифта на экране
 *     (даже когда opentype font.ascender/descender отличаются от того,
 *     что Chrome использует для CSS — это бывает с шрифтами где
 *     useTypoMetrics не установлен, ascender hhea ≠ ascender OS/2 typo).
 *
 * Возвращает физические сантиметры:
 *   { widthCm, heightCm, inkOffsetXCm, inkOffsetYCm, linesCount }
 * inkOffset* — смещение центра ink-bbox относительно центра CSS layout-div'а.
 */

// Кэш реальных glyph metrics шрифта при CSS-рендере: `${family}|${weight}|${style}` →
// { capTopRatio, descBottomRatio } — где capTopRatio = верхний пиксель глифа M
// делён на fontSize (от top line-box CSS), descBottomRatio = нижний пиксель глифа g.
// Используем для эмпирического определения позиции baseline (потому что
// fontBoundingBox/font.ascender могут не совпадать с реальным CSS-рендером).
const cssFontMetricsCache = new Map();
let measureCanvas = null;

function getCssFontMetrics(fontFamily, fontWeight, fontStyle) {
  const key = `${fontFamily}|${fontWeight}|${fontStyle}`;
  const cached = cssFontMetricsCache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const probeSize = 200;
  const padding = probeSize; // запас сверху/снизу для выноса.
  measureCanvas.width = probeSize * 4;
  measureCanvas.height = probeSize * 3;
  const ctx = measureCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Рисуем "M" (cap) и "g" (descender) при baseline-режиме CSS = "top",
  // чтобы привязка к top line-box была явной. Используем textBaseline="top"
  // — так Chrome помещает top-of-em-box на y=padding.
  ctx.font = `${fontStyle} ${fontWeight} ${probeSize}px ${fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";

  function scanGlyph(char) {
    ctx.clearRect(0, 0, measureCanvas.width, measureCanvas.height);
    ctx.fillText(char, padding, padding);
    const data = ctx.getImageData(0, 0, measureCanvas.width, measureCanvas.height).data;
    let topY = -1;
    let bottomY = -1;
    for (let y = 0; y < measureCanvas.height; y++) {
      let rowHas = false;
      for (let x = 0; x < measureCanvas.width; x += 4) { // шаг 4 для скорости
        if (data[(y * measureCanvas.width + x) * 4 + 3] > 16) { rowHas = true; break; }
      }
      if (rowHas) {
        if (topY < 0) topY = y;
        bottomY = y;
      }
    }
    if (topY < 0) return null;
    return { topPx: topY - padding, bottomPx: bottomY - padding };
  }

  const mScan = scanGlyph("M");
  const gScan = scanGlyph("g");
  if (!mScan || !gScan) return null;

  // capTopPx — расстояние от top em-box CSS до верхнего пикселя M.
  // descBottomPx — расстояние от top em-box CSS до нижнего пикселя g.
  // Em-box = fontSize-высокий блок, top line-box = top em-box при lineHeight=1.
  const result = {
    // от top line-box (при lineHeight=1) до верхнего пикселя M (cap top)
    capTopRatio: mScan.topPx / probeSize,
    // от top line-box до нижнего пикселя g (descender bottom)
    descBottomRatio: gScan.bottomPx / probeSize,
    // также сохраним где baseline (низ M = baseline для большинства шрифтов)
    capBottomRatio: mScan.bottomPx / probeSize,
  };
  cssFontMetricsCache.set(key, result);
  return result;
}

export function measureTextGlyphBboxCm({
  text,
  uppercase = false,
  fontFamily,
  fontSize,
  fontWeight = 400,
  fontStyle = "normal",
  lineHeight = 1.05,
  letterSpacing = 0,
  linesOverride = null,
  physicalWidthCm,
  baselinePhysicalWidthCm,
}) {
  const font = getFontSync(fontFamily, fontWeight, fontStyle);
  if (!font) return null;
  const rawText = String(text ?? "");
  if (!rawText.trim().length) return null;

  const sizeScale = baselinePhysicalWidthCm > 0
    ? (physicalWidthCm / baselinePhysicalWidthCm)
    : 1;
  // PDF/preview pipeline: 1 size unit ≈ 1 mm.
  const fontSizeCm = (fontSize / 10) * sizeScale;
  const letterSpacingCm = (letterSpacing / 10) * sizeScale;
  const lineHeightCm = lineHeight * fontSizeCm; // CSS line-box height

  // Позиция baseline в CSS line-box — из canvas font metrics
  // (то что реально использует CSS layout engine).
  const cssMetrics = getCssFontMetrics(fontFamily, fontWeight, fontStyle);
  let baselineFromTopCm;
  if (cssMetrics) {
    // halfLeading может быть отрицательным (lineHeight < fontBox).
    const fontBoxHeightCm = (cssMetrics.ascentRatio + cssMetrics.descentRatio) * fontSizeCm;
    const halfLeadingCm = (lineHeightCm - fontBoxHeightCm) / 2;
    baselineFromTopCm = halfLeadingCm + cssMetrics.ascentRatio * fontSizeCm;
  } else {
    // Fallback: opentype font.ascender (хуже, но работает).
    const unitsPerEm = font.unitsPerEm || 1000;
    const cmPerUnit = fontSizeCm / unitsPerEm;
    const ascCm = (font.ascender || unitsPerEm * 0.8) * cmPerUnit;
    const descCm = (font.descender || -unitsPerEm * 0.2) * cmPerUnit;
    const fontBoxHeightCm = ascCm - descCm;
    const halfLeadingCm = (lineHeightCm - fontBoxHeightCm) / 2;
    baselineFromTopCm = halfLeadingCm + ascCm;
  }

  const sourceText = uppercase ? rawText.toUpperCase() : rawText;
  const lines = Array.isArray(linesOverride) && linesOverride.length > 0
    ? linesOverride
    : sourceText.split("\n");

  const unitsPerEm = font.unitsPerEm || 1000;
  const cmPerUnit = fontSizeCm / unitsPerEm;
  const pxToCm = fontSizeCm / fontSize;

  let unionMinX = Infinity;
  let unionMinY = Infinity;
  let unionMaxX = -Infinity;
  let unionMaxY = -Infinity;
  let maxLineWidthCm = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx] || "";
    if (!lineText.length) continue;

    const baselineYCm = baselineFromTopCm + lineIdx * lineHeightCm;

    const glyphs = font.stringToGlyphs(lineText);
    let xCursorCm = 0;
    for (let g = 0; g < glyphs.length; g++) {
      const glyph = glyphs[g];
      const path = glyph.getPath(0, 0, fontSize);
      const bb = path.getBoundingBox();
      if (Number.isFinite(bb.x1) && bb.x2 > bb.x1 && bb.y2 > bb.y1) {
        const glyphMinXCm = xCursorCm + bb.x1 * pxToCm;
        const glyphMaxXCm = xCursorCm + bb.x2 * pxToCm;
        const glyphMinYCm = baselineYCm + bb.y1 * pxToCm;
        const glyphMaxYCm = baselineYCm + bb.y2 * pxToCm;
        unionMinX = Math.min(unionMinX, glyphMinXCm);
        unionMaxX = Math.max(unionMaxX, glyphMaxXCm);
        unionMinY = Math.min(unionMinY, glyphMinYCm);
        unionMaxY = Math.max(unionMaxY, glyphMaxYCm);
      }
      const advanceCm = (glyph.advanceWidth || 0) * cmPerUnit;
      xCursorCm += advanceCm;
      if (g < glyphs.length - 1) xCursorCm += letterSpacingCm;
    }
    const lineWidthCm = xCursorCm - (glyphs.length > 1 ? letterSpacingCm : 0);
    if (lineWidthCm > maxLineWidthCm) maxLineWidthCm = lineWidthCm;
  }

  if (!Number.isFinite(unionMinX) || !Number.isFinite(unionMaxX)) return null;

  const inkWidthCm = unionMaxX - unionMinX;
  const inkHeightCm = unionMaxY - unionMinY;
  if (inkWidthCm <= 0 || inkHeightCm <= 0) return null;

  const layoutHeightCm = lines.length * lineHeightCm;
  const inkCenterXCm = (unionMinX + unionMaxX) / 2;
  const inkCenterYCm = (unionMinY + unionMaxY) / 2;
  const layoutCenterXCm = maxLineWidthCm / 2;
  const layoutCenterYCm = layoutHeightCm / 2;

  return {
    widthCm: inkWidthCm,
    heightCm: inkHeightCm,
    inkOffsetXCm: inkCenterXCm - layoutCenterXCm,
    inkOffsetYCm: inkCenterYCm - layoutCenterYCm,
    linesCount: lines.length,
  };
}

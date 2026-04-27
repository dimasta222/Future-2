import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { PDFDocument } from "pdf-lib";
import {
  getConstructorTextFont,
  getConstructorTextGradient,
  buildConstructorShapeSvg,
  getConstructorShape,
  getConstructorLineVisualMetrics,
} from "../components/constructor/constructorConfig.js";

const CM_TO_PT = 28.3465;
const DPI_300_SCALE = 300 / 72;
const LOGICAL_PRINT_PX_PER_CM = 10;

function cmToPt(cm) {
  return cm * CM_TO_PT;
}

// Применяет CSS-style вращение слоя через PDF CTM. Тонкости:
//   1) `setCurrentTransformationMatrix` пишет PDF-оператор `cm`, который
//      применяется в нативной системе PDF (origin bottom-left, y-up).
//      Координаты pivot из jsPDF user-space (top-left, y-down) надо
//      инвертировать по Y: pivotY_pdf = pageH - pivotY_user.
//   2) CSS `rotate(+θ)` визуально по часовой стрелке (y-down CW). PDF
//      нативная матрица с +θ крутит CCW (y-up). Поэтому в матрицу подаём
//      `-θ`, чтобы итоговое направление совпало с превью.
function applyLayerRotation(doc, rotationDeg, cxPt, cyPt, pageHPt) {
  if (!rotationDeg) return false;
  const rad = -((rotationDeg * Math.PI) / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const px = cxPt;
  const py = pageHPt - cyPt;
  doc.saveGraphicsState();
  doc.setCurrentTransformationMatrix(
    doc.Matrix(cos, sin, -sin, cos, px - px * cos + py * sin, py - px * sin - py * cos),
  );
  return true;
}

function getDirectionalOffsetCm(angleDeg, distancePx) {
  const radians = ((Number(angleDeg) || 0) * Math.PI) / 180;
  const radiusCm = (Number(distancePx) || 0) / LOGICAL_PRINT_PX_PER_CM;
  return { x: Math.cos(radians) * radiusCm, y: Math.sin(radians) * radiusCm };
}

function isLineShape(layer) {
  return getConstructorShape(layer?.shapeKey)?.category === "lines";
}

// === DEBUG: реальный ink-bbox каждого слоя по итоговому canvas. Печатается
// после рендера всех слоёв. Сравниваем с nominal layerPositionToCm() и с
// размером в заказе — чтобы найти точку расхождения.
const __exportInkDebug = [];

// Измеряем реальный baseline DOM для заданных параметров шрифта. Возвращаем
// смещение baseline от верха line-box в пикселях — то же значение нужно
// использовать в canvas с textBaseline="alphabetic", чтобы глиф сел ровно там же,
// где его рисует CSS внутри такого же line-box.
const __cssBaselineCache = new Map();
function measureCssBaselineOffsetPx(fontFamily, fontWeight, fontStyle, fontSizePx, lineHeight) {
  const key = `${fontFamily}|${fontWeight}|${fontStyle}|${fontSizePx}|${lineHeight}`;
  if (__cssBaselineCache.has(key)) return __cssBaselineCache.get(key);
  if (typeof document === "undefined") return fontSizePx * 0.8;
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:fixed;left:-9999px;top:-9999px;visibility:hidden;font-family:${fontFamily};font-weight:${fontWeight};font-style:${fontStyle};font-size:${fontSizePx}px;line-height:${lineHeight};white-space:pre;`;
  // baselineMarker с vertical-align:baseline и нулевым размером
  // ложится ровно на baseline строки.
  const marker = document.createElement("span");
  marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
  wrap.appendChild(marker);
  wrap.appendChild(document.createTextNode("M\u00c5\u042f\u0444"));
  document.body.appendChild(wrap);
  const wrapRect = wrap.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const baselineOffset = markerRect.top - wrapRect.top;
  document.body.removeChild(wrap);
  __cssBaselineCache.set(key, baselineOffset);
  return baselineOffset;
}

function scanCanvasInkBboxPx(canvas) {
  try {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      const rowStart = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (data[rowStart + x * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0 || maxY < 0) return null;
    return {
      minX,
      minY,
      maxX: maxX + 1,
      maxY: maxY + 1,
      widthPx: (maxX + 1) - minX,
      heightPx: (maxY + 1) - minY,
    };
  } catch {
    return null;
  }
}

function getLineShapeDimensionsCm(layer, printArea) {
  const physW = printArea.physicalWidthCm;
  const effH = printArea.effectivePhysH ?? printArea.physicalHeightCm;
  const lineWidthPx = Number(layer.lineWidthPx) || ((layer.widthCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  const lineHeightPx = Number(layer.lineHeightPx) || ((layer.heightCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  const lineAspectRatio = Math.max(0.2, lineWidthPx / Math.max(1, lineHeightPx));
  const vm = getConstructorLineVisualMetrics(layer.shapeKey, layer.strokeWidth, lineAspectRatio);
  return {
    w: Math.min(physW, (lineWidthPx / LOGICAL_PRINT_PX_PER_CM) * (vm.visibleWidthPx / Math.max(1, vm.layoutWidthPx))),
    h: Math.min(effH, (lineHeightPx / LOGICAL_PRINT_PX_PER_CM) * (vm.visibleHeightPx / Math.max(1, vm.layoutHeightPx))),
    lineAspectRatio,
  };
}

function layerPositionToCm(layer, printArea) {
  const physW = printArea.physicalWidthCm;
  const effH = printArea.effectivePhysH ?? printArea.physicalHeightCm;
  const cx = (layer.position.x / 100) * physW;
  const cy = (layer.position.y / 100) * effH;
  let w, h;
  if (layer.type === "shape" && isLineShape(layer)) {
    const lineDims = getLineShapeDimensionsCm(layer, printArea);
    w = lineDims.w;
    h = lineDims.h;
  } else {
    w = layer.widthCm ?? 0;
    h = layer.heightCm ?? 0;
  }
  return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2 };
}


function isTextBold(layer) {
  const font = getConstructorTextFont(layer.fontKey || "outfit");
  return (layer.weight ?? font.regularWeight ?? 500) >= 700;
}

function detectImageFormat(src) {
  if (typeof src === "string") {
    if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")) return "JPEG";
    if (src.startsWith("data:image/webp")) return "WEBP";
  }
  return "PNG";
}

export async function exportPrintPdf({ layers, printArea }) {
  const physW = printArea.physicalWidthCm;
  const physH = printArea.physicalHeightCm;

  // Use real physical print-area dimensions for the PDF page.
  // The UI print area now matches the physical aspect ratio (see OVERSIZE_PRINT_AREA_GEOMETRY),
  // so no Y-stretch is needed. Photoshop will show exactly physW × physH.
  const effectivePhysH = physH;

  // Augment printArea so all downstream helpers use effectivePhysH for Y mapping
  const pa = { ...printArea, effectivePhysH };

  const pageW = cmToPt(physW);
  const pageH = cmToPt(effectivePhysH);

  console.log("[exportPrintPdf] start", { physW, physH, effectivePhysH, pageW, pageH, layerCount: layers.length });

  // Сбрасываем накопитель перед новым экспортом.
  __exportInkDebug.length = 0;

  const doc = new jsPDF({
    orientation: physW > effectivePhysH ? "landscape" : "portrait",
    unit: "pt",
    format: [pageW, pageH],
    compress: true,
  });

  console.log("[exportPrintPdf] jsPDF created");


  const sortedLayers = [...layers].sort((a, b) => {
    const ai = layers.indexOf(a);
    const bi = layers.indexOf(b);
    return ai - bi;
  });

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    console.log("[exportPrintPdf] rendering layer", layer.id, layer.type, layer.name);

    try {
      if (layer.type === "upload") {
        await renderUploadLayer(doc, layer, pa);
      } else if (layer.type === "text") {
        await renderTextLayer(doc, layer, pa);
      } else if (layer.type === "shape") {
        await renderShapeLayer(doc, layer, pa);
      }
      console.log("[exportPrintPdf] layer done", layer.id);
    } catch (layerErr) {
      console.error("[exportPrintPdf] layer failed", layer.id, layer.type, layerErr);
      throw layerErr;
    }
  }

  console.log("[exportPrintPdf] generating output");
  if (__exportInkDebug.length) {
    console.table(__exportInkDebug);
    const inkLeft = Math.min(...__exportInkDebug.map((r) => r.inkLeft));
    const inkTop = Math.min(...__exportInkDebug.map((r) => r.inkTop));
    const inkRight = Math.max(...__exportInkDebug.map((r) => r.inkRight));
    const inkBottom = Math.max(...__exportInkDebug.map((r) => r.inkBottom));
    console.log("[exportPrintPdf][ink] composition ink-bbox cm", {
      left: inkLeft.toFixed(3),
      top: inkTop.toFixed(3),
      right: inkRight.toFixed(3),
      bottom: inkBottom.toFixed(3),
      widthCm: (inkRight - inkLeft).toFixed(3),
      heightCm: (inkBottom - inkTop).toFixed(3),
      pageWcm: physW.toFixed(3),
      pageHcm: effectivePhysH.toFixed(3),
    });
  }
  return doc.output("arraybuffer");
}

async function renderUploadLayer(doc, layer, printArea) {
  const pos = layerPositionToCm(layer, printArea);
  const xPt = cmToPt(pos.x);
  const yPt = cmToPt(pos.y);
  const wPt = cmToPt(pos.w);
  const hPt = cmToPt(pos.h);
  const rotationDeg = layer.rotationDeg ?? 0;
  const pageHPt = cmToPt(printArea.effectivePhysH ?? printArea.physicalHeightCm);

  const applyRotation = () => {
    if (!rotationDeg) return;
    applyLayerRotation(doc, rotationDeg, xPt + wPt / 2, yPt + hPt / 2, pageHPt);
  };
  const restoreRotation = () => {
    if (rotationDeg) doc.restoreGraphicsState();
  };

  if (layer.sourceType === "svg" && layer.originalSvgText) {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(layer.originalSvgText, "image/svg+xml");
      const svgEl = svgDoc.documentElement;
      svgEl.setAttribute("width", String(wPt));
      svgEl.setAttribute("height", String(hPt));
      document.body.appendChild(svgEl);
      applyRotation();
      await doc.svg(svgEl, { x: xPt, y: yPt, width: wPt, height: hPt });
      restoreRotation();
      document.body.removeChild(svgEl);
      return;
    } catch { /* fallback to raster */ }
  }

  if (layer.sourceType === "pdf" && layer.originalData) {
    try {
      const srcPdf = await PDFDocument.load(layer.originalData);
      const destPdf = await PDFDocument.load(doc.output("arraybuffer"));
      const [embeddedPage] = await destPdf.embedPdf(srcPdf, [0]);
      const page = destPdf.getPages()[0];
      const scaledDims = embeddedPage.scale(wPt / embeddedPage.width);
      page.drawPage(embeddedPage, {
        x: xPt,
        y: cmToPt(printArea.effectivePhysH ?? printArea.physicalHeightCm) - yPt - hPt,
        width: scaledDims.width,
        height: scaledDims.height,
      });
      await destPdf.save();
      return;
    } catch { /* fallback to raster */ }
  }

  // Pass original image directly — no canvas re-encoding, preserves ICC profile
  const format = detectImageFormat(layer.src);
  applyRotation();
  doc.addImage(layer.src, format, xPt, yPt, wPt, hPt);
  restoreRotation();
}

async function renderTextLayer(doc, layer, printArea) {
  const physW = printArea.physicalWidthCm;
  const effH = printArea.effectivePhysH ?? printArea.physicalHeightCm;
  // sizeScale масштабирует все «px-единицы» (fontSize, letterSpacing, stroke, shadow)
  // относительно базового размера (XS). Фигуры/принты сохраняют widthCm уже
  // умноженным на sizeScale в normalize, поэтому текст должен масштабироваться так же.
  const baselinePhysW = Number(printArea.baselinePhysicalWidthCm) || physW;
  const sizeScale = physW / Math.max(0.001, baselinePhysW);
  const cx = (layer.position.x / 100) * physW;
  const cy = (layer.position.y / 100) * effH;
  const lineHeight = layer.lineHeight ?? 1.05;
  const rotationDeg = layer.rotationDeg ?? 0;

  const font = getConstructorTextFont(layer.fontKey || "outfit");
  const fontWeight = isTextBold(layer) ? (font.boldWeight ?? 700) : (layer.weight ?? font.regularWeight ?? 400);
  const fontStyle = (font.supportsItalic && layer.italic) ? "italic" : "normal";
  const textValue = layer.uppercase ? (layer.value || "").toUpperCase() : (layer.value || "");
  if (!textValue.trim()) return;

  // Always use canvas rendering — jsPDF TTF vector text silently fails for
  // Cyrillic and many other non-Latin glyphs (renders invisible/empty without
  // throwing an error), so the try-catch fallback never triggers.
  // Canvas rendering handles all scripts reliably at 120 px/cm (~305 DPI).

  // Canvas fallback for effects, unavailable TTF, or failed vector rendering.
  // Передаём baseline-метрики (XS): canvas рендерится на стабильном размере,
  // а в PDF вставляется уже масштабированно (× sizeScale). Это математически
  // совпадает с measureTextPdfInkBboxCm() в UI и Photoshop Trim.
  const baselineFontSizeCm = (layer.size ?? 36) / LOGICAL_PRINT_PX_PER_CM;
  const baselineLetterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;
  const baselineBoxWidthCm = ((layer.textBoxWidth ?? 60) / 100) * baselinePhysW;
  await renderTextViaCanvas(doc, layer, textValue, {
    cx, cy,
    boxWidthCm: baselineBoxWidthCm,
    fontSizeCm: baselineFontSizeCm,
    lineHeight,
    letterSpacingCm: baselineLetterSpacingCm,
    rotationDeg,
    font, fontWeight, fontStyle, physW, effH,
    sizeScale,
  });
}

const TEXT_CANVAS_PX_PER_CM = 120;

async function renderTextViaCanvas(doc, layer, textValue, opts) {
  const { cx, cy, boxWidthCm, fontSizeCm, lineHeight, letterSpacingCm, rotationDeg, font, fontWeight, fontStyle, sizeScale = 1 } = opts;
  const pxPerCm = TEXT_CANVAS_PX_PER_CM;
  // Canvas рисуем в baseline-масштабе (XS), без sizeScale. Все «px-единицы»
  // (stroke / shadow / etc.) тоже без sizeScale. Финальный imgWidthCm/HeightCm
  // умножаем на sizeScale при вставке в PDF — рендер на больших размерах = baseline × scale.
  const fontSizePx = fontSizeCm * pxPerCm;
  const boxWidthPx = boxWidthCm * pxPerCm;
  const letterSpacingPx = letterSpacingCm * pxPerCm;
  const isOutlineOnly = !!layer.textOutlineOnly && (Number(layer.outlineWidth) || 0) > 0;
  const sourceStrokeWidth = isOutlineOnly ? (layer.outlineWidth ?? 0) : (layer.strokeWidth ?? 0);
  const strokeColorEffective = isOutlineOnly ? (layer.color || "#ffffff") : (layer.strokeColor || "#111111");
  const strokeWidthPx = (sourceStrokeWidth / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowOffsetXPx = ((layer.shadowOffsetX ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowOffsetYPx = ((layer.shadowOffsetY ?? 2) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowBlurPx = ((layer.shadowBlur ?? 14) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;

  const canvasFontStr = `${fontStyle} ${fontWeight} ${fontSizePx}px ${font.family}`;

  await document.fonts.load(canvasFontStr);

  const lines = wrapText(textValue, canvasFontStr, boxWidthPx, letterSpacingPx);
  const lineHeightPx = fontSizePx * lineHeight;
  const textBlockHeight = lines.length * lineHeightPx;
  // CSS line-box делит leading пополам: глиф в каждой строке центрируется,
  // а его EM-box смещается вниз на halfLeading относительно верха line-box.
  // canvas с textBaseline="top" прижимает EM-box к lineY, поэтому нужна
  // компенсация — иначе текст в PDF/PNG будет визуально выше, чем в DOM.
  const halfLeadingPx = Math.max(0, (lineHeight - 1) * fontSizePx) / 2;

  const shadowPad = layer.shadowEnabled
    ? Math.ceil(shadowBlurPx + Math.max(Math.abs(shadowOffsetXPx), Math.abs(shadowOffsetYPx)))
    : 0;
  const strokePad = Math.ceil(strokeWidthPx);
  // Extra padding for glyph overshoot (italic slant, ascenders, descenders, script flourishes)
  const glyphOvershoot = Math.ceil(fontSizePx * 0.35);
  const pad = Math.max(shadowPad, strokePad) + glyphOvershoot + Math.ceil(halfLeadingPx);

  const canvasW = Math.ceil(boxWidthPx + pad * 2);
  const canvasH = Math.ceil(textBlockHeight + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  ctx.font = canvasFontStr;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${letterSpacingPx}px`;

  // CSS-baseline, измеренный в DOM с теми же параметрами. Это позволяет
  // canvas рисовать глиф ровно там, где его располагает CSS line-box.
  const cssBaselineOffsetPx = measureCssBaselineOffsetPx(font.family, fontWeight, fontStyle, fontSizePx, lineHeight);
  const fontAscent = cssBaselineOffsetPx;

  const align = layer.textAlign || "center";

  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || "#111111";
    ctx.shadowOffsetX = shadowOffsetXPx;
    ctx.shadowOffsetY = shadowOffsetYPx;
    ctx.shadowBlur = shadowBlurPx;
  }

  const gradient = layer.textFillMode === "gradient" ? getConstructorTextGradient(layer.gradientKey) : null;

  for (let i = 0; i < lines.length; i++) {
    // CSS-измеренный baseline уже включает halfLeading + ascent_metric из таблицы шрифта.
    const lineY = pad + i * lineHeightPx + fontAscent;
    let lineX = pad;
    if (align === "center") lineX = pad + (boxWidthPx - measureLineWidth(ctx, lines[i], letterSpacingPx)) / 2;
    else if (align === "right") lineX = pad + boxWidthPx - measureLineWidth(ctx, lines[i], letterSpacingPx);

    if (strokeWidthPx > 0) {
      ctx.strokeStyle = strokeColorEffective;
      ctx.lineWidth = strokeWidthPx;
      ctx.lineJoin = "round";
      ctx.strokeText(lines[i], lineX, lineY);
    }

    if (gradient && gradient.stops?.length) {
      const lw = measureLineWidth(ctx, lines[i], letterSpacingPx);
      const grad = ctx.createLinearGradient(lineX, lineY, lineX + lw, lineY + lineHeightPx);
      gradient.stops.forEach((stop, idx) => {
        grad.addColorStop(gradient.stops.length === 1 ? 0 : idx / (gradient.stops.length - 1), stop);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = layer.color || "#ffffff";
    }
    if (!isOutlineOnly) {
      ctx.fillText(lines[i], lineX, lineY);
    }

    if (layer.underline || layer.strikethrough) {
      const lw = measureLineWidth(ctx, lines[i], letterSpacingPx);
      const decorThickness = fontSizePx * 0.06;
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = gradient ? ctx.fillStyle : (layer.color || "#ffffff");
      if (layer.underline) {
        ctx.fillRect(lineX, lineY + fontSizePx * 0.12, lw, decorThickness);
      }
      if (layer.strikethrough) {
        ctx.fillRect(lineX, lineY - fontSizePx * 0.30, lw, decorThickness);
      }
      if (layer.strikethrough) {
        ctx.fillRect(lineX, lineY - fontSizePx * 0.30, lw, decorThickness);
      }
      ctx.restore();
    }
  }

  const imgData = canvas.toDataURL("image/png");
  // Canvas был отрисован в baseline (XS). Финальные размеры в PDF = baseline × sizeScale.
  const imgWidthCm = (canvasW / pxPerCm) * sizeScale;
  const imgHeightCm = (canvasH / pxPerCm) * sizeScale;

  // Find real ink bbox of rendered canvas (incl. shadow/stroke/decoration)
  // и используем его только для отладочной разметки. Центрирование canvas
  // делаем строго по геометрическому центру (= центр CSS line-box), потому
  // что в DOM-превью слой тоже центрируется по line-box. Иначе текст в PDF
  // будет визуально смещён относительно превью на величину дисбаланса
  // half-leading + ascent vs descent.
  const inkCenterXcm = imgWidthCm / 2;
  const inkCenterYcm = imgHeightCm / 2;
  const drawX = cx - inkCenterXcm;
  const drawY = cy - inkCenterYcm;

  try {
    const ink = scanCanvasInkBboxPx(canvas);
    if (ink) {
      const inkLeftCm = drawX + (ink.minX / pxPerCm) * sizeScale;
      const inkTopCm = drawY + (ink.minY / pxPerCm) * sizeScale;
      const inkRightCm = drawX + (ink.maxX / pxPerCm) * sizeScale;
      const inkBottomCm = drawY + (ink.maxY / pxPerCm) * sizeScale;
      const inkCenterCanvasYpx = (ink.minY + ink.maxY) / 2;
      const canvasGeomCenterYpx = canvasH / 2;
      const inkVsGeomDeltaPx = inkCenterCanvasYpx - canvasGeomCenterYpx;
      // Снимем DOM-bbox того же слоя из превью, чтобы сравнить.
      let domBbox = null;
      try {
        const domNode = document.querySelector(`[data-text-layer-id="${layer.id}"]`)
          || document.querySelector(`[data-layer-id="${layer.id}"]`);
        if (domNode) {
          const r = domNode.getBoundingClientRect();
          const printAreaNode = domNode.closest("[data-print-area]")
            || document.querySelector("[data-print-area]");
          if (printAreaNode) {
            const pr = printAreaNode.getBoundingClientRect();
            domBbox = {
              relTopPct: ((r.top - pr.top) / pr.height) * 100,
              relLeftPct: ((r.left - pr.left) / pr.width) * 100,
              relCxPct: ((r.left + r.width / 2 - pr.left) / pr.width) * 100,
              relCyPct: ((r.top + r.height / 2 - pr.top) / pr.height) * 100,
              widthPct: (r.width / pr.width) * 100,
              heightPct: (r.height / pr.height) * 100,
            };
          }
        }
      } catch { /* ignore */ }
      __exportInkDebug.push({
        id: layer.id, type: "text", name: layer.name,
        value: (textValue || "").slice(0, 24),
        posX: layer.position?.x, posY: layer.position?.y,
        cx: Number(cx.toFixed(3)), cy: Number(cy.toFixed(3)),
        canvasW: canvasW, canvasH: canvasH,
        imgW: Number(imgWidthCm.toFixed(3)), imgH: Number(imgHeightCm.toFixed(3)),
        inkCenterXcm: Number(inkCenterXcm.toFixed(3)),
        inkCenterYcm: Number(inkCenterYcm.toFixed(3)),
        drawLeft: Number(drawX.toFixed(3)), drawTop: Number(drawY.toFixed(3)),
        inkLeft: Number(inkLeftCm.toFixed(3)), inkTop: Number(inkTopCm.toFixed(3)),
        inkRight: Number(inkRightCm.toFixed(3)), inkBottom: Number(inkBottomCm.toFixed(3)),
        inkW: Number((inkRightCm - inkLeftCm).toFixed(3)),
        inkH: Number((inkBottomCm - inkTopCm).toFixed(3)),
        linesCount: lines.length,
        textBlockHeightPx: Number(textBlockHeight.toFixed(2)),
        padPx: pad,
        // === diagnostic ===
        fontSizePx: Number(fontSizePx.toFixed(2)),
        lineHeight,
        halfLeadingPx: Number(halfLeadingPx.toFixed(2)),
        fontAscentPx: Number(fontAscent.toFixed(2)),
        baselineYpx: Number((pad + fontAscent).toFixed(2)),
        inkCenterCanvasYpx: Number(inkCenterCanvasYpx.toFixed(2)),
        canvasGeomCenterYpx: Number(canvasGeomCenterYpx.toFixed(2)),
        inkVsGeomDeltaPx: Number(inkVsGeomDeltaPx.toFixed(2)),
        domRelCxPct: domBbox ? Number(domBbox.relCxPct.toFixed(3)) : null,
        domRelCyPct: domBbox ? Number(domBbox.relCyPct.toFixed(3)) : null,
        domWidthPct: domBbox ? Number(domBbox.widthPct.toFixed(3)) : null,
        domHeightPct: domBbox ? Number(domBbox.heightPct.toFixed(3)) : null,
      });
    }
  } catch { /* debug only */ }

  const xPt = cmToPt(drawX);
  const yPt = cmToPt(drawY);
  const wPt = cmToPt(imgWidthCm);
  const hPt = cmToPt(imgHeightCm);

  if (rotationDeg) {
    const cxPt = cmToPt(cx);
    const cyPt = cmToPt(cy);
    const pageHPt = cmToPt(opts.effH ?? opts.physH);
    applyLayerRotation(doc, rotationDeg, cxPt, cyPt, pageHPt);
  }

  doc.addImage(imgData, "PNG", xPt, yPt, wPt, hPt);

  if (rotationDeg) {
    doc.restoreGraphicsState();
  }
}

// Допуск переноса: ctx.measureText в canvas включает trailing letter-spacing после
// последней буквы, а DOM его не рисует — поэтому к лимиту добавляем одну
// letter-spacing + маленький субпиксельный запас. Без этого короткие строки
// (напр. IVANOV) ложно переносятся на лишнюю строку.
const WRAP_TOLERANCE_PX = 1;

function wrapText(text, fontStr, maxWidth, letterSpacingPx) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = fontStr;
  ctx.letterSpacing = `${letterSpacingPx}px`;
  const limit = maxWidth + Math.max(0, letterSpacingPx) + WRAP_TOLERANCE_PX;
  const breakLongToken = (token, lines) => {
    let buf = "";
    for (const ch of token) {
      const candidate = buf + ch;
      if (buf && measureLineWidth(ctx, candidate, letterSpacingPx) > limit) {
        lines.push(buf);
        buf = ch;
      } else {
        buf = candidate;
      }
    }
    return buf;
  };
  const paragraphs = text.split("\n");
  const lines = [];
  for (const para of paragraphs) {
    if (!para.length) { lines.push(""); continue; }
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const test = line + word;
      if (measureLineWidth(ctx, test, letterSpacingPx) > limit && line.length > 0) {
        lines.push(line);
        const trimmed = word.trimStart();
        if (measureLineWidth(ctx, trimmed, letterSpacingPx) > limit) {
          line = breakLongToken(trimmed, lines);
        } else {
          line = trimmed;
        }
      } else if (!line && measureLineWidth(ctx, test, letterSpacingPx) > limit) {
        line = breakLongToken(test, lines);
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function measureLineWidth(ctx, text, _letterSpacingPx) {
  return ctx.measureText(text).width;
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

function cropLineSvgToVisibleArea(svgMarkup, shapeKey, strokeWidth, lineAspectRatio) {
  const vm = getConstructorLineVisualMetrics(shapeKey, strokeWidth, lineAspectRatio);
  const vbX = vm.leftInsetPx;
  const vbY = (vm.layoutHeightPx / 2) - (vm.visibleHeightPx / 2);
  return svgMarkup.replace(/viewBox="[^"]*"/, `viewBox="${vbX} ${vbY} ${vm.visibleWidthPx} ${vm.visibleHeightPx}"`);
}

function buildShapeSvgForLayer(layer, overrides = {}) {
  const shape = getConstructorShape(layer.shapeKey);
  const isLine = shape?.category === "lines";
  const lineAspectRatio = isLine ? getLineAspectRatio(layer) : null;
  const preserveAspectRatio = isLine ? "xMidYMid meet" : "none";
  let svg = buildConstructorShapeSvg({
    shape,
    fillMode: overrides.fillMode ?? (layer.fillMode || "solid"),
    color: overrides.color ?? (layer.color || "#ffffff"),
    gradient: overrides.gradient ?? (layer.fillMode === "gradient" ? getConstructorTextGradient(layer.gradientKey) : null),
    strokeStyle: overrides.strokeStyle ?? (layer.strokeStyle || "none"),
    strokeColor: overrides.strokeColor ?? (layer.strokeColor || "transparent"),
    strokeWidth: overrides.strokeWidth ?? (layer.strokeWidth ?? 0),
    cornerRoundness: layer.cornerRoundness ?? 0,
    lineAspectRatio,
    preserveAspectRatio,
  });
  if (isLine) {
    svg = cropLineSvgToVisibleArea(svg, layer.shapeKey, overrides.strokeWidth ?? (layer.strokeWidth ?? 0), lineAspectRatio);
  }
  return svg;
}

function getLineAspectRatio(layer) {
  const lineWidthPx = Number(layer.lineWidthPx) || ((layer.widthCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  const lineHeightPx = Number(layer.lineHeightPx) || ((layer.heightCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  return Math.max(0.2, lineWidthPx / Math.max(1, lineHeightPx));
}

const SHAPE_PX_PER_CM = 300 / 2.54;

async function renderShapeLayer(doc, layer, printArea) {
  const shape = getConstructorShape(layer.shapeKey);
  if (!shape) return;

  const pos = layerPositionToCm(layer, printArea);
  const rotationDeg = layer.rotationDeg ?? 0;
  const effectType = layer.effectType || "none";
  // sizeScale привязывает effectDistance (хранится в «px при XS») к физическому размеру
  // текущей футболки, чтобы эффект рос синхронно с фигурой.
  const baselinePhysW = Number(printArea.baselinePhysicalWidthCm) || printArea.physicalWidthCm;
  const sizeScale = printArea.physicalWidthCm / Math.max(0.001, baselinePhysW);
  const effectOffset = getDirectionalOffsetCm(layer.effectAngle ?? -45, (layer.effectDistance ?? 0) * sizeScale);

  // Asymmetric padding matching shapeFrame.js logic
  let padLeftCm = 0, padRightCm = 0, padTopCm = 0, padBottomCm = 0;
  if (effectType === "drop-shadow") {
    padLeftCm = Math.max(0, -effectOffset.x);
    padRightCm = Math.max(0, effectOffset.x);
    padTopCm = Math.max(0, -effectOffset.y);
    padBottomCm = Math.max(0, effectOffset.y);
  } else if (effectType === "distort") {
    padLeftCm = Math.abs(effectOffset.x);
    padRightCm = Math.abs(effectOffset.x);
    padTopCm = Math.abs(effectOffset.y);
    padBottomCm = Math.abs(effectOffset.y);
  }

  const totalWCm = pos.w + padLeftCm + padRightCm;
  const totalHCm = pos.h + padTopCm + padBottomCm;

  const shapeWPx = Math.max(1, Math.ceil(pos.w * SHAPE_PX_PER_CM));
  const shapeHPx = Math.max(1, Math.ceil(pos.h * SHAPE_PX_PER_CM));
  const totalWPx = Math.max(1, Math.ceil(totalWCm * SHAPE_PX_PER_CM));
  const totalHPx = Math.max(1, Math.ceil(totalHCm * SHAPE_PX_PER_CM));
  const padLeftPx = Math.round(padLeftCm * SHAPE_PX_PER_CM);
  const padTopPx = Math.round(padTopCm * SHAPE_PX_PER_CM);

  const canvas = document.createElement("canvas");
  canvas.width = totalWPx;
  canvas.height = totalHPx;
  const ctx = canvas.getContext("2d");

  try {
    if (effectType === "drop-shadow") {
      const shadowSvg = buildShapeSvgForLayer(layer, {
        fillMode: "solid", color: layer.effectColor || "#824ef0", gradient: null, strokeColor: "transparent",
      });
      const img = await svgToImg(shadowSvg, shapeWPx, shapeHPx);
      if (img) {
        ctx.drawImage(img, padLeftPx + Math.round(effectOffset.x * SHAPE_PX_PER_CM), padTopPx + Math.round(effectOffset.y * SHAPE_PX_PER_CM), shapeWPx, shapeHPx);
      }
    }

    if (effectType === "distort") {
      const distortA = buildShapeSvgForLayer(layer, {
        fillMode: "solid", color: layer.distortionColorA || "#ed5bb7", gradient: null, strokeColor: "transparent",
      });
      const distortB = buildShapeSvgForLayer(layer, {
        fillMode: "solid", color: layer.distortionColorB || "#1cb8d8", gradient: null, strokeColor: "transparent",
      });
      const [imgA, imgB] = await Promise.all([svgToImg(distortA, shapeWPx, shapeHPx), svgToImg(distortB, shapeWPx, shapeHPx)]);
      if (imgA) ctx.drawImage(imgA, padLeftPx + Math.round(effectOffset.x * SHAPE_PX_PER_CM), padTopPx + Math.round(effectOffset.y * SHAPE_PX_PER_CM), shapeWPx, shapeHPx);
      if (imgB) ctx.drawImage(imgB, padLeftPx - Math.round(effectOffset.x * SHAPE_PX_PER_CM), padTopPx - Math.round(effectOffset.y * SHAPE_PX_PER_CM), shapeWPx, shapeHPx);
    }

    const mainSvg = buildShapeSvgForLayer(layer);
    const mainImg = await svgToImg(mainSvg, shapeWPx, shapeHPx);
    if (mainImg) ctx.drawImage(mainImg, padLeftPx, padTopPx, shapeWPx, shapeHPx);

    const dataUrl = canvas.toDataURL("image/png");
    // Position so the main shape center stays at pos.cx, pos.cy
    let drawXCm = pos.cx - pos.w / 2 - padLeftCm;
    let drawYCm = pos.cy - pos.h / 2 - padTopCm;

    // Match live constructor: the wrapper centers on position, but the main shape inside
    // is offset by -effectOffset/2 due to asymmetric padding (drop-shadow only).
    if (effectType === "drop-shadow") {
      drawXCm -= effectOffset.x / 2;
      drawYCm -= effectOffset.y / 2;
    }

    try {
      const ink = scanCanvasInkBboxPx(canvas);
      if (ink) {
        const inkLeftCm = drawXCm + (ink.minX / SHAPE_PX_PER_CM);
        const inkTopCm = drawYCm + (ink.minY / SHAPE_PX_PER_CM);
        const inkRightCm = drawXCm + (ink.maxX / SHAPE_PX_PER_CM);
        const inkBottomCm = drawYCm + (ink.maxY / SHAPE_PX_PER_CM);
        __exportInkDebug.push({
          id: layer.id, type: "shape", name: layer.name,
          shapeKey: layer.shapeKey, effect: effectType,
          posX: layer.position?.x, posY: layer.position?.y,
          cx: Number(pos.cx.toFixed(3)), cy: Number(pos.cy.toFixed(3)),
          drawLeft: Number(drawXCm.toFixed(3)), drawTop: Number(drawYCm.toFixed(3)),
          drawW: Number(totalWCm.toFixed(3)), drawH: Number(totalHCm.toFixed(3)),
          inkLeft: Number(inkLeftCm.toFixed(3)), inkTop: Number(inkTopCm.toFixed(3)),
          inkRight: Number(inkRightCm.toFixed(3)), inkBottom: Number(inkBottomCm.toFixed(3)),
          inkW: Number((inkRightCm - inkLeftCm).toFixed(3)),
          inkH: Number((inkBottomCm - inkTopCm).toFixed(3)),
        });
      }
    } catch { /* debug only */ }

    if (rotationDeg) {
      const cxPt = cmToPt(pos.cx);
      const cyPt = cmToPt(pos.cy);
      const pageHPt = cmToPt(printArea.effectivePhysH ?? printArea.physicalHeightCm);
      applyLayerRotation(doc, rotationDeg, cxPt, cyPt, pageHPt);
    }

    doc.addImage(dataUrl, "PNG", cmToPt(drawXCm), cmToPt(drawYCm), cmToPt(totalWCm), cmToPt(totalHCm));

    if (rotationDeg) doc.restoreGraphicsState();
  } catch {
    doc.setFillColor(layer.color || "#ffffff");
    doc.rect(cmToPt(pos.x), cmToPt(pos.y), cmToPt(pos.w), cmToPt(pos.h), "F");
  }
}


export function collectFontNames(layers) {
  const fonts = new Set();
  for (const layer of layers) {
    if (layer.type === "text") {
      const font = getConstructorTextFont(layer.fontKey || "outfit");
      fonts.add(font.label);
    }
  }
  return [...fonts];
}

export function collectOriginalFiles(layers, uploadedFiles) {
  const originals = [];
  const allItems = [...layers, ...uploadedFiles];
  for (const item of allItems) {
    if (item.sourceType === "svg" && item.originalSvgText) {
      originals.push({
        name: item.uploadName || `${item.id}.svg`,
        type: "image/svg+xml",
        data: new Blob([item.originalSvgText], { type: "image/svg+xml" }),
      });
    } else if (item.sourceType === "pdf" && item.originalData) {
      originals.push({
        name: item.uploadName || `${item.id}.pdf`,
        type: "application/pdf",
        data: new Blob([item.originalData], { type: "application/pdf" }),
      });
    }
  }
  return originals;
}

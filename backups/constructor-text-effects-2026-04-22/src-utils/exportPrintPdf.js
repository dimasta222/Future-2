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

function getDirectionalOffsetCm(angleDeg, distancePx) {
  const radians = ((Number(angleDeg) || 0) * Math.PI) / 180;
  const radiusCm = (Number(distancePx) || 0) / LOGICAL_PRINT_PX_PER_CM;
  return { x: Math.cos(radians) * radiusCm, y: Math.sin(radians) * radiusCm };
}

function isLineShape(layer) {
  return getConstructorShape(layer?.shapeKey)?.category === "lines";
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

  // DEBUG: per-layer cm bbox + composition bbox
  const debugBoxes = [];
  for (const layer of sortedLayers) {
    if (!layer.visible) continue;
    try {
      const p = layerPositionToCm(layer, pa);
      debugBoxes.push({
        id: layer.id,
        type: layer.type,
        name: layer.name,
        posX: layer.position?.x,
        posY: layer.position?.y,
        widthCm: Number(p.w.toFixed(2)),
        heightCm: Number(p.h.toFixed(2)),
        leftCm: Number(p.x.toFixed(2)),
        topCm: Number(p.y.toFixed(2)),
        rightCm: Number((p.x + p.w).toFixed(2)),
        bottomCm: Number((p.y + p.h).toFixed(2)),
        rotationDeg: layer.rotationDeg ?? 0,
      });
    } catch (e) {
      console.warn("[exportPrintPdf][debug] failed bbox for layer", layer.id, e);
    }
  }
  if (debugBoxes.length) {
    const left = Math.min(...debugBoxes.map((b) => b.leftCm));
    const top = Math.min(...debugBoxes.map((b) => b.topCm));
    const right = Math.max(...debugBoxes.map((b) => b.rightCm));
    const bottom = Math.max(...debugBoxes.map((b) => b.bottomCm));
    console.table(debugBoxes);
    console.log("[exportPrintPdf][debug] composition bbox cm", {
      left: left.toFixed(2),
      top: top.toFixed(2),
      right: right.toFixed(2),
      bottom: bottom.toFixed(2),
      widthCm: (right - left).toFixed(2),
      heightCm: (bottom - top).toFixed(2),
      pageWcm: physW.toFixed(2),
      pageHcm: effectivePhysH.toFixed(2),
    });
  }

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
  return doc.output("arraybuffer");
}

async function renderUploadLayer(doc, layer, printArea) {
  const pos = layerPositionToCm(layer, printArea);
  const xPt = cmToPt(pos.x);
  const yPt = cmToPt(pos.y);
  const wPt = cmToPt(pos.w);
  const hPt = cmToPt(pos.h);
  const rotationDeg = layer.rotationDeg ?? 0;

  const applyRotation = () => {
    if (!rotationDeg) return;
    const cxPt = xPt + wPt / 2;
    const cyPt = yPt + hPt / 2;
    doc.saveGraphicsState();
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    doc.setCurrentTransformationMatrix(
      doc.Matrix(cos, sin, -sin, cos, cxPt - cxPt * cos + cyPt * sin, cyPt - cxPt * sin - cyPt * cos),
    );
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
  // sizeScale масштабирует все «px-единицы» (fontSize, letterSpacing, stroke, shadow,
  // effectDistance) относительно базового размера (XS), чтобы на больших футболках
  // эти элементы физически росли синхронно с фигурами (у которых widthCm уже скалируется в normalize).
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
  const strokeWidthPx = ((layer.strokeWidth ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowOffsetXPx = ((layer.shadowOffsetX ?? 0) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowOffsetYPx = ((layer.shadowOffsetY ?? 2) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;
  const shadowBlurPx = ((layer.shadowBlur ?? 14) / LOGICAL_PRINT_PX_PER_CM) * pxPerCm;

  const canvasFontStr = `${fontStyle} ${fontWeight} ${fontSizePx}px ${font.family}`;

  await document.fonts.load(canvasFontStr);

  const lines = wrapText(textValue, canvasFontStr, boxWidthPx, letterSpacingPx);
  const lineHeightPx = fontSizePx * lineHeight;
  const textBlockHeight = lines.length * lineHeightPx;

  const shadowPad = layer.shadowEnabled
    ? Math.ceil(shadowBlurPx + Math.max(Math.abs(shadowOffsetXPx), Math.abs(shadowOffsetYPx)))
    : 0;
  const strokePad = Math.ceil(strokeWidthPx);
  // Extra padding for glyph overshoot (italic slant, ascenders, descenders, script flourishes)
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

  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || "#111111";
    ctx.shadowOffsetX = shadowOffsetXPx;
    ctx.shadowOffsetY = shadowOffsetYPx;
    ctx.shadowBlur = shadowBlurPx;
  }

  const gradient = layer.textFillMode === "gradient" ? getConstructorTextGradient(layer.gradientKey) : null;

  for (let i = 0; i < lines.length; i++) {
    const lineY = pad + i * lineHeightPx;
    let lineX = pad;
    if (align === "center") lineX = pad + (boxWidthPx - measureLineWidth(ctx, lines[i], letterSpacingPx)) / 2;
    else if (align === "right") lineX = pad + boxWidthPx - measureLineWidth(ctx, lines[i], letterSpacingPx);

    if (strokeWidthPx > 0) {
      ctx.strokeStyle = layer.strokeColor || "#111111";
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
    ctx.fillText(lines[i], lineX, lineY);

    if (layer.underline || layer.strikethrough) {
      const lw = measureLineWidth(ctx, lines[i], letterSpacingPx);
      const decorThickness = fontSizePx * 0.06;
      ctx.save();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = gradient ? ctx.fillStyle : (layer.color || "#ffffff");
      if (layer.underline) {
        ctx.fillRect(lineX, lineY + fontSizePx * 1.12, lw, decorThickness);
      }
      if (layer.strikethrough) {
        ctx.fillRect(lineX, lineY + fontSizePx * 0.55, lw, decorThickness);
      }
      ctx.restore();
    }
  }

  const imgData = canvas.toDataURL("image/png");
  // Canvas был отрисован в baseline (XS). Финальные размеры в PDF = baseline × sizeScale.
  const imgWidthCm = (canvasW / pxPerCm) * sizeScale;
  const imgHeightCm = (canvasH / pxPerCm) * sizeScale;

  // Find real ink bbox of rendered canvas (incl. shadow/stroke/decoration)
  // and align so the ink center lands exactly on (cx, cy). This makes the
  // PDF and the Photoshop trim match what the UI summary shows in cm.
  let inkCenterXcm = imgWidthCm / 2;
  let inkCenterYcm = imgHeightCm / 2;
  try {
    const scanCtx = canvas.getContext("2d");
    const pixels = scanCtx.getImageData(0, 0, canvasW, canvasH).data;
    let minX = canvasW;
    let minY = canvasH;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvasH; y++) {
      const rowStart = y * canvasW * 4;
      for (let x = 0; x < canvasW; x++) {
        // Используем порог alpha=0 — точно как Photoshop Trim "Based On Transparent Pixels".
        if (pixels[rowStart + x * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= 0 && maxY >= 0) {
      inkCenterXcm = (((minX + maxX + 1) / 2) / pxPerCm) * sizeScale;
      inkCenterYcm = (((minY + maxY + 1) / 2) / pxPerCm) * sizeScale;
    }
  } catch {
    // CORS-tainted canvas, fall back to geometric center
  }
  const drawX = cx - inkCenterXcm;
  const drawY = cy - inkCenterYcm;

  const xPt = cmToPt(drawX);
  const yPt = cmToPt(drawY);
  const wPt = cmToPt(imgWidthCm);
  const hPt = cmToPt(imgHeightCm);

  if (rotationDeg) {
    const cxPt = cmToPt(cx);
    const cyPt = cmToPt(cy);
    doc.saveGraphicsState();
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    doc.setCurrentTransformationMatrix(
      doc.Matrix(cos, sin, -sin, cos, cxPt - cxPt * cos + cyPt * sin, cyPt - cxPt * sin - cyPt * cos),
    );
  }

  doc.addImage(imgData, "PNG", xPt, yPt, wPt, hPt);

  if (rotationDeg) {
    doc.restoreGraphicsState();
  }
}

function wrapText(text, fontStr, maxWidth, letterSpacingPx) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = fontStr;
  ctx.letterSpacing = `${letterSpacingPx}px`;
  const paragraphs = text.split("\n");
  const lines = [];
  for (const para of paragraphs) {
    if (!para.length) { lines.push(""); continue; }
    const words = para.split(/(\s+)/);
    let line = "";
    for (const word of words) {
      const test = line + word;
      if (measureLineWidth(ctx, test, letterSpacingPx) > maxWidth && line.length > 0) {
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

    if (rotationDeg) {
      const cxPt = cmToPt(pos.cx);
      const cyPt = cmToPt(pos.cy);
      doc.saveGraphicsState();
      const rad = (rotationDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      doc.setCurrentTransformationMatrix(
        doc.Matrix(cos, sin, -sin, cos, cxPt - cxPt * cos + cyPt * sin, cyPt - cxPt * sin - cyPt * cos),
      );
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

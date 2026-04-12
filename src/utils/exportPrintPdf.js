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
  const physH = printArea.physicalHeightCm;
  const lineWidthPx = Number(layer.lineWidthPx) || ((layer.widthCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  const lineHeightPx = Number(layer.lineHeightPx) || ((layer.heightCm || 1) * LOGICAL_PRINT_PX_PER_CM);
  const lineAspectRatio = Math.max(0.2, lineWidthPx / Math.max(1, lineHeightPx));
  const vm = getConstructorLineVisualMetrics(layer.shapeKey, layer.strokeWidth, lineAspectRatio);
  return {
    w: Math.min(physW, (lineWidthPx / LOGICAL_PRINT_PX_PER_CM) * (vm.visibleWidthPx / Math.max(1, vm.layoutWidthPx))),
    h: Math.min(physH, (lineHeightPx / LOGICAL_PRINT_PX_PER_CM) * (vm.visibleHeightPx / Math.max(1, vm.layoutHeightPx))),
    lineAspectRatio,
  };
}

function layerPositionToCm(layer, printArea) {
  const physW = printArea.physicalWidthCm;
  const physH = printArea.physicalHeightCm;
  const cx = (layer.position.x / 100) * physW;
  const cy = (layer.position.y / 100) * physH;
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

async function loadFontAsArrayBuffer(fontFamily) {
  try {
    const cleaned = fontFamily.replace(/'/g, "").split(",")[0].trim();
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleaned)}&display=swap`;
    const cssResp = await fetch(url);
    const css = await cssResp.text();
    const ttfMatch = css.match(/url\(([^)]+\.(?:ttf|woff2?))\)/);
    if (ttfMatch) {
      const fontResp = await fetch(ttfMatch[1]);
      return await fontResp.arrayBuffer();
    }
  } catch { /* fallback */ }
  return null;
}

function isTextBold(layer) {
  const font = getConstructorTextFont(layer.fontKey || "outfit");
  return (layer.weight ?? font.regularWeight ?? 500) >= 700;
}

async function renderRasterLayerToDataUrl(layer, targetWidthPx, targetHeightPx) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidthPx;
      canvas.height = targetHeightPx;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(layer.src);
    img.src = layer.src;
  });
}

export async function exportPrintPdf({ layers, printArea }) {
  const physW = printArea.physicalWidthCm;
  const physH = printArea.physicalHeightCm;
  const pageW = cmToPt(physW);
  const pageH = cmToPt(physH);

  const doc = new jsPDF({
    orientation: physW > physH ? "landscape" : "portrait",
    unit: "pt",
    format: [pageW, pageH],
    compress: true,
  });

  const fontCache = new Map();

  const sortedLayers = [...layers].sort((a, b) => {
    const ai = layers.indexOf(a);
    const bi = layers.indexOf(b);
    return ai - bi;
  });

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    if (layer.type === "upload") {
      await renderUploadLayer(doc, layer, printArea, fontCache);
    } else if (layer.type === "text") {
      await renderTextLayer(doc, layer, printArea, fontCache);
    } else if (layer.type === "shape") {
      await renderShapeLayer(doc, layer, printArea);
    }
  }

  return doc.output("arraybuffer");
}

async function renderUploadLayer(doc, layer, printArea, _fontCache) {
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
        y: cmToPt(printArea.physicalHeightCm) - yPt - hPt,
        width: scaledDims.width,
        height: scaledDims.height,
      });
      await destPdf.save();
      return;
    } catch { /* fallback to raster */ }
  }

  const wPx = Math.round(pos.w * DPI_300_SCALE * (72 / 2.54));
  const hPx = Math.round(pos.h * DPI_300_SCALE * (72 / 2.54));
  const dataUrl = await renderRasterLayerToDataUrl(layer, Math.min(wPx, layer.width), Math.min(hPx, layer.height));
  applyRotation();
  doc.addImage(dataUrl, "PNG", xPt, yPt, wPt, hPt);
  restoreRotation();
}

async function renderTextLayer(doc, layer, printArea, fontCache) {
  const physW = printArea.physicalWidthCm;
  const physH = printArea.physicalHeightCm;
  const cx = (layer.position.x / 100) * physW;
  const cy = (layer.position.y / 100) * physH;
  const boxWidthCm = ((layer.textBoxWidth ?? 60) / 100) * physW;
  const fontSizeCm = (layer.size ?? 36) / LOGICAL_PRINT_PX_PER_CM;
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;
  const rotationDeg = layer.rotationDeg ?? 0;

  const hasStroke = (layer.strokeWidth ?? 0) > 0;
  const hasShadow = layer.shadowEnabled === true;
  const hasGradient = layer.textFillMode === "gradient";
  const hasDecoration = layer.underline || layer.strikethrough;
  const needsCanvasRender = hasStroke || hasShadow || hasGradient || hasDecoration;

  const font = getConstructorTextFont(layer.fontKey || "outfit");
  const fontWeight = isTextBold(layer) ? (font.boldWeight ?? 700) : (layer.weight ?? font.regularWeight ?? 400);
  const fontStyle = (font.supportsItalic && layer.italic) ? "italic" : "normal";
  const textValue = layer.uppercase ? (layer.value || "").toUpperCase() : (layer.value || "");
  if (!textValue.trim()) return;

  if (needsCanvasRender) {
    await renderTextViaCanvas(doc, layer, textValue, {
      cx, cy, boxWidthCm, fontSizeCm, lineHeight, letterSpacingCm, rotationDeg,
      font, fontWeight, fontStyle, physW, physH,
    });
    return;
  }

  const fontId = font.key;
  if (!fontCache.has(fontId)) {
    const buf = await loadFontAsArrayBuffer(font.family);
    if (buf) {
      doc.addFileToVFS(`${fontId}.ttf`, arrayBufferToBase64(buf));
      doc.addFont(`${fontId}.ttf`, fontId, "normal");
      fontCache.set(fontId, fontId);
    } else {
      fontCache.set(fontId, "helvetica");
    }
  }

  const registeredFont = fontCache.get(fontId) || "helvetica";
  const fontSizePt = cmToPt(fontSizeCm);
  doc.setFont(registeredFont, fontWeight >= 700 ? "bold" : "normal");
  doc.setFontSize(fontSizePt);
  doc.setTextColor(layer.color || "#ffffff");

  const xPt = cmToPt(cx);
  const yPt = cmToPt(cy);
  const align = layer.textAlign || "center";
  const maxWidthPt = cmToPt(boxWidthCm);

  if (rotationDeg) {
    doc.saveGraphicsState();
    doc.setCurrentTransformationMatrix(
      doc.Matrix(
        Math.cos((rotationDeg * Math.PI) / 180),
        Math.sin((rotationDeg * Math.PI) / 180),
        -Math.sin((rotationDeg * Math.PI) / 180),
        Math.cos((rotationDeg * Math.PI) / 180),
        xPt - xPt * Math.cos((rotationDeg * Math.PI) / 180) + yPt * Math.sin((rotationDeg * Math.PI) / 180),
        yPt - xPt * Math.sin((rotationDeg * Math.PI) / 180) - yPt * Math.cos((rotationDeg * Math.PI) / 180),
      ),
    );
  }

  doc.text(textValue, xPt, yPt, { align, maxWidth: maxWidthPt });

  if (rotationDeg) {
    doc.restoreGraphicsState();
  }
}

const TEXT_CANVAS_PX_PER_CM = 120;

async function renderTextViaCanvas(doc, layer, textValue, opts) {
  const { cx, cy, boxWidthCm, fontSizeCm, lineHeight, letterSpacingCm, rotationDeg, font, fontWeight, fontStyle } = opts;
  const pxPerCm = TEXT_CANVAS_PX_PER_CM;
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
  const pad = Math.max(shadowPad, strokePad) + 4;

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
  const imgWidthCm = canvasW / pxPerCm;
  const imgHeightCm = canvasH / pxPerCm;
  const padCm = pad / pxPerCm;
  const drawX = cx - imgWidthCm / 2 + padCm;
  const topYCm = cy - textBlockHeight / pxPerCm / 2;
  const drawY = topYCm - padCm;

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
  const effectOffset = getDirectionalOffsetCm(layer.effectAngle ?? -45, layer.effectDistance ?? 0);

  const padXCm = effectType !== "none" ? Math.abs(effectOffset.x) : 0;
  const padYCm = effectType !== "none" ? Math.abs(effectOffset.y) : 0;
  const totalWCm = pos.w + padXCm * 2;
  const totalHCm = pos.h + padYCm * 2;

  const shapeWPx = Math.max(1, Math.ceil(pos.w * SHAPE_PX_PER_CM));
  const shapeHPx = Math.max(1, Math.ceil(pos.h * SHAPE_PX_PER_CM));
  const totalWPx = Math.max(1, Math.ceil(totalWCm * SHAPE_PX_PER_CM));
  const totalHPx = Math.max(1, Math.ceil(totalHCm * SHAPE_PX_PER_CM));
  const padXPx = Math.round(padXCm * SHAPE_PX_PER_CM);
  const padYPx = Math.round(padYCm * SHAPE_PX_PER_CM);

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
        ctx.globalAlpha = 0.78;
        ctx.drawImage(img, padXPx + Math.round(effectOffset.x * SHAPE_PX_PER_CM), padYPx + Math.round(effectOffset.y * SHAPE_PX_PER_CM), shapeWPx, shapeHPx);
        ctx.globalAlpha = 1;
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
      if (imgA) ctx.drawImage(imgA, padXPx + Math.round(effectOffset.x * SHAPE_PX_PER_CM), padYPx + Math.round(effectOffset.y * SHAPE_PX_PER_CM), shapeWPx, shapeHPx);
      if (imgB) ctx.drawImage(imgB, padXPx - Math.round(effectOffset.x * SHAPE_PX_PER_CM), padYPx - Math.round(effectOffset.y * SHAPE_PX_PER_CM), shapeWPx, shapeHPx);
    }

    const mainSvg = buildShapeSvgForLayer(layer);
    const mainImg = await svgToImg(mainSvg, shapeWPx, shapeHPx);
    if (mainImg) ctx.drawImage(mainImg, padXPx, padYPx, shapeWPx, shapeHPx);

    const dataUrl = canvas.toDataURL("image/png");
    const drawXCm = pos.cx - totalWCm / 2;
    const drawYCm = pos.cy - totalHCm / 2;

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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

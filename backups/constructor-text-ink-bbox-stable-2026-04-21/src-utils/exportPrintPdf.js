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

/**
 * TTF font map: fontFamily (cleaned) + weight → TTF path under /fonts/.
 * Built to match files downloaded by scripts/download-constructor-fonts.mjs.
 */
const GOOGLE_FONT_TTF_MAP = {
  "Outfit-500": "/fonts/Google/Outfit-500.ttf",
  "Outfit-800": "/fonts/Google/Outfit-800.ttf",
  "Inter-500": "/fonts/Google/Inter-500.ttf",
  "Inter-800": "/fonts/Google/Inter-800.ttf",
  "Bebas Neue-400": "/fonts/Google/BebasNeue-400.ttf",
  "Unbounded-500": "/fonts/Google/Unbounded-500.ttf",
  "Unbounded-700": "/fonts/Google/Unbounded-700.ttf",
  "Marck Script-400": "/fonts/Google/MarckScript-400.ttf",
  "IBM Plex Mono-500": "/fonts/Google/IBMPlexMono-500.ttf",
  "IBM Plex Mono-700": "/fonts/Google/IBMPlexMono-700.ttf",
  "Great Vibes-400": "/fonts/Google/GreatVibes-400.ttf",
  "Alumni Sans-400": "/fonts/Google/AlumniSans-400.ttf",
  "Fira Sans Condensed-400": "/fonts/Google/FiraSansCondensed-400.ttf",
  "Caveat-400": "/fonts/Google/Caveat-400.ttf",
  "Comfortaa-400": "/fonts/Google/Comfortaa-400.ttf",
  "Lobster-400": "/fonts/Google/Lobster-400.ttf",
  "Pacifico-400": "/fonts/Google/Pacifico-400.ttf",
  "Roboto Slab-400": "/fonts/Google/RobotoSlab-400.ttf",
  "Oswald-400": "/fonts/Google/Oswald-400.ttf",
  "Rubik Mono One-400": "/fonts/Google/RubikMonoOne-400.ttf",
  "Press Start 2P-400": "/fonts/Google/PressStart2P-400.ttf",
  "Advent Pro-400": "/fonts/Google/AdventPro-400.ttf",
  "Yanone Kaffeesatz-400": "/fonts/Google/YanoneKaffeesatz-400.ttf",
  "Amatic SC-400": "/fonts/Google/AmaticSC-400.ttf",
  "Old Standard TT-400": "/fonts/Google/OldStandardTT-400.ttf",
  "Dela Gothic One-400": "/fonts/Google/DelaGothicOne-400.ttf",
  "Bad Script-400": "/fonts/Google/BadScript-400.ttf",
  "Pangolin-400": "/fonts/Google/Pangolin-400.ttf",
  "Neucha-400": "/fonts/Google/Neucha-400.ttf",
  "Pattaya-400": "/fonts/Google/Pattaya-400.ttf",
  "Rampart One-400": "/fonts/Google/RampartOne-400.ttf",
  "Rubik Wet Paint-400": "/fonts/Google/RubikWetPaint-400.ttf",
  "Reggae One-400": "/fonts/Google/ReggaeOne-400.ttf",
  "Kelly Slab-400": "/fonts/Google/KellySlab-400.ttf",
  "Ruslan Display-400": "/fonts/Google/RuslanDisplay-400.ttf",
  "Rubik Dirt-400": "/fonts/Google/RubikDirt-400.ttf",
  "Rubik Glitch-400": "/fonts/Google/RubikGlitch-400.ttf",
  "Train One-400": "/fonts/Google/TrainOne-400.ttf",
  "Rubik Doodle Shadow-400": "/fonts/Google/RubikDoodleShadow-400.ttf",
  "Kablammo-400": "/fonts/Google/Kablammo-400.ttf",
  "Stick-400": "/fonts/Google/Stick-400.ttf",
  "Rubik Bubbles-400": "/fonts/Google/RubikBubbles-400.ttf",
  "Comforter-400": "/fonts/Google/Comforter-400.ttf",
  "Climate Crisis-400": "/fonts/Google/ClimateCrisis-400.ttf",
  "Tiny5-400": "/fonts/Google/Tiny5-400.ttf",
  "Comforter Brush-400": "/fonts/Google/ComforterBrush-400.ttf",
  "Stalinist One-400": "/fonts/Google/StalinistOne-400.ttf",
  "Oi-400": "/fonts/Google/Oi-400.ttf",
  "Rubik Marker Hatch-400": "/fonts/Google/RubikMarkerHatch-400.ttf",
  // Local TTF fonts
  "Arial Black-400": "/fonts/Общие/Arial Black.ttf",
  "Arial Bold-400": "/fonts/Общие/Arial Bold.ttf",
  "Arial Regular-400": "/fonts/Общие/Arial Regular.ttf",
  "Moniqa Black-400": "/fonts/Русские /Moniqa Black.ttf",
};

function getTtfPath(fontLabel, weight) {
  return GOOGLE_FONT_TTF_MAP[`${fontLabel}-${weight}`] || null;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function loadAndRegisterFont(doc, fontCache, fontLabel, weight) {
  const cacheKey = `${fontLabel}-${weight}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey);

  const ttfPath = getTtfPath(fontLabel, weight);
  if (!ttfPath) {
    fontCache.set(cacheKey, null);
    return null;
  }

  try {
    const resp = await fetch(ttfPath);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const fontId = cacheKey.replace(/\s+/g, "_");
    doc.addFileToVFS(`${fontId}.ttf`, arrayBufferToBase64(buf));
    doc.addFont(`${fontId}.ttf`, fontId, "normal");
    fontCache.set(cacheKey, fontId);
    return fontId;
  } catch (err) {
    console.warn(`[exportPrintPdf] TTF load failed for ${cacheKey}:`, err.message);
    fontCache.set(cacheKey, null);
    return null;
  }
}

function detectImageFormat(src) {
  if (typeof src === "string") {
    if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")) return "JPEG";
    if (src.startsWith("data:image/webp")) return "WEBP";
  }
  return "PNG";
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

  const fontCache = new Map();

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
        await renderUploadLayer(doc, layer, pa, fontCache);
      } else if (layer.type === "text") {
        await renderTextLayer(doc, layer, pa, fontCache);
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

async function renderTextLayer(doc, layer, printArea, fontCache) {
  const physW = printArea.physicalWidthCm;
  const effH = printArea.effectivePhysH ?? printArea.physicalHeightCm;
  const cx = (layer.position.x / 100) * physW;
  const cy = (layer.position.y / 100) * effH;
  const boxWidthCm = ((layer.textBoxWidth ?? 60) / 100) * physW;
  const fontSizeCm = (layer.size ?? 36) / LOGICAL_PRINT_PX_PER_CM;
  const lineHeight = layer.lineHeight ?? 1.05;
  const letterSpacingCm = (layer.letterSpacing ?? 1) / LOGICAL_PRINT_PX_PER_CM;
  const rotationDeg = layer.rotationDeg ?? 0;

  const font = getConstructorTextFont(layer.fontKey || "outfit");
  const fontWeight = isTextBold(layer) ? (font.boldWeight ?? 700) : (layer.weight ?? font.regularWeight ?? 400);
  const fontStyle = (font.supportsItalic && layer.italic) ? "italic" : "normal";
  const textValue = layer.uppercase ? (layer.value || "").toUpperCase() : (layer.value || "");
  if (!textValue.trim()) return;

  const hasStroke = (layer.strokeWidth ?? 0) > 0;
  const hasShadow = layer.shadowEnabled === true;
  const hasGradient = layer.textFillMode === "gradient";
  const hasDecoration = layer.underline || layer.strikethrough;

  // Always use canvas rendering — jsPDF TTF vector text silently fails for
  // Cyrillic and many other non-Latin glyphs (renders invisible/empty without
  // throwing an error), so the try-catch fallback never triggers.
  // Canvas rendering handles all scripts reliably at 120 px/cm (~305 DPI).

  // Canvas fallback for effects, unavailable TTF, or failed vector rendering
  await renderTextViaCanvas(doc, layer, textValue, {
    cx, cy, boxWidthCm, fontSizeCm, lineHeight, letterSpacingCm, rotationDeg,
    font, fontWeight, fontStyle, physW, effH,
  });
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

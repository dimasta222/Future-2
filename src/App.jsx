import { Fragment, lazy, Suspense, useState, useEffect, useRef } from "react";
import ContactSection from "./components/ContactSection.jsx";
import HeroSection from "./components/HeroSection.jsx";
import HomeTshirtsSection from "./components/HomeTshirtsSection.jsx";
import LogoMini from "./components/LogoMini.jsx";
import MainTshirtCard from "./components/MainTshirtCard.jsx";
import MainNavigation from "./components/MainNavigation.jsx";
import PricingSection from "./components/PricingSection.jsx";
import ProductCard from "./components/ProductCard.jsx";
import ReviewsSection from "./components/ReviewsSection.jsx";
import useYandexReviews from "./hooks/useYandexReviews.js";
import MessengerPicker from "./components/MessengerPicker.jsx";
import TG from "./components/TG.jsx";
import TextileOrderModal from "./components/TextileOrderModal.jsx";
import TextileProductDetail from "./components/TextileProductDetail.jsx";
import TshirtSizeGuideTrigger from "./components/TshirtSizeGuideTrigger.jsx";
import CalcOrderModal from "./components/CalcOrderModal.jsx";
import STYLES from "./shared/appStyles.js";
import { parsePriceValue } from "./shared/textileHelpers.js";
import { saveCalcState, loadCalcState, clearCalcState, saveCalcFile, loadCalcFile, deleteCalcFile, clearCalcFiles } from "./utils/persistStorage.js";
import { PRINT_FORMATS } from "./data/printFormats.js";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

const PortfolioPage = lazy(() => import("./portfolio/PortfolioCatalogPage.jsx"));
const ConstructorRoute = lazy(() => import("./components/constructor/ConstructorRoute.jsx"));
const TshirtGalleryModal = lazy(() => import("./components/TshirtGalleryModal.jsx"));
const TshirtSizeGuideModal = lazy(() => import("./components/TshirtSizeGuideModal.jsx"));

/* ══════════════════════════════════════════
   CONSTANTS & PRICING
   ══════════════════════════════════════════ */
const BED_W = 58;
const GAP = 0.5;
const MAX_CALC_ITEMS = 40;
const ORIENTATION_EXHAUSTIVE_LIMIT = 12;
const LAYOUT_PREVIEW_HEIGHT = 160;
const LAYOUT_SCROLL_MAX_HEIGHT = "min(72vh, 820px)";
const CALC_PRINT_DPI = 300;
const CALC_DPI_WARN = 150;
const THUMB_MAX = 256;
const TIFF_THUMB_LIMIT = 20 * 1024 * 1024; // 20 MB — выше не декодируем пиксели
const DEFAULT_DPI = 72;

function extractDpiFromBytes(buffer, ext) {
  try {
    const view = new DataView(buffer);
    const u8 = new Uint8Array(buffer);

    if (ext === "jpg" || ext === "jpeg" || ext === "jfif") {
      if (u8[0] !== 0xFF || u8[1] !== 0xD8) return null;
      let offset = 2;
      while (offset < u8.length - 10) {
        if (u8[offset] !== 0xFF) break;
        const marker = u8[offset + 1];
        if (marker === 0xD9 || marker === 0xDA) break;
        const segLen = view.getUint16(offset + 2);
        if (marker === 0xE0 && segLen >= 14 && u8[offset + 4] === 0x4A && u8[offset + 5] === 0x46 && u8[offset + 6] === 0x49 && u8[offset + 7] === 0x46) {
          const units = u8[offset + 11];
          const xDen = view.getUint16(offset + 12);
          const yDen = view.getUint16(offset + 14);
          const dpi = Math.max(xDen, yDen);
          if (units === 1 && dpi > 0) return dpi;
          if (units === 2 && dpi > 0) return Math.round(dpi * 2.54);
        }
        if (marker === 0xE1 && segLen >= 14 && u8[offset + 4] === 0x45 && u8[offset + 5] === 0x78 && u8[offset + 6] === 0x69 && u8[offset + 7] === 0x66) {
          const tiffStart = offset + 10;
          if (tiffStart + 8 > u8.length) { offset += 2 + segLen; continue; }
          const le = u8[tiffStart] === 0x49;
          const r16 = (o) => view.getUint16(tiffStart + o, le);
          const r32 = (o) => view.getUint32(tiffStart + o, le);
          const ifdOffset = r32(4);
          if (tiffStart + ifdOffset + 2 > u8.length) { offset += 2 + segLen; continue; }
          const ifdCount = r16(ifdOffset);
          let xRes = 0, yRes = 0, resUnit = 2;
          for (let i = 0; i < ifdCount; i++) {
            const eo = ifdOffset + 2 + i * 12;
            if (tiffStart + eo + 12 > u8.length) break;
            const tag = r16(eo);
            if (tag === 0x011A || tag === 0x011B) {
              const valOff = r32(eo + 8);
              if (tiffStart + valOff + 8 <= u8.length) {
                const n = r32(valOff), d = r32(valOff + 4) || 1;
                if (tag === 0x011A) xRes = n / d; else yRes = n / d;
              }
            }
            if (tag === 0x0128) resUnit = r16(eo + 8);
          }
          const maxRes = Math.max(xRes, yRes);
          if (maxRes > 0) {
            if (resUnit === 3) return Math.round(maxRes * 2.54);
            return Math.round(maxRes);
          }
        }
        offset += 2 + segLen;
      }
      return null;
    }

    if (ext === "png") {
      if (u8[0] !== 0x89 || u8[1] !== 0x50) return null;
      let offset = 8;
      while (offset + 12 < u8.length) {
        const chunkLen = view.getUint32(offset);
        const type = String.fromCharCode(u8[offset + 4], u8[offset + 5], u8[offset + 6], u8[offset + 7]);
        if (type === "pHYs" && chunkLen === 9 && offset + 17 <= u8.length) {
          const ppuX = view.getUint32(offset + 8);
          const ppuY = view.getUint32(offset + 12);
          const unit = u8[offset + 16];
          if (unit === 1) {
            const dpi = Math.round(Math.max(ppuX, ppuY) / 39.3701);
            return dpi > 0 ? dpi : null;
          }
          return null;
        }
        if (type === "IDAT" || type === "IEND") break;
        offset += 12 + chunkLen;
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

async function processCalcFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const isPdf = file.type === "application/pdf" || ext === "pdf";
  const isSvg = file.type === "image/svg+xml" || ext === "svg";
  const isTiff = file.type === "image/tiff" || ext === "tiff" || ext === "tif";

  if (isTiff) {
    try {
      const buf = await file.arrayBuffer();
      const UTIF = await import("utif2");
      const ifds = UTIF.decode(buf);
      if (!ifds.length) return null;
      const ifd = ifds[0];
      const w = ifd.width, h = ifd.height;
      let fileDpi = DEFAULT_DPI;
      try {
        const xr = ifd.t282, yr = ifd.t283, ru = ifd.t296;
        const xd = Array.isArray(xr) ? xr[0] / (xr[1] || 1) : (xr || 0);
        const yd = Array.isArray(yr) ? yr[0] / (yr[1] || 1) : (yr || 0);
        const maxR = Math.max(xd, yd);
        const unit = Array.isArray(ru) ? ru[0] : (ru || 2);
        if (maxR > 0) fileDpi = unit === 3 ? Math.round(maxR * 2.54) : Math.round(maxR);
      } catch { /* fallback to DEFAULT_DPI */ }
      const wCm = +(w / fileDpi * 2.54).toFixed(1);
      const hCm = +(h / fileDpi * 2.54).toFixed(1);
      const dpiWarning = fileDpi < CALC_PRINT_DPI;
      let thumb = null;
      if (file.size <= TIFF_THUMB_LIMIT) {
        UTIF.decodeImage(buf, ifd);
        const rgba = UTIF.toRGBA8(ifd);
        const ratio = Math.min(THUMB_MAX / w, THUMB_MAX / h, 1);
        const tw = Math.round(w * ratio), th = Math.round(h * ratio);
        const tmp = document.createElement("canvas");
        tmp.width = w; tmp.height = h;
        const tmpCtx = tmp.getContext("2d");
        const imgData = tmpCtx.createImageData(w, h);
        imgData.data.set(new Uint8Array(rgba));
        tmpCtx.putImageData(imgData, 0, 0);
        const tc = document.createElement("canvas");
        tc.width = tw; tc.height = th;
        tc.getContext("2d").drawImage(tmp, 0, 0, tw, th);
        thumb = tc.toDataURL("image/jpeg", 0.8);
      }
      return { w: wCm, h: hCm, thumb, fileName: file.name, dpiWarning };
    } catch { return null; }
  }

  if (isPdf) {
    try {
      const buf = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await doc.getPage(1);
      const rawVp = page.getViewport({ scale: 1 });

      // Render at moderate scale to detect actual content bbox (PDF page may be
      // larger than artwork — MediaBox/CropBox include whitespace around content).
      const detectScale = Math.min(900 / Math.max(rawVp.width, rawVp.height), 4);
      const dVp = page.getViewport({ scale: detectScale });
      const dCanvas = document.createElement("canvas");
      dCanvas.width = Math.ceil(dVp.width);
      dCanvas.height = Math.ceil(dVp.height);
      const dCtx = dCanvas.getContext("2d", { willReadFrequently: true });
      // Transparent background so non-content pixels stay alpha=0.
      await page.render({ canvas: dCanvas, canvasContext: dCtx, viewport: dVp, background: "rgba(0,0,0,0)" }).promise;

      let contentWcm, contentHcm;
      let bboxPx = null;
      try {
        const { data, width: cw, height: ch } = dCtx.getImageData(0, 0, dCanvas.width, dCanvas.height);
        let minX = cw, minY = ch, maxX = -1, maxY = -1;
        const alphaThreshold = 8;
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            if (data[(y * cw + x) * 4 + 3] > alphaThreshold) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX >= minX && maxY >= minY) {
          const bboxW = maxX - minX + 1;
          const bboxH = maxY - minY + 1;
          bboxPx = { minX, minY, bboxW, bboxH };
          // Convert pixels at detectScale → points → cm.
          const wPt = bboxW / detectScale;
          const hPt = bboxH / detectScale;
          contentWcm = +(wPt / 72 * 2.54).toFixed(1);
          contentHcm = +(hPt / 72 * 2.54).toFixed(1);
        }
      } catch (bboxErr) {
        console.warn("[CalcPage] PDF bbox detection failed, using page size:", bboxErr);
      }

      const wCm = contentWcm ?? +(rawVp.width / 72 * 2.54).toFixed(1);
      const hCm = contentHcm ?? +(rawVp.height / 72 * 2.54).toFixed(1);

      let thumb;
      if (bboxPx) {
        // Crop the detect canvas to content bbox, downscale to thumbnail size.
        const ratio = Math.min(THUMB_MAX / bboxPx.bboxW, THUMB_MAX / bboxPx.bboxH, 1);
        const tw = Math.max(1, Math.round(bboxPx.bboxW * ratio));
        const th = Math.max(1, Math.round(bboxPx.bboxH * ratio));
        const tc = document.createElement("canvas");
        tc.width = tw; tc.height = th;
        const tCtx = tc.getContext("2d");
        // White background under transparent PDF render so JPEG looks clean.
        tCtx.fillStyle = "#ffffff";
        tCtx.fillRect(0, 0, tw, th);
        tCtx.drawImage(dCanvas, bboxPx.minX, bboxPx.minY, bboxPx.bboxW, bboxPx.bboxH, 0, 0, tw, th);
        thumb = tc.toDataURL("image/jpeg", 0.85);
      } else {
        const thumbScale = Math.min(THUMB_MAX / rawVp.width, THUMB_MAX / rawVp.height, 2);
        const vp = page.getViewport({ scale: thumbScale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        thumb = canvas.toDataURL("image/jpeg", 0.8);
      }
      return { w: wCm, h: hCm, thumb, fileName: file.name, dpiWarning: false };
    } catch (err) {
      console.error("[CalcPage] PDF processing failed:", err);
      return null;
    }
  }

  if (isSvg) {
    const text = await file.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(text, "image/svg+xml");
    const svg = svgDoc.querySelector("svg");
    if (!svg) return null;
    let wPx = 0, hPx = 0;
    const vb = svg.getAttribute("viewBox");
    if (vb) { const parts = vb.split(/[\s,]+/).map(Number); wPx = parts[2]; hPx = parts[3]; }
    if (!wPx) wPx = parseFloat(svg.getAttribute("width")) || 300;
    if (!hPx) hPx = parseFloat(svg.getAttribute("height")) || 300;
    const wCm = +(wPx / CALC_PRINT_DPI * 2.54).toFixed(1);
    const hCm = +(hPx / CALC_PRINT_DPI * 2.54).toFixed(1);
    const thumb = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
    return { w: wCm, h: hCm, thumb, fileName: file.name, dpiWarning: false };
  }

  const rasterBuf = await file.arrayBuffer();
  const fileDpi = extractDpiFromBytes(rasterBuf, ext) || DEFAULT_DPI;
  const dpiWarning = fileDpi < CALC_PRINT_DPI;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([rasterBuf], { type: file.type }));
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth, origH = img.naturalHeight;
      const wCm = +(origW / fileDpi * 2.54).toFixed(1);
      const hCm = +(origH / fileDpi * 2.54).toFixed(1);
      const maxDim = Math.max(origW, origH);
      const ratio = Math.min(THUMB_MAX / maxDim, 1);
      const tc = document.createElement("canvas");
      tc.width = Math.round(origW * ratio); tc.height = Math.round(origH * ratio);
      tc.getContext("2d").drawImage(img, 0, 0, tc.width, tc.height);
      const thumb = tc.toDataURL("image/jpeg", 0.8);
      URL.revokeObjectURL(url);
      resolve({ w: wCm, h: hCm, thumb, fileName: file.name, dpiWarning });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

const PRINT_TIERS = [
  { min: 1, max: 2, price: 1400 },
  { min: 3, max: 5, price: 1200 },
  { min: 6, max: 20, price: 1100 },
  { min: 21, max: 50, price: 1000 },
  { min: 51, max: Infinity, price: 900 },
];
const APPLY_TIERS = [
  { min: 1, max: 29, price: 100 },
  { min: 30, max: 59, price: 80 },
  { min: 60, max: 199, price: 70 },
  { min: 200, max: 499, price: 60 },
  { min: 500, max: Infinity, price: 50 },
];

function getPrintCost(meters) {
  const m = Math.ceil(meters);
  if (m <= 0) return { rate: 0, cost: 0 };
  const tier = PRINT_TIERS.find(t => m >= t.min && m <= t.max) || PRINT_TIERS[PRINT_TIERS.length - 1];
  return { rate: tier.price, cost: Math.ceil(meters * tier.price) };
}

function getApplyCost(qty) {
  if (qty <= 0) return { rate: 0, cost: 0 };
  const tier = APPLY_TIERS.find(t => qty >= t.min && qty <= t.max) || APPLY_TIERS[APPLY_TIERS.length - 1];
  return { rate: tier.price, cost: qty * tier.price };
}

const FORMAT_PRICES = PRINT_FORMATS;

function getFormat(w, h) {
  const small = Math.min(w, h);
  const big = Math.max(w, h);
  const MARGIN = 1;
  for (const f of FORMAT_PRICES) {
    if (small <= f.short + MARGIN && big <= f.long + MARGIN) return f;
  }
  return null;
}

function skylinePack(rects) {
  if (rects.length === 0) return { length: 0, placements: [] };

  const sorted = [...rects].sort((a, b) => {
    const areaDiff = b.w * b.h - a.w * a.h;
    if (areaDiff !== 0) return areaDiff;
    return Math.max(b.w, b.h) - Math.max(a.w, a.h);
  });

  let skyline = [{ x: 0, y: 0, w: BED_W }];
  const placements = [];

  for (const rect of sorted) {
    if (rect.w > BED_W + 0.001) continue;

    let bestPos = null;

    for (let i = 0; i < skyline.length; i++) {
      const startX = skyline[i].x;
      const rectRight = startX + rect.w;
      if (rectRight > BED_W + 0.001) continue;

      let maxY = 0;
      for (let j = i; j < skyline.length; j++) {
        const seg = skyline[j];
        if (seg.x >= rectRight - 0.001) break;
        if (seg.x + seg.w <= startX + 0.001) continue;
        maxY = Math.max(maxY, seg.y);
      }

      const topEdge = maxY + rect.h;
      if (
        bestPos === null ||
        topEdge < bestPos.topEdge - 0.001 ||
        (Math.abs(topEdge - bestPos.topEdge) < 0.001 && maxY < bestPos.y - 0.001) ||
        (Math.abs(topEdge - bestPos.topEdge) < 0.001 && Math.abs(maxY - bestPos.y) < 0.001 && startX < bestPos.x)
      ) {
        bestPos = { x: startX, y: maxY, topEdge };
      }
    }

    if (!bestPos) continue;

    placements.push({ x: bestPos.x, y: bestPos.y, w: rect.w, h: rect.h, idx: rect.idx, color: rect.color });

    const nY = bestPos.y + rect.h + GAP;
    const nX = bestPos.x;
    const nR = bestPos.x + rect.w + GAP;

    const nextSkyline = [];
    for (const seg of skyline) {
      const segRight = seg.x + seg.w;
      if (segRight <= nX + 0.001) { nextSkyline.push(seg); continue; }
      if (seg.x >= nR - 0.001) { nextSkyline.push(seg); continue; }
      if (seg.x < nX - 0.001) nextSkyline.push({ x: seg.x, y: seg.y, w: nX - seg.x });
      if (segRight > nR + 0.001) nextSkyline.push({ x: nR, y: seg.y, w: segRight - nR });
    }
    nextSkyline.push({ x: nX, y: nY, w: Math.min(nR, BED_W) - nX });
    nextSkyline.sort((a, b) => a.x - b.x);

    const merged = [nextSkyline[0]];
    for (let i = 1; i < nextSkyline.length; i++) {
      const prev = merged[merged.length - 1];
      const current = nextSkyline[i];
      if (Math.abs(prev.x + prev.w - current.x) < 0.01 && Math.abs(prev.y - current.y) < 0.01) prev.w += current.w;
      else merged.push(current);
    }
    skyline = merged;
  }

  let totalLength = 0;
  for (const placement of placements) totalLength = Math.max(totalLength, placement.y + placement.h);
  return { length: totalLength, placements };
}

function getOrientationMeta(items) {
  return items.map((it) => {
    const fits0 = it.w <= BED_W;
    const fits1 = it.h <= BED_W;
    return {
      fits0,
      fits1,
      isSquare: Math.abs(it.w - it.h) < 0.001,
      flexible: fits0 && fits1 && Math.abs(it.w - it.h) >= 0.001,
    };
  });
}

function normalizeOrientationChoice(choice, meta) {
  if (!meta.fits0 && meta.fits1) return 1;
  if (!meta.fits1) return 0;
  if (meta.isSquare) return 0;
  return choice ? 1 : 0;
}

function buildOrientationSeed(items, meta, pickChoice) {
  return items.map((it, index) => normalizeOrientationChoice(pickChoice(it, meta[index], index), meta[index]));
}

function buildRectsForOrientations(items, orientations) {
  const rects = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const rotated = orientations[i];
    const pw = rotated ? it.h : it.w;
    const ph = rotated ? it.w : it.h;

    for (let j = 0; j < it.qty; j++) {
      rects.push({ w: pw, h: ph, idx: i, color: it.color });
    }
  }

  return rects;
}

function estimateTypeLength(w, h, qty) {
  const perRow = Math.max(1, Math.floor((BED_W + GAP) / (w + GAP)));
  const rows = Math.ceil(qty / perRow);
  return rows * (h + GAP);
}

function optimizeOrientationSeed(items, meta, seed) {
  const flexibleIndexes = meta
    .map((entry, index) => (entry.flexible ? index : -1))
    .filter((index) => index >= 0);

  const orientations = seed.map((choice, index) => normalizeOrientationChoice(choice, meta[index]));
  let bestResult = skylinePack(buildRectsForOrientations(items, orientations));
  let improved = true;

  while (improved) {
    improved = false;
    let bestFlip = null;

    for (const index of flexibleIndexes) {
      orientations[index] = orientations[index] ? 0 : 1;
      const candidate = skylinePack(buildRectsForOrientations(items, orientations));
      orientations[index] = orientations[index] ? 0 : 1;

      if (!bestFlip || candidate.length < bestFlip.result.length - 0.001) {
        bestFlip = { index, result: candidate };
      }
    }

    if (bestFlip && bestFlip.result.length < bestResult.length - 0.001) {
      orientations[bestFlip.index] = orientations[bestFlip.index] ? 0 : 1;
      bestResult = bestFlip.result;
      improved = true;
    }
  }

  return bestResult;
}

function packOnBed(items) {
  if (items.length === 0) return { length: 0, placements: [] };

  const meta = getOrientationMeta(items);
  const flexibleIndexes = meta
    .map((entry, index) => (entry.flexible ? index : -1))
    .filter((index) => index >= 0);

  if (flexibleIndexes.length <= ORIENTATION_EXHAUSTIVE_LIMIT) {
    const combos = 1 << flexibleIndexes.length;
    let bestResult = null;

    for (let mask = 0; mask < combos; mask++) {
      const orientations = meta.map((entry) => normalizeOrientationChoice(0, entry));

      for (let i = 0; i < flexibleIndexes.length; i++) {
        orientations[flexibleIndexes[i]] = (mask >> i) & 1;
      }

      const result = skylinePack(buildRectsForOrientations(items, orientations));
      if (bestResult === null || result.length < bestResult.length - 0.001) {
        bestResult = result;
      }
    }

    return bestResult || { length: 0, placements: [] };
  }

  const seeds = [
    buildOrientationSeed(items, meta, () => 0),
    buildOrientationSeed(items, meta, () => 1),
    buildOrientationSeed(items, meta, (item) => item.h < item.w),
    buildOrientationSeed(items, meta, (item) => item.h > item.w),
    buildOrientationSeed(items, meta, (item) => item.w < item.h),
    buildOrientationSeed(items, meta, (item) => item.w > item.h),
    buildOrientationSeed(items, meta, (item) => estimateTypeLength(item.h, item.w, item.qty) < estimateTypeLength(item.w, item.h, item.qty)),
  ];

  let bestResult = null;
  const seen = new Set();

  for (const seedOrientations of seeds) {
    const key = seedOrientations.join("");
    if (seen.has(key)) continue;
    seen.add(key);

    const result = optimizeOrientationSeed(items, meta, seedOrientations);
    if (bestResult === null || result.length < bestResult.length - 0.001) {
      bestResult = result;
    }
  }

  return bestResult || skylinePack(buildRectsForOrientations(items, buildOrientationSeed(items, meta, () => 0)));
}

const COLORS = [
  "rgba(232,67,147,0.55)", "rgba(108,92,231,0.55)", "rgba(0,206,209,0.55)",
  "rgba(253,203,110,0.55)", "rgba(85,239,196,0.55)", "rgba(255,118,117,0.55)",
];

/* Shared components */

function useInView(th = 0.05) {
  const ref = useRef(null); const [v, setV] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.unobserve(el); } }, { threshold: th, rootMargin: "0px 0px 80px 0px" }); o.observe(el); return () => o.disconnect(); }, [th]);
  return [ref, v];
}
function A({ children, className = "", delay = 0 }) {
  const [ref, v] = useInView();
  return <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(30px)", transition: `opacity .5s cubic-bezier(.16,1,.3,1) ${delay}s, transform .5s cubic-bezier(.16,1,.3,1) ${delay}s`, willChange: v ? "auto" : "opacity, transform" }}>{children}</div>;
}

/* ══════════════════════════════════════════
   TEXTILE PAGES
   ══════════════════════════════════════════ */
const TEXTILE_DATA = {
  tshirts: {
    title: "Футболки",
    subtitle: "Для печати DTF",
    desc: "Футболки собственного производства по нашим лекалам. Продуманный крой, качественная ткань, идеальная основа для DTF-принтов.",
    items: [
      { name: "Футболка оверсайз", galleryModel: "oversize", sizes: "XS – 3XL", variants: [
        { label: "180 г/м²", material: "100% хлопок", fabric: "—", colors: "Чёрный, Белый, Розовый, Тёмно-серый, Меланж", defaultColor: "Розовый", price: "800 ₽", desc: "Средней плотности, свободный крой. Не садится после стирки." },
        { label: "240 г/м²", material: "100% хлопок", fabric: "—", colors: "Чёрный, Белый, Бежевый, Розовый", defaultColor: "Белый", price: "1 000 ₽", desc: "Плотная футболка свободного кроя. Не садится после стирки." },
      ] },
      { name: "Футболка варёнка", galleryModel: "oversize-washed", sizes: "S – 2XL", variants: [
        { label: "230 г/м²", material: "100% хлопок", fabric: "кулирка, пенье", colors: "Молочный, Чёрный, Серый, Розовый, Хаки, Коричневый, Синий", defaultColor: "Синий", price: "1 200 ₽", desc: "Варёный хлопок с винтажной фактурой. Каждая уникальна по оттенку." },
      ] },
      { name: "Футболка классика", sizeGuideKey: "classic", sizes: "XS – 3XL", variants: [
        { label: "180 г/м²", material: "100% хлопок", fabric: "—", colors: "Чёрный, Белый", defaultColor: "Чёрный", price: "650 ₽", desc: "Классический крой, мягкий хлопок. Для тиражей и мерча." },
      ] },
    ]
  },
  hoodies: {
    title: "Худи",
    subtitle: "Для печати DTF",
    desc: "Худи с DTF-печатью — для мерча, корпоративной одежды и подарков.",
    items: [
      { name: "Худи с начёсом", sizes: "S – 2XL", galleryModel: "hoodie-fleece", variants: [
        { label: "350 г/м²", material: "80% хлопок, 20% полиэстер", fabric: "футер 3-нитка, пенье", colors: "Чёрный", defaultColor: "Чёрный", price: "1 800 ₽", desc: "Плотное худи с мягким начёсом внутри, капюшон и карман-кенгуру." },
      ] },
      { name: "Худи варёное", sizes: "M – 3XL", galleryModel: "hoodie-washed", variants: [
        { label: "350 г/м²", material: "100% хлопок", fabric: "дабл фейс, пенье", colors: "Серый, Чёрный, Хаки", defaultColor: "Чёрный", price: "2 100 ₽", desc: "Варёный хлопок, уникальная текстура. Модель без брендинга." },
      ] },
    ]
  },
  sweatshirts: {
    title: "Свитшоты",
    subtitle: "Для печати DTF",
    desc: "Свитшоты с DTF-печатью — чистый фасад для крупных принтов.",
    items: [
      { name: "Свитшот варёный", sizes: "S – 2XL", galleryModel: "sweatshirt-washed", variants: [
        { label: "350 г/м²", material: "100% хлопок", fabric: "дабл фейс, пенье", colors: "Серый, Чёрный", defaultColor: "Чёрный", price: "1 850 ₽", desc: "Без капюшона, круглый ворот, варёный хлопок." },
      ] },
    ]
  },
  shoppers: {
    title: "Шопперы",
    subtitle: "Для печати DTF",
    desc: "Экологичные шопперы с DTF-печатью — для мерча, промо и подарков.",
    items: [
      { name: "Шоппер из саржи", sizes: "38×42 см", variants: [
        { label: "210 г/м²", material: "100% хлопок", fabric: "саржа, пенье", colors: "Чёрный, Натуральный", defaultColor: "Чёрный", price: "350 ₽", desc: "Плотная саржа, длина ручки 70 см." },
      ] },
    ]
  }
};

const TSHIRT_SIZE_GUIDE = [
  { size: "XS", chest: 49, length: 65 },
  { size: "S", chest: 52, length: 67 },
  { size: "M", chest: 55, length: 69 },
  { size: "L", chest: 58, length: 71 },
  { size: "XL", chest: 61, length: 73 },
  { size: "2XL", chest: 64, length: 75 },
  { size: "3XL", chest: 67, length: 77 },
];
const TSHIRT_SIZE_GUIDE_BASIC = [
  { size: "XS", chest: 44, length: 66 },
  { size: "S", chest: 46, length: 68 },
  { size: "M", chest: 48, length: 70 },
  { size: "L", chest: 50, length: 72 },
  { size: "XL", chest: 52, length: 74 },
  { size: "2XL", chest: 54, length: 76 },
  { size: "3XL", chest: 56, length: 78 },
];
const TSHIRT_SIZE_GUIDE_SECTIONS = [
  { title: "Оверсайз футболки", rows: TSHIRT_SIZE_GUIDE },
  { title: "Базовые футболки", rows: TSHIRT_SIZE_GUIDE_BASIC },
];
const TSHIRT_GALLERY_COLORS = {
  "черный": { base: "#151517", shade: "#050507", highlight: "#3d3f45", accent: "rgba(255,255,255,.2)", text: "#f0eef5" },
  "белый": { base: "#f4f1ed", shade: "#d5d0c9", highlight: "#ffffff", accent: "rgba(0,0,0,.08)", text: "#1b1b1d" },
  "розовый": { base: "#e7a6c0", shade: "#bf7f98", highlight: "#f3c8db", accent: "rgba(255,255,255,.18)", text: "#1b1b1d" },
  "темно-серый": { base: "#5f6670", shade: "#3f464f", highlight: "#89919c", accent: "rgba(255,255,255,.16)", text: "#f0eef5" },
  "меланж": { base: "#b8bcc3", shade: "#9299a3", highlight: "#d8dce2", accent: "rgba(255,255,255,.18)", text: "#1b1b1d", pattern: "speckle" },
  "бежевый": { base: "#d8c0a2", shade: "#b39674", highlight: "#ead9c3", accent: "rgba(255,255,255,.16)", text: "#1b1b1d" },
};

function buildHomepageShowcaseItems(items) {
  return items.flatMap((item) => {
    if (!item?.variants?.length) return [item];

    return item.variants.map((variant) => {
      const baseName = item.galleryModel === "classic" ? "Футболка базовая" : item.name;

      return {
        ...item,
        name: baseName,
        variants: [variant],
      };
    });
  });
}

const HOMEPAGE_TSHIRT_SHOWCASE_ITEMS = buildHomepageShowcaseItems(TEXTILE_DATA.tshirts.items);

function flattenCatalogItems(items) {
  return items.flatMap((item) => {
    if (!item?.variants?.length) return [item];
    return item.variants.map((variant) => ({
      ...item,
      name: `${item.name} ${variant.label}`,
      variants: [variant],
    }));
  });
}

function TextilePage({ type, onBack, onNavigate, initialProduct, onClearInitialProduct, onOpenConstructor }) {
  const data = TEXTILE_DATA[type];
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(() => {
    if (!initialProduct) return null;
    const catalogItems = flattenCatalogItems(data?.items || []);
    const match = catalogItems.find((ci) =>
      ci.galleryModel === initialProduct.galleryModel
      && ci.variants?.[0]?.label === initialProduct.variants?.[0]?.label
    ) || catalogItems.find((ci) => ci.galleryModel === initialProduct.galleryModel) || null;
    if (match) {
      if (initialProduct._initialColor) match._initialColor = initialProduct._initialColor;
      if (initialProduct._initialSize) match._initialSize = initialProduct._initialSize;
    }
    return match;
  });
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null);
  const [prevType, setPrevType] = useState(type);

  if (type !== prevType) {
    setPrevType(type);
    setSelectedProduct(null);
  }

  useEffect(() => {
    if (initialProduct) onClearInitialProduct?.();
  }, []);

  useEffect(() => {
    if (!sizeGuideOpen && !galleryModal && !orderModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (orderModalOpen) { setOrderModalOpen(false); return; }
        if (galleryModal) { setGalleryModal(null); return; }
        setSizeGuideOpen(false);
      }

      if (galleryModal && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        setGalleryModal((current) => {
          if (!current?.slides?.length) return current;
          const delta = event.key === "ArrowRight" ? 1 : -1;
          const nextIndex = (current.activeIndex + delta + current.slides.length) % current.slides.length;
          return { ...current, activeIndex: nextIndex };
        });
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sizeGuideOpen, galleryModal, orderModalOpen]);

  if (!data) return null;

  const addToCart = (selection) => {
    setCart((current) => {
      const matchIndex = current.findIndex((line) => (
        line.itemName === selection.itemName
        && line.variantLabel === selection.variantLabel
        && line.size === selection.size
        && line.color === selection.color
      ));

      if (matchIndex === -1) {
        return [...current, { ...selection, id: `${selection.itemName}-${selection.variantLabel}-${selection.size}-${selection.color}` }];
      }

      return current.map((line, index) => index === matchIndex ? { ...line, qty: line.qty + selection.qty } : line);
    });
  };

  const updateCartQty = (id, nextQty) => {
    setCart((current) => current.map((line) => line.id === id ? { ...line, qty: Math.max(1, nextQty) } : line));
  };

  const removeFromCart = (id) => {
    setCart((current) => current.filter((line) => line.id !== id));
  };

  const cartQty = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => sum + parsePriceValue(line.price) * line.qty, 0);

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh" }}>
      <style>{STYLES}{`@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.product-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,48px);align-items:start;min-width:0}.product-detail-grid--single{grid-template-columns:1fr}.product-detail-grid>*{min-width:0}@media(max-width:768px){.product-detail-grid{grid-template-columns:1fr}}`}</style>

      {type === "tshirts" && sizeGuideOpen && (
        <Suspense fallback={null}>
          <TshirtSizeGuideModal sections={TSHIRT_SIZE_GUIDE_SECTIONS} onClose={() => setSizeGuideOpen(false)} />
        </Suspense>
      )}

      {galleryModal && (
        <Suspense fallback={null}>
          <TshirtGalleryModal
            galleryModal={galleryModal}
            onClose={() => setGalleryModal(null)}
            onSelectIndex={(index) => setGalleryModal((current) => current ? { ...current, activeIndex: index } : current)}
          />
        </Suspense>
      )}

      {orderModalOpen && (
        <TextileOrderModal order={cart} onUpdateQty={updateCartQty} onRemove={removeFromCart} onClose={() => setOrderModalOpen(false)} />
      )}

      <div className="page-shell" style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 5% 0" }}>
        <button type="button" onClick={onBack} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "inherit", padding: 0, font: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          <LogoMini />
        </button>

        <div style={{ textAlign: "center", margin: "36px 0 20px" }}>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Текстиль</span>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>
            {data.title} <span style={{ fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{data.subtitle}</span>
          </h1>
          <p style={{ color: "rgba(240,238,245,.4)", fontWeight: 300, marginTop: 8, fontSize: 15, maxWidth: 600, margin: "8px auto 0" }}>{data.desc}</p>
        </div>

        {/* Category tabs */}
        <div className="scroll-tabs" style={{ display: "flex", justifyContent: "center", gap: 8, margin: "28px 0 40px", flexWrap: "wrap" }}>
          {[["tshirts", "Футболки"], ["hoodies", "Худи"], ["sweatshirts", "Свитшоты"], ["shoppers", "Шопперы"]].map(([key, label]) => (
            <button key={key} onClick={() => onNavigate(key)} className={`tb ${type === key ? "ta" : "ti"}`}>{label}</button>
          ))}
        </div>

        {/* Detail view or product grid */}
        {selectedProduct ? (
          <TextileProductDetail
            item={selectedProduct}
            type={type}
            onBack={() => setSelectedProduct(null)}
            onAddToCart={addToCart}
            onOpenGallery={setGalleryModal}
            onOpenConstructor={onOpenConstructor}
          />
        ) : (
          <>
            <div className="textile-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,260px),1fr))", gap: 24, marginBottom: 48 }}>
              {flattenCatalogItems(data.items).map((item, index) => <ProductCard key={item.name + index} item={item} index={index} type={type} onOpenDetail={setSelectedProduct} />)}
            </div>


          </>
        )}
      </div>

      {/* Floating cart button */}
      {cartQty > 0 && !orderModalOpen && (
        <button type="button" onClick={() => setOrderModalOpen(true)} style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 900,
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 24px", borderRadius: 50, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#e84393,#6c5ce7)",
          color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
          boxShadow: "0 8px 32px rgba(232,67,147,.35)",
          animation: "fadeUp 0.3s forwards",
          transition: "transform .2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cartQty} шт • {cartTotal.toLocaleString("ru-RU")} ₽
        </button>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "24px 5%", textAlign: "center" }}><p style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.2)" }}>© 2026 Future Studio • СПб • DTF-печать</p></footer>
    </div>
  );
}

/* ══════════════════════════════════════════
   CALCULATOR PAGE
   ══════════════════════════════════════════ */
function CalcPage({ onBack }) {
  const [withApply, setWithApply] = useState(() => { const s = loadCalcState(); return s?.withApply ?? false; });
  const [items, setItems] = useState(() => {
    const s = loadCalcState();
    const stored = s?.items;
    if (!Array.isArray(stored)) return [];
    // Если в localStorage сохранён единственный пустой "Принт #1" по умолчанию — не показываем его.
    if (stored.length === 1) {
      const it = stored[0];
      if (!it.w && !it.h && !it.fileName) return [];
    }
    return stored;
  });
  const [nid, setNid] = useState(() => { const s = loadCalcState(); return s?.nid ?? 2; });
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [mobileLayoutVisible, setMobileLayoutVisible] = useState(false);
  const [printsExpanded, setPrintsExpanded] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const layoutViewportRef = useRef(null);

  const goToPrintFile = (targetId) => {
    setOrderModalOpen(false);
    setPrintsExpanded(true);
    setHighlightedItemId(targetId);
    setTimeout(() => {
      const node = document.getElementById(`calc-print-${targetId}`);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        const fileInput = node.querySelector('input[type="file"]');
        // Open file picker after the smooth-scroll has a moment to start.
        setTimeout(() => { fileInput?.click(); }, 350);
      }
    }, 60);
    setTimeout(() => setHighlightedItemId(null), 3000);
  };

  useEffect(() => {
    const stripped = items.map(({ originalFile: _of, ...rest }) => rest);
    saveCalcState({ items: stripped, withApply, nid });
  }, [items, withApply, nid]);

  // Restore originalFile blobs from IndexedDB on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = items.filter((i) => i.fileName && !i.originalFile).map((i) => i.id);
      if (ids.length === 0) return;
      const restored = await Promise.all(ids.map(async (id) => [id, await loadCalcFile(`calc-file-${id}`)]));
      if (cancelled) return;
      const map = new Map(restored.filter(([, f]) => f).map(([id, f]) => [id, f]));
      if (map.size === 0) return;
      setItems((prev) => prev.map((i) => map.has(i.id) ? { ...i, originalFile: map.get(i.id) } : i));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCalc = () => {
    clearCalcState();
    clearCalcFiles();
    setItems([]);
    setNid(1);
    setWithApply(false);
    setLayoutOpen(false);
  };

  const add = () => {
    if (items.length >= MAX_CALC_ITEMS) return;
    setItems([...items, { id: nid, w: 0, h: 0, qty: 1 }]);
    setNid((prev) => prev + 1);
    setPrintsExpanded(true);
  };
  const rm = (id) => { deleteCalcFile(`calc-file-${id}`); setItems(items.filter(i => i.id !== id)); };
  const upd = (id, f, v) => {
    let n = parseFloat(v); if (isNaN(n) || n < 0) n = 0;
    if (f === "qty") n = Math.max(0, Math.round(n)); else n = Math.max(0, n);
    setItems(items.map(i => i.id === id ? { ...i, [f]: n } : i));
  };

  const handleFileUpload = async (id, file) => {
    const result = await processCalcFile(file);
    if (!result) return;
    saveCalcFile(`calc-file-${id}`, file);
    setItems((prev) => prev.map(i => i.id === id ? { ...i, w: result.w, h: result.h, thumb: result.thumb, fileName: result.fileName, dpiWarning: result.dpiWarning, originalFile: file } : i));
  };

  const handleMultiFileUpload = async (fileList) => {
    const files = Array.from(fileList).slice(0, MAX_CALC_ITEMS - items.length);
    if (files.length === 0) return;
    const results = [];
    for (const f of files) { const r = await processCalcFile(f); if (r) results.push({ ...r, originalFile: f }); }
    if (results.length === 0) return;
    setPrintsExpanded(true);
    setItems((prev) => {
      let nextId = nid;
      const newItems = results.map((r) => {
        const item = { id: nextId, w: r.w, h: r.h, qty: 1, thumb: r.thumb, fileName: r.fileName, dpiWarning: r.dpiWarning, originalFile: r.originalFile };
        saveCalcFile(`calc-file-${nextId}`, r.originalFile);
        nextId++;
        return item;
      });
      setNid(nextId);
      return [...prev, ...newItems];
    });
  };

  const clearFileFromItem = (id) => {
    deleteCalcFile(`calc-file-${id}`);
    setItems((prev) => prev.map(i => i.id === id ? { ...i, thumb: undefined, fileName: undefined, dpiWarning: undefined, originalFile: undefined } : i));
  };

  const activeItems = items.filter(i => i.w > 0 && i.h > 0 && i.qty > 0);
  const valid = activeItems.length > 0;
  const oversized = activeItems.some(i => Math.min(i.w, i.h) > BED_W);

  const packItems = activeItems.map((it) => ({ w: it.w, h: it.h, qty: it.qty, color: COLORS[items.indexOf(it) % COLORS.length] }));
  const pack = valid && !oversized ? packOnBed(packItems) : { length: 0, placements: [] };

  const totalQty = activeItems.reduce((s, i) => s + i.qty, 0);
  const lengthCm = pack.length;
  const meters = lengthCm / 100;
  const metersRaw = meters > 0 ? Math.ceil(meters * 10) / 10 : 0;
  const metersDisplay = meters > 0 ? Math.round(meters * 100) / 100 : 0;
  const metersRound = metersRaw > 0 && !withApply ? Math.max(1, metersRaw) : metersRaw;

  const overThreeMeters = metersRaw > 3;
  const itemFormats = activeItems.map((it) => {
    const idx = items.indexOf(it);
    const fmt = getFormat(it.w, it.h);
    const eligible = withApply && !overThreeMeters && fmt !== null && it.qty <= 15;
    if (!eligible) return { ...it, format: fmt, formatCost: null, eligible, idx, unitPrice: 0, bulkUnitPrice: 0 };
    const isLarge = fmt.name === "A3+" || fmt.name === "A3++";
    let unitPrice;
    if (isLarge) { unitPrice = fmt.price; }
    else if (it.qty === 1) { unitPrice = 600; }
    else if (it.qty < 5) { unitPrice = 500; }
    else { unitPrice = fmt.price; }
    const bulkUnitPrice = fmt.price; // цена от 5 шт
    return { ...it, format: fmt, formatCost: unitPrice * it.qty, eligible, idx, unitPrice, bulkUnitPrice };
  });
  const formatItems = itemFormats.filter(it => it.eligible);
  const meterItems = itemFormats.filter(it => !it.eligible);
  const isSmallOrder = withApply && formatItems.length > 0 && meterItems.length === 0;
  const isMixed = withApply && formatItems.length > 0 && meterItems.length > 0;
  const formatPartCost = formatItems.reduce((s, it) => s + it.formatCost, 0);

  let meterPartPrint = { rate: 0, cost: 0 };
  let meterPartApply = { rate: 0, cost: 0 };
  let meterPartMeters = 0;
  const meterQty = meterItems.reduce((s, it) => s + it.qty, 0);
  if (meterItems.length > 0 && valid && !oversized) {
    const mPack = packOnBed(meterItems.map(it => ({ w: it.w, h: it.h, qty: it.qty, color: COLORS[it.idx % COLORS.length] })));
    meterPartMeters = mPack.length > 0 ? Math.ceil(mPack.length / 100 * 10) / 10 : 0;
    meterPartPrint = getPrintCost(meterPartMeters);
    meterPartApply = getApplyCost(meterQty);
  }

  const print = getPrintCost(metersRound);
  const apply = withApply ? getApplyCost(totalQty) : { rate: 0, cost: 0 };
  const standardTotal = print.cost + apply.cost;

  // «Только печать»: поштучная цена пока сумма < стоимости 1 п/м и метраж ≤ 1 м.
  // Малые форматы (≤ A3) — фиксированно 500 ₽/шт. Большие (A3+, A3++) — по цене формата.
  const PRINT_ONLY_SMALL_FLAT_PRICE = 500;
  const PRINT_ONLY_SMALL_FORMATS = new Set(["A6", "A5", "A4", "A3"]);
  const getPrintOnlyUnitPrice = (fmt) => {
    if (!fmt) return 0;
    if (PRINT_ONLY_SMALL_FORMATS.has(fmt.name)) return PRINT_ONLY_SMALL_FLAT_PRICE;
    return fmt.price;
  };
  const oneMeterCost = getPrintCost(1).cost;
  const itemsForPrintOnly = !withApply && valid && !oversized
    ? activeItems.map((it) => {
        const format = getFormat(it.w, it.h);
        return {
          ...it,
          format,
          idx: items.indexOf(it),
          unitPrice: getPrintOnlyUnitPrice(format),
        };
      })
    : [];
  const allItemsHaveFormat = !withApply && itemsForPrintOnly.length > 0
    && itemsForPrintOnly.every((it) => it.format);
  const printOnlyPerPieceCost = allItemsHaveFormat
    ? itemsForPrintOnly.reduce((sum, it) => sum + it.qty * it.unitPrice, 0)
    : 0;
  const printOnlySmall = allItemsHaveFormat
    && metersRaw <= 1
    && printOnlyPerPieceCost < oneMeterCost;
  // Сохраняем имя для совместимости с существующими условиями ниже.
  const allItemsSmallFormat = allItemsHaveFormat;

  const printTotal = printOnlySmall
    ? printOnlyPerPieceCost
    : isSmallOrder
      ? formatPartCost
      : isMixed
        ? formatPartCost + meterPartPrint.cost + meterPartApply.cost
        : standardTotal;
  const total = printTotal;

  const svgW = 370;
  const pad = 24;
  const bedTop = pad + 16;
  const scale = (svgW - pad * 2) / BED_W;
  const svgH = Math.max(lengthCm * scale + pad * 2 + 28, 140);
  const layoutViewportMaxHeight = layoutOpen ? LAYOUT_SCROLL_MAX_HEIGHT : LAYOUT_PREVIEW_HEIGHT;

  useEffect(() => {
    if (!layoutOpen) return undefined;

    const scrollToBottom = () => {
      const node = layoutViewportRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    };

    scrollToBottom();
    const frameId = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(frameId);
  }, [layoutOpen, lengthCm]);

  // Cost breakdown for order PDF/messages.
  const orderCostLines = (() => {
    if (printOnlySmall) {
      return itemsForPrintOnly.map((it, i) => ({
        label: `Принт ${i + 1} (${it.format ? it.format.name : `${it.w}×${it.h}`})`,
        amount: it.qty * it.unitPrice,
        sub: `${it.qty} шт × ${it.unitPrice} ₽`,
      }));
    }
    if (isSmallOrder) {
      return formatItems.map((it, i) => ({
        label: `Принт ${i + 1} (${it.format.name})`,
        amount: it.formatCost,
        sub: `${it.qty} шт × ${it.unitPrice} ₽`,
      }));
    }
    if (isMixed) {
      const lines = formatItems.map((it, i) => ({
        label: `Принт ${i + 1} (${it.format.name})`,
        amount: it.formatCost,
        sub: `${it.qty} шт × ${it.unitPrice} ₽`,
      }));
      lines.push({ label: "Печать (по метражу)", amount: meterPartPrint.cost, sub: `${meterPartMeters.toFixed(1)} м × ${meterPartPrint.rate} ₽/м` });
      lines.push({ label: "Нанесение", amount: meterPartApply.cost, sub: `${meterQty} шт × ${meterPartApply.rate} ₽/шт` });
      return lines;
    }
    const lines = [{ label: "Печать", amount: print.cost, sub: metersRaw > 0 && metersRaw < 1 ? `Минимальный заказ 1 м × ${print.rate} ₽/м` : `${metersRound.toFixed(2)} м × ${print.rate} ₽/м` }];
    if (withApply && totalQty > 0) {
      lines.push({ label: "Нанесение", amount: apply.cost, sub: `${totalQty} шт × ${apply.rate} ₽/шт` });
    }
    return lines;
  })();

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh" }}>
      <style>{STYLES}</style>

      <div className="page-shell-narrow" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 5% 0" }}>
        <button type="button" onClick={onBack} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "inherit", padding: 0, font: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          <LogoMini />
        </button>

        <div style={{ textAlign: "center", margin: "36px 0 32px" }}>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#e84393", textTransform: "uppercase" }}>Оптовым клиентам</span>
          <h1 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 200, marginTop: 12 }}>
            Калькулятор <span style={{ fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DTF-печати</span>
          </h1>
        </div>

        <div className="cg2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 48, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", ...(items.length > 5 && !printsExpanded ? { maxHeight: 160, overflow: "hidden" } : {}) }}>
              {(items.length > 5 && !printsExpanded ? items.slice(0, 2) : items).map((it, idx) => {
                const globalIdx = items.indexOf(it);
                const isHighlighted = it.id === highlightedItemId;
                return (
                <div
                  key={it.id}
                  id={`calc-print-${it.id}`}
                  className="cs calc-panel"
                  style={{
                    padding: "20px 22px",
                    transition: "box-shadow .3s, border-color .3s",
                    ...(isHighlighted ? {
                      boxShadow: "0 0 0 2px rgba(232,67,147,.55), 0 12px 32px rgba(232,67,147,.18)",
                      borderColor: "rgba(232,67,147,.55)",
                    } : {}),
                  }}
                >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: COLORS[globalIdx % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Принт #{globalIdx + 1}</span>
                  <label className="calc-file-label" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(108,92,231,.1)", border: "1px solid rgba(108,92,231,.25)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: "#6c5ce7", fontSize: 11, fontWeight: 500, fontFamily: "'Outfit',sans-serif", transition: "all .3s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,92,231,.2)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(108,92,231,.1)"; }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Файл
                    <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.tiff,.tif" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleFileUpload(it.id, e.target.files[0]); e.target.value = ""; }} />
                  </label>
                  {items.length > 0 && <button onClick={() => rm(it.id)} style={{ background: "none", border: "none", color: "rgba(240,238,245,.3)", cursor: "pointer", fontSize: 16, fontFamily: "inherit" }} onMouseEnter={e => e.target.style.color = "#e84393"} onMouseLeave={e => e.target.style.color = "rgba(240,238,245,.3)"}>✕</button>}
                </div>
                <div className="calc-item-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[["Ширина, см", "w"], ["Высота, см", "h"], ["Кол-во", "qty"]].map(([label, f]) => {
                    const locked = it.fileName && f !== "qty";
                    return (
                      <div key={f}>
                        <label style={{ fontSize: 10, fontWeight: 400, color: "rgba(240,238,245,.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5, display: "block" }}>{label}</label>
                        <input type="number" value={it[f] || ""} onChange={e => upd(it.id, f, e.target.value)} readOnly={locked} tabIndex={locked ? -1 : undefined} className="inf" style={{ padding: "10px 12px", fontSize: 16, fontWeight: 500, textAlign: "center", ...(locked ? { opacity: .55, pointerEvents: "none" } : {}) }} min={f === "qty" ? 1 : 0.1} step={f === "qty" ? 1 : 0.5} />
                      </div>
                    );
                  })}
                </div>
                {it.fileName && (
                  <div className="calc-file-info" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "rgba(108,92,231,.06)", border: "1px solid rgba(108,92,231,.15)" }}>
                    {it.thumb && <img src={it.thumb} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="calc-file-info-name" style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.fileName}</div>
                      {it.dpiWarning && <div className="calc-file-info-dpi" style={{ fontSize: 10, color: "#fdcb6e", marginTop: 2 }}>⚠ Низкое разрешение (&lt; 300 DPI)</div>}
                    </div>
                    <button onClick={() => clearFileFromItem(it.id)} style={{ background: "none", border: "none", color: "rgba(240,238,245,.3)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", flexShrink: 0, padding: "2px 4px" }} onMouseEnter={e => e.target.style.color = "#e84393"} onMouseLeave={e => e.target.style.color = "rgba(240,238,245,.3)"}>✕</button>
                  </div>
                )}
                {(Math.min(it.w, it.h) > BED_W && it.w > 0 && it.h > 0) && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.2)", fontSize: 12, color: "#ff6b6b" }}>
                    Обе стороны &gt; {BED_W} см — не помещается
                  </div>
                )}
                </div>
                );
              })}
              {items.length > 5 && !printsExpanded && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, #08080c)", pointerEvents: "none", borderRadius: "0 0 20px 20px" }} />
              )}
            </div>
            {items.length > 5 && (
              <button onClick={() => setPrintsExpanded(v => { if (v) window.scrollTo({ top: 0, behavior: "smooth" }); return !v; })} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "12px 18px", cursor: "pointer", color: "rgba(240,238,245,.5)", fontSize: 13, fontWeight: 400, fontFamily: "'Outfit',sans-serif", transition: "all .3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,67,147,.3)"; e.currentTarget.style.color = "#e84393"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; e.currentTarget.style.color = "rgba(240,238,245,.5)"; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: printsExpanded ? "rotate(180deg)" : "none", transition: "transform .3s" }}><polyline points="6 9 12 15 18 9"/></svg>
                {printsExpanded ? "Свернуть" : `Показать все ${items.length} принтов`}
              </button>
            )}
            {items.length < MAX_CALC_ITEMS && (
              <div className="calc-add-row" style={{ display: "flex", gap: 10, marginTop: items.length === 0 ? 37 : 0 }}>
                <button onClick={add} style={{ flex: 1, background: "rgba(255,255,255,.02)", border: "1.5px dashed rgba(255,255,255,.1)", borderRadius: 20, padding: 18, cursor: "pointer", color: "rgba(240,238,245,.35)", fontSize: 14, fontFamily: "'Outfit',sans-serif", transition: "all .3s" }} onMouseEnter={e => { e.target.style.borderColor = "rgba(232,67,147,.4)"; e.target.style.color = "#e84393"; }} onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,.1)"; e.target.style.color = "rgba(240,238,245,.35)"; }}>
                  + Добавить размер
                </button>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(108,92,231,.06)", border: "1.5px dashed rgba(108,92,231,.25)", borderRadius: 20, padding: "18px 20px", cursor: "pointer", color: "rgba(108,92,231,.7)", fontSize: 14, fontFamily: "'Outfit',sans-serif", transition: "all .3s", whiteSpace: "nowrap" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,92,231,.5)"; e.currentTarget.style.color = "#6c5ce7"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(108,92,231,.25)"; e.currentTarget.style.color = "rgba(108,92,231,.7)"; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Загрузить файлы
                  <input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.tiff,.tif" style={{ display: "none" }} onChange={e => { if (e.target.files.length) handleMultiFileUpload(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: items.length < MAX_CALC_ITEMS ? -4 : 0 }}>
              <div style={{ fontSize: 12, color: "rgba(240,238,245,.38)" }}>
                Добавлено {items.length} из {MAX_CALC_ITEMS} размеров.
              </div>
              <button onClick={resetCalc} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.2)", borderRadius: 10, cursor: "pointer", color: "#ff6b6b", fontSize: 12, fontWeight: 500, fontFamily: "'Outfit',sans-serif", padding: "7px 14px", transition: "all .3s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,80,80,.15)"; e.currentTarget.style.borderColor = "rgba(255,80,80,.4)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,80,80,.08)"; e.currentTarget.style.borderColor = "rgba(255,80,80,.2)"; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 22v-6h6"/></svg>
                Сбросить
              </button>
            </div>

            {valid && !oversized && lengthCm > 0 && (
              <>
              <button
                className="calc-layout-toggle-mobile"
                onClick={() => setMobileLayoutVisible(v => !v)}
                style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 0", background: "rgba(108,92,231,.08)", border: "1.5px solid rgba(108,92,231,.25)", borderRadius: 14, cursor: "pointer", color: "#6c5ce7", fontSize: 13, fontWeight: 500, fontFamily: "'Outfit',sans-serif", transition: "all .3s" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="13" y2="12" /></svg>
                {mobileLayoutVisible ? "Скрыть раскладку" : "Посмотреть раскладку на полотне"}
              </button>
              <div className={`calc-layout-block${mobileLayoutVisible ? " calc-layout-block-visible" : ""}`}>
              <div className="cs calc-panel" style={{ padding: 20, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: layoutOpen ? 14 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase" }}>Раскладка на полотне</div>
                </div>
                <div style={{ position: "relative" }}>
                  <div
                    ref={layoutViewportRef}
                    style={{
                      maxHeight: layoutViewportMaxHeight,
                      height: layoutOpen ? "auto" : LAYOUT_PREVIEW_HEIGHT,
                      overflowX: "auto",
                      overflowY: layoutOpen ? "auto" : "hidden",
                      transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                      paddingRight: layoutOpen ? 4 : 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: layoutOpen ? "flex-start" : "flex-end",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", minWidth: "fit-content", flexShrink: 0 }}>
                      <svg width={svgW} height={svgH} style={{ background: "rgba(255,255,255,.015)", borderRadius: 10, border: "1px solid rgba(255,255,255,.04)" }}>
                        <line x1={pad} y1={pad + 4} x2={pad + BED_W * scale} y2={pad + 4} stroke="rgba(240,238,245,.2)" strokeWidth=".5" />
                        <line x1={pad} y1={pad} x2={pad} y2={pad + 8} stroke="rgba(240,238,245,.2)" strokeWidth=".5" />
                        <line x1={pad + BED_W * scale} y1={pad} x2={pad + BED_W * scale} y2={pad + 8} stroke="rgba(240,238,245,.2)" strokeWidth=".5" />
                        <text x={pad + BED_W * scale / 2} y={pad - 4} textAnchor="middle" fill="rgba(240,238,245,.3)" fontSize="10" fontFamily="Outfit">{BED_W} см</text>
                        <rect x={pad} y={bedTop} width={BED_W * scale} height={Math.max(lengthCm * scale, 1)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1" strokeDasharray="4 2" rx="3" />
                        {pack.placements.map((p, i) => {
                          const renderY = lengthCm - p.y - p.h;
                          const itemThumb = activeItems[p.idx]?.thumb;
                          return (
                            <g key={i}>
                              <rect x={pad + p.x * scale} y={bedTop + renderY * scale} width={Math.max(p.w * scale - .3, 1)} height={Math.max(p.h * scale - .3, 1)} fill={p.color} stroke="rgba(255,255,255,.15)" strokeWidth=".5" rx="2" />
                              {itemThumb && p.w * scale > 10 && p.h * scale > 10 && (
                                <image xlinkHref={itemThumb} href={itemThumb} x={pad + p.x * scale + 1} y={bedTop + renderY * scale + 1} width={Math.max(p.w * scale - 2.3, 1)} height={Math.max(p.h * scale - 2.3, 1)} preserveAspectRatio="xMidYMid meet" opacity=".85" />
                              )}
                              {p.w * scale > 30 && p.h * scale > 16 && !itemThumb && (
                                <text x={pad + (p.x + p.w / 2) * scale} y={bedTop + (renderY + p.h / 2) * scale + 3} textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize="8" fontFamily="Outfit">{p.w}×{p.h}</text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                  {!layoutOpen && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(rgba(8,8,12,0.95), transparent)", pointerEvents: "none", borderRadius: "10px 10px 0 0" }} />
                  )}
                </div>
                {layoutOpen && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "rgba(240,238,245,.38)", textAlign: "center" }}>
                    Полную раскладку можно прокручивать внутри этого окна снизу вверх.
                  </div>
                )}
                <button onClick={() => setLayoutOpen(!layoutOpen)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: layoutOpen ? 12 : -8, padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: "#6c5ce7", fontSize: 13, fontWeight: 400, fontFamily: "'Outfit',sans-serif", transition: "all 0.3s", position: "relative", zIndex: 2 }} onMouseEnter={e => e.target.style.color = "#e84393"} onMouseLeave={e => e.target.style.color = "#6c5ce7"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform 0.4s", transform: layoutOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  {layoutOpen ? "Свернуть раскладку" : "Открыть полную раскладку"}
                </button>
              </div>
              </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <button onClick={() => setWithApply(true)} className={`tb ${withApply ? "ta" : "ti"}`}>С нанесением</button>
              <button onClick={() => setWithApply(false)} className={`tb ${!withApply ? "ta" : "ti"}`}>Только печать</button>
            </div>
            <div className="cs calc-panel" style={{ padding: 28, border: "1px solid rgba(232,67,147,.15)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#e84393", textTransform: "uppercase", marginBottom: 24 }}>Результат</div>

              {!valid || oversized ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "rgba(240,238,245,.3)", fontSize: 14, fontWeight: 300 }}>{oversized ? "Принт не помещается" : "Заполните поля"}</div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    {[["Всего принтов", `${totalQty} шт`], ["Длина печати", `${lengthCm.toFixed(1)} см`], ["Погонных метров", `${metersDisplay.toFixed(2)} м`]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.02)", borderRadius: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>{l}</span>
                        <span style={{ fontSize: 17, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                    {isSmallOrder || isMixed ? (
                      <>
                        {formatItems.map((it, i) => {
                          const isLarge = it.format.name === "A3+" || it.format.name === "A3++";
                          const showBulkHint = !isLarge && it.qty < 5 && it.unitPrice > it.bulkUnitPrice;
                          return (
                          <div key={`f${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 400, display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[it.idx % COLORS.length], flexShrink: 0 }} />
                                <span className="calc-result-dims">{it.w}×{it.h} см → {it.format.name}</span>
                              </div>
                              <div className="calc-result-sub" style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)", marginLeft: 18 }}>{it.qty} шт × {it.unitPrice} ₽</div>
                              {showBulkHint && <div className="calc-result-sub" style={{ fontSize: 11, fontWeight: 300, color: "rgba(108,92,231,.7)", marginLeft: 18, marginTop: 2 }}>от 5 шт — {it.bulkUnitPrice} ₽/шт</div>}
                            </div>
                            <span className="calc-result-price" style={{ fontSize: 18, fontWeight: 600 }}>{it.formatCost.toLocaleString("ru")} ₽</span>
                          </div>
                          );
                        })}
                        {isMixed && (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div><div style={{ fontSize: 14, fontWeight: 400 }}>Печать (по метражу)</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)" }}>{meterPartMeters.toFixed(1)} м × {meterPartPrint.rate} ₽/м</div></div>
                              <span style={{ fontSize: 18, fontWeight: 600 }}>{meterPartPrint.cost.toLocaleString("ru")} ₽</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div><div style={{ fontSize: 14, fontWeight: 400 }}>Нанесение</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)" }}>{meterQty} шт × {meterPartApply.rate} ₽/шт</div></div>
                              <span style={{ fontSize: 18, fontWeight: 600 }}>{meterPartApply.cost.toLocaleString("ru")} ₽</span>
                            </div>
                          </>
                        )}
                      </>
                    ) : printOnlySmall ? (
                      <>
                        {itemsForPrintOnly.map((it, i) => (
                          <div key={`po${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 400, display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[it.idx % COLORS.length], flexShrink: 0 }} />
                                <span className="calc-result-dims">{it.w}×{it.h} см → {it.format.name}</span>
                              </div>
                              <div className="calc-result-sub" style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)", marginLeft: 18 }}>{it.qty} шт × {it.unitPrice} ₽</div>
                            </div>
                            <span className="calc-result-price" style={{ fontSize: 18, fontWeight: 600 }}>{(it.qty * it.unitPrice).toLocaleString("ru")} ₽</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><div style={{ fontSize: 14, fontWeight: 400 }}>Печать</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)" }}>{metersRaw > 0 && metersRaw < 1 ? `Минимальный заказ 1 м × ${print.rate} ₽/м` : `${metersRound.toFixed(2)} м × ${print.rate} ₽/м`}</div></div>
                          <span style={{ fontSize: 18, fontWeight: 600 }}>{print.cost.toLocaleString("ru")} ₽</span>
                        </div>
                        {withApply && totalQty > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div><div style={{ fontSize: 14, fontWeight: 400 }}>Нанесение</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)" }}>{totalQty} шт × {apply.rate} ₽/шт</div></div>
                            <span style={{ fontSize: 18, fontWeight: 600 }}>{apply.cost.toLocaleString("ru")} ₽</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="calc-total-box" style={{ marginTop: 20, padding: "18px 22px", borderRadius: 14, background: "linear-gradient(135deg,rgba(232,67,147,.1),rgba(108,92,231,.1))", border: "1px solid rgba(232,67,147,.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>Итого</span>
                      <span className="calc-total-value" style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total.toLocaleString("ru")} ₽</span>
                    </div>
                    {totalQty > 0 && <div className="calc-total-note" style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)", marginTop: 4, textAlign: "right" }}>≈ {Math.round(total / totalQty)} ₽ / принт</div>}
                  </div>

                  {(!isSmallOrder && !withApply && !printOnlySmall && !allItemsSmallFormat && meters > 0 && meters < 1) ? (
                    <button type="button" onClick={() => setOrderModalOpen(true)} className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}><TG /> Оформить штучный заказ</button>
                  ) : (
                    <button type="button" onClick={() => setOrderModalOpen(true)} className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}><TG /> Оформить заказ</button>
                  )}
                </>
              )}
            </div>

            {(isSmallOrder || isMixed) && (
              <div className="cs calc-panel" style={{ padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Цены по формату (печать + нанесение)</div>
                {FORMAT_PRICES.map((f, i) => {
                  const active = formatItems.some(it => it.format && it.format.name === f.name);
                  const isLarge = f.name === "A3+" || f.name === "A3++";
                  return <Fragment key={i}>
                    {i === 4 && <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", margin: "6px 12px" }} />}
                    <div className="calc-fmt-row" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderRadius: 8, background: active ? "rgba(232,67,147,.08)" : "transparent", gap: "2px 12px" }}>
                    <span className="calc-fmt-name" style={{ fontSize: 13, fontWeight: 300, color: active ? "#e84393" : "rgba(240,238,245,.35)", whiteSpace: "nowrap" }}>{f.name} ({f.short}×{f.long})</span>
                    <span className="calc-fmt-prices" style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#e84393" : "rgba(240,238,245,.45)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                      {isLarge ? `${f.price} ₽/шт` : <>{`от 5 шт — ${f.price} ₽`}<span className="calc-fmt-div" style={{ width: 1, height: 12, background: "rgba(255,255,255,.12)", flexShrink: 0 }} />{`2-4 шт — 500 ₽`}<span className="calc-fmt-div" style={{ width: 1, height: 12, background: "rgba(255,255,255,.12)", flexShrink: 0 }} />{`1 шт — 600 ₽`}</>}
                    </span>
                  </div>
                  </Fragment>;
                })}
              </div>
            )}
            {!isSmallOrder && (
              <>
                <div className="cs calc-panel" style={{ padding: 22 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Тарифы — печать</div>
                  {PRINT_TIERS.map((t, i) => {
                    const dm = isMixed ? meterPartMeters : metersRound;
                    const a = valid && dm > 0 && Math.ceil(dm) >= t.min && Math.ceil(dm) <= t.max;
                    return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderRadius: 8, background: a ? "rgba(232,67,147,.08)" : "transparent" }}><span style={{ fontSize: 13, fontWeight: 300, color: a ? "#e84393" : "rgba(240,238,245,.35)" }}>{t.max === Infinity ? `от ${t.min} м` : `${t.min}–${t.max} м`}</span><span style={{ fontSize: 13, fontWeight: a ? 600 : 400, color: a ? "#e84393" : "rgba(240,238,245,.45)" }}>{t.price} ₽/м</span></div>;
                  })}
                </div>
                {withApply && (
                  <div className="cs calc-panel" style={{ padding: 22 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Тарифы — нанесение</div>
                    {APPLY_TIERS.map((t, i) => {
                      const dq = isMixed ? meterQty : totalQty;
                      const a = valid && dq >= t.min && dq <= t.max;
                      return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderRadius: 8, background: a ? "rgba(108,92,231,.08)" : "transparent" }}><span style={{ fontSize: 13, fontWeight: 300, color: a ? "#6c5ce7" : "rgba(240,238,245,.35)" }}>{t.max === Infinity ? `от ${t.min} шт` : `${t.min}–${t.max} шт`}</span><span style={{ fontSize: 13, fontWeight: a ? 600 : 400, color: a ? "#6c5ce7" : "rgba(240,238,245,.45)" }}>{t.price} ₽/шт</span></div>;
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "24px 5%", textAlign: "center" }}><p style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.2)" }}>© 2026 Future Studio • СПб • DTF-печать</p></footer>
      <CalcOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        items={activeItems}
        mode={withApply ? "withApply" : "printOnly"}
        totalQty={totalQty}
        lengthCm={lengthCm}
        metersRound={metersDisplay}
        costLines={orderCostLines}
        total={total}
        onGoToPrintFile={goToPrintFile}
        onResetCalc={resetCalc}
      />
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN SITE
   ══════════════════════════════════════════ */
const NAV = ["Главная", "Портфолио", "Текстиль", "Цены", "Отзывы", "Контакты"];
const SCROLL_NAV = { "Главная": "hero", "Цены": "pricing", "Отзывы": "reviews", "Контакты": "contact" };
const TEXTILE_MENU = [["tshirts", "Футболки"], ["hoodies", "Худи"], ["sweatshirts", "Свитшоты"], ["shoppers", "Шопперы"]];
const SERVICES = [
  { icon: "👕", title: "Печать на футболках", desc: "DTF-перенос на футболки оверсайз и классического кроя.", price: "от 650 ₽" },
  { icon: "🧢", title: "Печать на кепках", desc: "Кепки, бейсболки, панамы — любой сложности.", price: "от 250 ₽" },
  { icon: "👜", title: "Печать на шопперах", desc: "Шопперы, сумки, косметички.", price: "от 330 ₽" },
  { icon: "⚽", title: "Спортивная форма", desc: "Для команд и клубов, любые тиражи.", price: "от 600 ₽" },
  { icon: "🎨", title: "Дизайн макетов", desc: "Разработка или адаптация под DTF.", price: "от 500 ₽" },
];
const DP = [{ f: "A6 (10×15)", p: 250, n: "от 5 шт" }, { f: "A5 (15×20)", p: 290, n: "от 5 шт" }, { f: "A4 (20×30)", p: 350, n: "от 5 шт" }, { f: "A3 (30×42)", p: 450, n: "от 5 шт" }, { f: "A3+ (30×42)", p: 650, n: "" }, { f: "A3++ (40×50)", p: 800, n: "" }];
const MP = [{ r: "1–2 м", p: "1 400 ₽" }, { r: "3–5 м", p: "1 200 ₽" }, { r: "6–20 м", p: "1 100 ₽" }, { r: "20–50 м", p: "1 000 ₽" }, { r: "от 50 м", p: "900 ₽" }];
const PRICING_NOTES = [
  { text: "Тестовый образец — 600 ₽ (A6–A3)", highlight: true },
  { text: "Цены за принт + прижим" },
  { text: "Отдельный перенос — 100 ₽/шт" },
  { text: "Мин. стоимость печати — 500 ₽" },
];
const RV = [
  { name: "Наталья Гвоздева", date: "8 фев 2025", text: "Быстро, качественно, бюджетно. Напечатали форму на коллектив. Стирают — всё супер!" },
  { name: "Юлия", date: "18 фев 2025", text: "Работаем давно! Всегда чётко, быстро, качественно. Если недочёты в макете — ребята подсказывают." },
  { name: "Дарья И.", date: "9 фев 2025", text: "Лояльные и компетентные ребята. Принт сделали за 15–20 минут. Всё понравилось!" },
];

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash || hash === "main") return "main";
  if (hash === "calc" || hash === "portfolio" || hash === "constructor") return hash;

  if (hash.startsWith("textile_")) {
    const textileType = hash.replace("textile_", "");
    const isKnownTextileType = TEXTILE_MENU.some(([key]) => key === textileType);
    return isKnownTextileType ? hash : "main";
  }

  return "main";
}

function setPageHash(page) {
  const normalizedPage = page === "main" ? "" : `#${page}`;
  if (window.location.hash === normalizedPage) return;
  window.location.hash = normalizedPage;
}

export default function App() {
  const [pg, setPg] = useState(() => getPageFromHash());
  const [ac, setAc] = useState("Главная");
  const [mn, setMn] = useState(false);
  const [fm, setFm] = useState({ n: "", p: "", m: "" });
  const [sy, setSy] = useState(0);
  const [pt, setPt] = useState("format");
  const [txMenuOpen, setTxMenuOpen] = useState(false);
  const [initialTextileProduct, setInitialTextileProduct] = useState(null);
  const [initialConstructorSelection, setInitialConstructorSelection] = useState(null);
  const reviewData = useYandexReviews();

  useEffect(() => { const h = () => setSy(window.scrollY); window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h); }, []);
  useEffect(() => {
    const onHashChange = () => {
      setPg(getPageFromHash());
      setMn(false);
      setTxMenuOpen(false);
      window.scrollTo(0, 0);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    setPageHash(pg);
  }, [pg]);

  useEffect(() => {
    if (!mn) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMn(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mn]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860) setMn(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navigateToPage = (page, { scrollToTop = true } = {}) => {
    setPg(page);
    setMn(false);
    setTxMenuOpen(false);
    if (scrollToTop) window.scrollTo(0, 0);
  };

  const go = (s) => {
    if (s === "Портфолио") { navigateToPage("portfolio"); return; }
    if (s === "Главная" && pg !== "main") { navigateToPage("main"); setAc("Главная"); return; }
    if (SCROLL_NAV[s]) document.getElementById(SCROLL_NAV[s])?.scrollIntoView({ behavior: "smooth" });
    setAc(s); setMn(false);
  };
  const goTextile = (type) => { navigateToPage("textile_" + type); };
  const oc = () => { navigateToPage("calc"); };
  const goConstructor = () => { navigateToPage("constructor"); };

  const handleContactSubmit = (event) => {
    event.preventDefault();
    if (!fm.n.trim() || !fm.p.trim()) return;

    const message = [
      "Здравствуйте! Хочу оформить заказ.",
      `Имя: ${fm.n.trim()}`,
      `Телефон: ${fm.p.trim()}`,
      fm.m.trim() ? `Комментарий: ${fm.m.trim()}` : null,
    ].filter(Boolean).join("\n");

    const telegramUrl = `https://t.me/FUTURE_178?text=${encodeURIComponent(message)}`;
    const popup = window.open(telegramUrl, "_blank", "noopener,noreferrer");

    if (!popup) {
      window.location.assign(telegramUrl);
    }
  };

  if (pg === "constructor") return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080c", color: "#f0eef5", fontFamily: "'Outfit',sans-serif" }}>Загрузка конструктора…</div>}>
      <ConstructorRoute
        onBack={() => navigateToPage("main")}
        initialSelection={initialConstructorSelection}
        onClearInitialSelection={() => setInitialConstructorSelection(null)}
        onOpenProductDetails={({ model, densityLabel, color, size }) => {
          setInitialTextileProduct({
            galleryModel: model,
            variants: densityLabel ? [{ label: densityLabel }] : [],
            _initialColor: color || null,
            _initialSize: size || null,
          });
          navigateToPage("textile_tshirts");
        }}
      />
    </Suspense>
  );
  if (pg === "calc") return <CalcPage onBack={() => navigateToPage("main")} />;
  if (pg === "portfolio") return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080c", color: "#f0eef5", fontFamily: "'Outfit',sans-serif" }}>Загрузка портфолио…</div>}>
      <PortfolioPage onBack={() => navigateToPage("main")} />
    </Suspense>
  );
  if (pg.startsWith("textile_")) return <TextilePage type={pg.replace("textile_", "")} initialProduct={initialTextileProduct} onClearInitialProduct={() => setInitialTextileProduct(null)} onBack={() => navigateToPage("main")} onNavigate={(t) => navigateToPage("textile_" + t)} onOpenConstructor={(selection) => { setInitialConstructorSelection(selection || null); navigateToPage("constructor"); }} />;

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{STYLES}</style>

      <MainNavigation
        scrollY={sy}
        currentPage={pg}
        activeSection={ac}
        mobileMenuOpen={mn}
        setMobileMenuOpen={setMn}
        textileMenuOpen={txMenuOpen}
        setTextileMenuOpen={setTxMenuOpen}
        navigationItems={NAV}
        textileMenuItems={TEXTILE_MENU}
        onNavigate={go}
        onNavigateTextile={goTextile}
        onOpenCalculator={oc}
        onOpenConstructor={goConstructor}
      />

      {/* HERO */}
      <HeroSection Reveal={A} onOpenConstructor={goConstructor} onOpenCalculator={oc} reviewData={reviewData} />


      {/* PRICING */}
      <PricingSection
        Reveal={A}
        pricingTab={pt}
        setPricingTab={setPt}
        formatPrices={DP}
        meterPrices={MP}
        pricingNotes={PRICING_NOTES}
        onOpenCalculator={oc}
      />

      {/* OUR T-SHIRTS */}
      <HomeTshirtsSection
        Reveal={A}
        items={HOMEPAGE_TSHIRT_SHOWCASE_ITEMS}
        CardComponent={MainTshirtCard}
        onOpenItem={(selectedItem) => {
          setInitialTextileProduct(selectedItem || null);
          navigateToPage("textile_tshirts");
        }}
        onOpenCatalog={() => navigateToPage("textile_tshirts")}
        onOpenConstructor={goConstructor}
      />

      {/* REVIEWS */}
      <ReviewsSection Reveal={A} reviews={RV} reviewData={reviewData} />

      {/* CONTACT */}
      <ContactSection Reveal={A} />

      <div className="mobile-only mobile-quick-actions">
        <a href="tel:+79500003464">Позвонить</a>
        <MessengerPicker label="Написать" className="mobile-quick-accent" />
        <button type="button" onClick={oc} className="mobile-quick-primary">Расчёт</button>
      </div>
      <div className="mobile-bottom-spacer" />

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "32px 5%", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, position: "relative" }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "linear-gradient(135deg,#d4a0c0,#8a3a6a)", position: "absolute", top: 2, left: 0 }} /><div style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg,#e84393,#c0247a)", position: "absolute", top: 1, left: 6 }} /><div style={{ width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#3d2e7c)", position: "absolute", top: 4, left: 14 }} /></div>
          <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: 3 }}>FUTURE STUDIO</span>
        </div>
        <p style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.2)" }}>© 2026 Future Studio • СПб, пр. Авиаконструкторов, 5к2</p>
      </footer>
    </div>
  );
}

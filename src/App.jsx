import { lazy, Suspense, useState, useEffect, useRef } from "react";

const PortfolioPage = lazy(() => import("./portfolio/PortfolioCatalogPage.jsx"));

/* ══════════════════════════════════════════
   CONSTANTS & PRICING
   ══════════════════════════════════════════ */
const BED_W = 58;
const GAP = 0.5;
const MAX_CALC_ITEMS = 40;
const ORIENTATION_EXHAUSTIVE_LIMIT = 12;
const LAYOUT_PREVIEW_HEIGHT = 160;
const LAYOUT_SCROLL_MAX_HEIGHT = "min(72vh, 820px)";

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

/* Format-based pricing for small orders (≤15 pcs, with application) */
const FORMAT_PRICES = [
  { name: "A6", short: 10, long: 15, price: 250 },
  { name: "A5", short: 15, long: 20, price: 290 },
  { name: "A4", short: 20, long: 30, price: 350 },
  { name: "A3", short: 30, long: 42, price: 450 },
  { name: "A3+", short: 35, long: 48, price: 650 },
  { name: "A3++", short: 40, long: 50, price: 800 },
];

function getFormat(w, h) {
  const small = Math.min(w, h);
  const big = Math.max(w, h);
  for (const f of FORMAT_PRICES) {
    if (small <= f.short && big <= f.long) return f;
  }
  return null; // too large for format pricing
}

/* ══════════════════════════════════════════
   SKYLINE BIN PACKING
   ──────────────────────────────────────────
   RULE: All copies of the same print type
   share ONE fixed orientation (H or V).
   Different types are independent.
   For small sets we try all orientation combos.
   For large sets we switch to a heuristic search
   so the calculator stays responsive.
   ══════════════════════════════════════════ */

// Core skyline packer — places rects with FIXED w/h (no rotation)
function skylinePack(rects) {
  if (rects.length === 0) return { length: 0, placements: [] };

  // Sort by area desc, then max-side desc
  const sorted = [...rects].sort((a, b) => {
    const da = b.w * b.h - a.w * a.h;
    if (da !== 0) return da;
    return Math.max(b.w, b.h) - Math.max(a.w, a.h);
  });

  let skyline = [{ x: 0, y: 0, w: BED_W }];
  const placements = [];

  for (const rect of sorted) {
    if (rect.w > BED_W + 0.001) continue; // can't fit

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

    // Update skyline
    const nY = bestPos.y + rect.h + GAP;
    const nX = bestPos.x;
    const nR = bestPos.x + rect.w + GAP;

    const ns = [];
    for (const seg of skyline) {
      const sR = seg.x + seg.w;
      if (sR <= nX + 0.001) { ns.push(seg); continue; }
      if (seg.x >= nR - 0.001) { ns.push(seg); continue; }
      if (seg.x < nX - 0.001) ns.push({ x: seg.x, y: seg.y, w: nX - seg.x });
      if (sR > nR + 0.001) ns.push({ x: nR, y: seg.y, w: sR - nR });
    }
    ns.push({ x: nX, y: nY, w: Math.min(nR, BED_W) - nX });
    ns.sort((a, b) => a.x - b.x);

    const mg = [ns[0]];
    for (let i = 1; i < ns.length; i++) {
      const p = mg[mg.length - 1], c = ns[i];
      if (Math.abs(p.x + p.w - c.x) < 0.01 && Math.abs(p.y - c.y) < 0.01) p.w += c.w;
      else mg.push(c);
    }
    skyline = mg;
  }

  let totalLength = 0;
  for (const p of placements) totalLength = Math.max(totalLength, p.y + p.h);
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

// Main entry: exact search for small sets, heuristic for large ones
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
    buildOrientationSeed(items, meta, (it) => it.h < it.w),
    buildOrientationSeed(items, meta, (it) => it.h > it.w),
    buildOrientationSeed(items, meta, (it) => it.w < it.h),
    buildOrientationSeed(items, meta, (it) => it.w > it.h),
    buildOrientationSeed(items, meta, (it) => estimateTypeLength(it.h, it.w, it.qty) < estimateTypeLength(it.w, it.h, it.qty)),
  ];

  let bestResult = null;
  const seen = new Set();

  for (const seed of seeds) {
    const key = seed.join("");
    if (seen.has(key)) continue;
    seen.add(key);

    const result = optimizeOrientationSeed(items, meta, seed);
    if (bestResult === null || result.length < bestResult.length - 0.001) {
      bestResult = result;
    }
  }

  return bestResult || skylinePack(buildRectsForOrientations(items, buildOrientationSeed(items, meta, () => 0)));
}

/* ══════════════════════════════════════════ */
const COLORS = [
  "rgba(232,67,147,0.55)", "rgba(108,92,231,0.55)", "rgba(0,206,209,0.55)",
  "rgba(253,203,110,0.55)", "rgba(85,239,196,0.55)", "rgba(255,118,117,0.55)",
];

const STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Outfit',sans-serif;line-height:1.5;text-align:left;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
a{color:inherit}
::selection{background:#e84393;color:#fff}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#111}
::-webkit-scrollbar-thumb{background:linear-gradient(#e84393,#6c5ce7);border-radius:3px}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes sheetIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
.hidden{display:none}
.flex{display:flex}
.flex-wrap{flex-wrap:wrap}
.justify-center{justify-content:center}
.text-center{text-align:center}
.mt-8{margin-top:2rem}
.mt-10{margin-top:2.5rem}
.mt-20{margin-top:5rem}
.mb-12{margin-bottom:3rem}
.mb-16{margin-bottom:4rem}
.gap-4{gap:1rem}
.gap-12{gap:3rem}
.flex\\!{display:flex!important}
.mobile-only{display:none}
.mobile-bottom-spacer{display:none}
.field-row{display:flex;align-items:center;gap:14px}
.field-row-label{width:92px;min-width:92px}
.field-row-content{flex:1;min-width:0}
.field-value{text-align:right;margin-left:auto}
.mobile-quick-actions{display:none;position:fixed;left:16px;right:16px;bottom:16px;z-index:120;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mobile-quick-actions a,.mobile-quick-actions button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:12px 10px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(12,12,18,.92);backdrop-filter:blur(16px);color:#f0eef5;text-decoration:none;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.24)}
.mobile-quick-actions button{cursor:pointer}
.mobile-quick-primary{background:linear-gradient(135deg,#e84393,#6c5ce7)!important;border:none!important;color:#fff!important}
.mobile-quick-accent{background:linear-gradient(135deg,#0088cc,#6c5ce7)!important;border:none!important;color:#fff!important}
@media(min-width:768px){.md\\:flex{display:flex!important}.md\\:hidden\\!{display:none!important}}
@media(max-width:1180px){.nav-left{gap:16px!important}.nav-main{gap:18px!important;margin-left:24px!important}.nav-contacts{gap:10px!important;padding:8px 12px!important}.nav-contacts-stack a:first-child{font-size:13px!important}.nav-contacts-stack a:last-child{font-size:11px!important}.nav-social-btn{width:34px!important;height:34px!important}.nav-calc-btn{padding:8px 16px!important}}
@media(max-width:1040px){.nav-main{gap:14px!important}.nav-contacts-stack{display:none!important}}
.nav-left{display:flex;align-items:center;gap:24px;flex-shrink:0}
.nav-desktop-calc{display:inline-flex}
.nav-desktop-main{display:flex}
.nav-main{justify-content:flex-end;flex:1;margin-left:44px}
.nav-contacts{justify-content:center;padding:10px 14px;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)}
.nav-socials{display:flex;align-items:center;justify-content:center;gap:8px}
.mobile-nav-trigger{width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:none;align-items:center;justify-content:center;color:#f0eef5;cursor:pointer;backdrop-filter:blur(16px);box-shadow:0 10px 28px rgba(0,0,0,.18)}
.mobile-nav-overlay{position:fixed;inset:0;z-index:140;background:rgba(6,6,10,.62);backdrop-filter:blur(10px);display:flex;justify-content:flex-end;padding:12px}
.mobile-nav-sheet{width:min(340px,100%);height:100%;border-radius:28px;background:linear-gradient(180deg,rgba(18,18,28,.98),rgba(10,10,16,.98));border:1px solid rgba(255,255,255,.08);box-shadow:0 28px 80px rgba(0,0,0,.42);padding:20px 18px 24px;display:flex;flex-direction:column;gap:18px;overflow:auto;animation:sheetIn .28s cubic-bezier(.16,1,.3,1)}
.mobile-nav-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.mobile-nav-eyebrow{font-size:11px;font-weight:500;letter-spacing:2px;color:#6c5ce7;text-transform:uppercase}
.mobile-nav-title{font-size:24px;font-weight:500;margin-top:6px}
.mobile-nav-subtitle{font-size:13px;font-weight:300;color:rgba(240,238,245,.5);margin-top:6px;line-height:1.55}
.mobile-nav-close{width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:inline-flex;align-items:center;justify-content:center;color:#f0eef5;cursor:pointer;font-family:'Outfit',sans-serif;font-size:22px;flex-shrink:0}
.mobile-nav-group{display:flex;flex-direction:column;gap:8px}
.mobile-nav-link{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:#f0eef5;cursor:pointer;text-align:left;font-family:'Outfit',sans-serif;font-size:15px;font-weight:400}
.mobile-nav-link-active{border-color:rgba(232,67,147,.24);background:linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12));color:#fff}
.mobile-nav-section-title{font-size:11px;font-weight:500;letter-spacing:2px;color:rgba(240,238,245,.34);text-transform:uppercase;padding:0 4px}
.mobile-nav-submenu{display:flex;flex-direction:column;gap:8px;padding-left:10px}
.mobile-nav-submenu .mobile-nav-link{padding:12px 14px;font-size:14px}
.mobile-nav-meta{display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.mobile-nav-meta a{text-decoration:none}
.mobile-nav-socials{display:flex;gap:10px}
.mobile-nav-socials a{width:42px;height:42px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.mobile-nav-actions{display:flex;flex-direction:column;gap:10px}
.mobile-nav-action{width:100%;justify-content:center}
.desktop-pricing-table{display:block}
.mobile-pricing-list{display:none}
.mobile-pricing-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03)}
.mobile-pricing-meta{min-width:0}
.mobile-pricing-price{flex-shrink:0;text-align:right}
.mobile-pricing-note{display:none}
.bp{background:linear-gradient(135deg,#e84393,#6c5ce7);border:none;color:#fff;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:500;cursor:pointer;letter-spacing:1px;position:relative;overflow:hidden;transition:all .4s;font-family:'Outfit',sans-serif}
.bp:hover{transform:translateY(-2px);box-shadow:0 10px 40px rgba(232,67,147,.4)}
.bp::after{content:'';position:absolute;top:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:shimmer 3s infinite}
.bo{background:0 0;border:1.5px solid rgba(232,67,147,.5);color:#e84393;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:400;cursor:pointer;transition:all .4s;font-family:'Outfit',sans-serif}
.bo:hover{background:rgba(232,67,147,.1);border-color:#e84393;transform:translateY(-2px)}
.btg{background:linear-gradient(135deg,#0088cc,#6c5ce7);border:none;color:#fff;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:500;cursor:pointer;transition:all .4s;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:10px;text-decoration:none}
.btg:hover{transform:translateY(-2px);box-shadow:0 10px 40px rgba(0,136,204,.3)}
.bcalc{background:linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15));border:1.5px solid rgba(232,67,147,.3);color:#f0eef5;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:500;cursor:pointer;transition:all .4s;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:10px}
.bcalc:hover{transform:translateY(-2px);background:linear-gradient(135deg,rgba(232,67,147,.25),rgba(108,92,231,.25));box-shadow:0 10px 40px rgba(232,67,147,.2)}
.cg{background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:20px;transition:all .5s cubic-bezier(.16,1,.3,1)}
.cg:hover{background:rgba(255,255,255,.06);border-color:rgba(232,67,147,.2);transform:translateY(-6px)}
.cs{background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:20px}
.inf{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 20px;color:#f0eef5;font-size:15px;width:100%;outline:none;transition:all .3s;font-family:'Outfit',sans-serif}
.inf:focus{border-color:#e84393;box-shadow:0 0 20px rgba(232,67,147,.15)}
.inf::placeholder{color:rgba(240,238,245,.25)}
.nb{backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);isolation:isolate;transform:translateZ(0);backface-visibility:hidden}
.tb{padding:10px 24px;border-radius:50px;border:none;cursor:pointer;font-size:14px;font-weight:400;letter-spacing:.5px;transition:all .3s;font-family:'Outfit',sans-serif}
.ta{background:linear-gradient(135deg,#e84393,#6c5ce7);color:#fff}
.ti{background:rgba(255,255,255,.05);color:rgba(240,238,245,.5)}
.ti:hover{background:rgba(255,255,255,.08);color:rgba(240,238,245,.7)}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}
@media(max-width:860px){.cg2{grid-template-columns:1fr!important}}
@media(max-width:860px){
  .nav-desktop-calc,.nav-desktop-main{display:none!important}
  .section-shell{padding:80px 5%!important}
  .page-shell,.page-shell-narrow{padding-left:5%!important;padding-right:5%!important}
  .hero-shell{min-height:auto!important;padding:108px 5% 76px!important}
  .mobile-nav-trigger{display:inline-flex}
  .desktop-pricing-table{display:none!important}
  .mobile-pricing-list{display:grid!important;gap:8px!important}
  .mobile-pricing-note{display:block!important;margin-top:4px;font-size:10px;font-weight:400;color:rgba(240,238,245,.48);line-height:1.35}
  .hero-rating{flex-wrap:wrap!important;justify-content:center!important;padding:8px 16px!important}
  .hero-actions{width:100%!important;gap:10px!important;margin-top:28px!important}
  .hero-actions>*{flex:1 1 calc(50% - 10px)!important;justify-content:center!important}
  .hero-stats{width:100%!important;gap:18px!important;margin-top:42px!important}
  .textile-card-grid,.main-tshirt-grid,.reviews-grid,.contact-grid,.size-guide-grid,.constructor-shell,.constructor-two-grid{grid-template-columns:1fr!important}
  .constructor-preview{position:relative!important;top:auto!important}
  .constructor-meta-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .constructor-order-actions>*{flex:1 1 100%!important}
  .constructor-basket-row,.textile-order-line{flex-direction:column!important;align-items:flex-start!important}
  .constructor-basket-summary,.textile-order-summary{flex-direction:column!important;align-items:stretch!important}
  .textile-order-cards{justify-content:stretch!important;width:100%!important}
  .textile-order-cards>*{flex:1 1 100%!important;min-width:0!important}
  .gallery-thumb-grid{flex-wrap:nowrap!important;overflow-x:auto!important;padding-bottom:4px!important}
  .modal-shell{padding:16px!important}
  .modal-card{padding:18px!important}
  .scroll-tabs{overflow-x:auto!important;justify-content:flex-start!important;padding-bottom:4px!important;scrollbar-width:none}
  .scroll-tabs::-webkit-scrollbar{display:none}
  .pricing-table table{min-width:620px!important}
  .mobile-only{display:block}
  .mobile-quick-actions{display:grid}
  .mobile-bottom-spacer{display:block;height:92px}
}
@media(max-width:640px){
  .bp,.bo,.btg,.bcalc{padding:12px 20px!important;font-size:14px!important}
  .tb{padding:10px 16px!important;font-size:13px!important}
  .field-row{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}
  .field-row-label{width:auto!important;min-width:0!important}
  .field-row-content{width:100%!important}
  .field-value{text-align:left!important;margin-left:0!important}
  .main-card,.product-card,.review-card,.contact-card,.calc-panel,.constructor-panel{padding:22px!important}
  .main-card-header,.product-card-header,.constructor-top,.constructor-basket-summary{flex-direction:column!important;align-items:flex-start!important}
  .price-pill{align-self:flex-start!important}
  .hero-title{font-size:clamp(32px,9vw,46px)!important;letter-spacing:1px!important;line-height:1.16!important;margin-top:18px!important}
  .hero-subtitle{font-size:14px!important;margin-top:16px!important}
  .hero-actions>*{flex:1 1 100%!important}
  .hero-support{display:none!important}
  .hero-stats{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
  .calc-item-grid{grid-template-columns:1fr!important}
  .constructor-meta-grid{grid-template-columns:1fr!important}
  .qty-inline{width:100%!important;justify-content:space-between!important}
  .mobile-quick-actions{left:12px;right:12px;bottom:12px;gap:8px}
}
@media(max-width:480px){
  .page-shell,.page-shell-narrow{padding-left:16px!important;padding-right:16px!important}
  .section-shell{padding:72px 16px!important}
  .hero-shell{padding:96px 16px 64px!important}
  .nav-left{gap:12px!important}
  .hero-rating{width:100%!important}
  .pricing-table table{min-width:540px!important}
  .main-card,.product-card,.review-card,.contact-card,.constructor-panel,.calc-panel{padding:20px!important}
  .textile-card-grid,.main-tshirt-grid,.reviews-grid,.contact-grid{gap:18px!important}
}
`;

/* Shared components */
function LogoMini() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, position: "relative" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#d4a0c0,#8a3a6a)", position: "absolute", top: 4, left: 0 }} />
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#e84393,#c0247a)", position: "absolute", top: 2, left: 9 }} />
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#3d2e7c)", position: "absolute", top: 6, left: 20 }} />
      </div>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3 }}>FUTURE</span>
    </div>
  );
}
function LogoFull() {
  return <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8IS0tIENyZWF0b3I6IENvcmVsRFJBVyAtLT4NCjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iMzE2LjA4OW1tIiBoZWlnaHQ9IjIzMS40MjJtbSIgdmVyc2lvbj0iMS4xIiBzaGFwZS1yZW5kZXJpbmc9Imdlb21ldHJpY1ByZWNpc2lvbiIgdGV4dC1yZW5kZXJpbmc9Imdlb21ldHJpY1ByZWNpc2lvbiIgaW1hZ2UtcmVuZGVyaW5nPSJvcHRpbWl6ZVF1YWxpdHkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIg0Kdmlld0JveD0iMCAwIDMxNjAuODkgMjMxNC4yMjIiDQogeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiDQogeG1sbnM6eG9kbT0iaHR0cDovL3d3dy5jb3JlbC5jb20vY29yZWxkcmF3L29kbS8yMDAzIj4NCiA8ZGVmcz4NCiAgIDxtYXNrIGlkPSJpZDAiPg0KICAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImlkMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxNzg1LjU1NyIgeTE9IjEwNjguNzMiIHgyPSIyMzQ2LjQ2NyIgeTI9IjEwNjguNzMiPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLW9wYWNpdHk9IjAiIHN0b3AtY29sb3I9IndoaXRlIi8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAuMzg4MjM1IiBzdG9wLW9wYWNpdHk9IjAuNTAxOTYxIiBzdG9wLWNvbG9yPSJ3aGl0ZSIvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLW9wYWNpdHk9IjEiIHN0b3AtY29sb3I9IndoaXRlIi8+DQogICAgIDwvbGluZWFyR3JhZGllbnQ+DQogICAgPHJlY3QgZmlsbD0idXJsKCNpZDEpIiB4PSIxNzg1LjU1NyIgeT0iODAwLjY4NSIgd2lkdGg9IjU2MC45MSIgaGVpZ2h0PSI1MzYuMDkxIi8+DQogICA8L21hc2s+DQogICA8bWFzayBpZD0iaWQyIj4NCiAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJpZDMiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iMTIzNi43NzYiIHkxPSIxMDU3Ljc4OSIgeDI9IjIwMzQuMDU0IiB5Mj0iMTA1Ny43ODkiPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLW9wYWNpdHk9IjAiIHN0b3AtY29sb3I9IndoaXRlIi8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAuMzg4MjM1IiBzdG9wLW9wYWNpdHk9IjAuNTAxOTYxIiBzdG9wLWNvbG9yPSJ3aGl0ZSIvPg0KICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLW9wYWNpdHk9IjEiIHN0b3AtY29sb3I9IndoaXRlIi8+DQogICAgIDwvbGluZWFyR3JhZGllbnQ+DQogICAgPHJlY3QgZmlsbD0idXJsKCNpZDMpIiB4PSIxMjM2Ljc3NiIgeT0iNjc2Ljc4OSIgd2lkdGg9Ijc5Ny4yNzgiIGhlaWdodD0iNzYyIi8+DQogICA8L21hc2s+DQogICA8bWFzayBpZD0iaWQ0Ij4NCiAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJpZDUiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iOTA2LjI0OCIgeTE9IjEwNjYuNTAxIiB4Mj0iMTQ2Ny42NjYiIHkyPSIxMDY2LjUwMSI+DQogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3Atb3BhY2l0eT0iMCIgc3RvcC1jb2xvcj0id2hpdGUiLz4NCiAgICAgIDxzdG9wIG9mZnNldD0iMC4zODgyMzUiIHN0b3Atb3BhY2l0eT0iMC41MDE5NjEiIHN0b3AtY29sb3I9IndoaXRlIi8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3Atb3BhY2l0eT0iMSIgc3RvcC1jb2xvcj0id2hpdGUiLz4NCiAgICAgPC9saW5lYXJHcmFkaWVudD4NCiAgICA8cmVjdCBmaWxsPSJ1cmwoI2lkNSkiIHg9IjkwNi4yNDgiIHk9Ijc5OC4yMTMiIHdpZHRoPSI1NjEuNDE4IiBoZWlnaHQ9IjUzNi41NzYiLz4NCiAgIDwvbWFzaz4NCiA8L2RlZnM+DQogPGcgaWQ9ItCh0LvQvtC5X3gwMDIwXzEiPg0KICA8bWV0YWRhdGEgaWQ9IkNvcmVsQ29ycElEXzBDb3JlbC1MYXllciIvPg0KICA8cGF0aCBmaWxsPSIjNTYzRThFIiBtYXNrPSJ1cmwoI2lkMCkiIGQ9Ik0yMDY2LjAxMiA4MDAuNjg1YzE1NC44OTEsMCAyODAuNDU1LDEyMC4wMDggMjgwLjQ1NSwyNjguMDQ1IDAsMTQ4LjAzNyAtMTI1LjU2NCwyNjguMDQ2IC0yODAuNDU1LDI2OC4wNDYgLTE1NC44OTEsMCAtMjgwLjQ1NSwtMTIwLjAwOSAtMjgwLjQ1NSwtMjY4LjA0NiAwLC0xNDguMDM3IDEyNS41NjQsLTI2OC4wNDUgMjgwLjQ1NSwtMjY4LjA0NXoiLz4NCiAgPHBhdGggZmlsbD0iI0UyMzE4OSIgbWFzaz0idXJsKCNpZDIpIiBkPSJNMTYzNS40MTUgNjc2Ljc4OWMyMjAuMTYyLDAgMzk4LjYzOSwxNzAuNTggMzk4LjYzOSwzODEgMCwyMTAuNDIgLTE3OC40NzcsMzgxIC0zOTguNjM5LDM4MSAtMjIwLjE2MiwwIC0zOTguNjM5LC0xNzAuNTggLTM5OC42MzksLTM4MSAwLC0yMTAuNDIgMTc4LjQ3NywtMzgxIDM5OC42MzksLTM4MXoiLz4NCiAgPHBhdGggZmlsbD0iI0U3ODNCMyIgbWFzaz0idXJsKCNpZDQpIiBkPSJNMTE4Ni45NTcgNzk4LjIxM2MxNTUuMDMxLDAgMjgwLjcwOSwxMjAuMTE3IDI4MC43MDksMjY4LjI4OCAwLDE0OC4xNzEgLTEyNS42NzgsMjY4LjI4OCAtMjgwLjcwOSwyNjguMjg4IC0xNTUuMDMxLDAgLTI4MC43MDksLTEyMC4xMTcgLTI4MC43MDksLTI2OC4yODggMCwtMTQ4LjE3MSAxMjUuNjc4LC0yNjguMjg4IDI4MC43MDksLTI2OC4yODh6Ii8+DQogIDxwYXRoIGZpbGw9IiNGRUZFRkUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTY0MC4zMTQgMTE3Ni4zMjhsNjAuNTgzIC0yMjUuNzM5YzIuMTc0LC04LjYyNyA3Ljc3MSwtMTIuOTA3IDE2Ljc5MywtMTIuOTA3bDEwMS42NzUgMGM4LjQyOSwwIDEyLjcwOSw0LjIxNSAxMi43MDksMTIuNjQ0IDAsOC40MjkgLTQuMjgsMTIuNjQzIC0xMi43NzUsMTIuNjQzbC05NS41NTEgMCAtMjAuNTQ2IDc2LjY1MSA4OC45IDBjOC40OTUsMCAxMi43NzUsNC4yMTUgMTIuNzc1LDEyLjY0NCAwLDguNDI5IC00LjI4LDEyLjY0MyAtMTIuNzc1LDEyLjY0M2wtOTUuNjgzIDAgLTMxLjc0IDExOC4xMzhjLTEuNzc4LDYuMzIyIC01Ljc5NSw5LjQ4MyAtMTIuMTE3LDkuNDgzIC0zLjI5MiwwIC02LjI1NiwtMS4yNTEgLTguODksLTMuNzU0IC0yLjYzNCwtMi41MDIgLTMuOTUxLC01LjM5OSAtMy45NTEsLTguNjI2IDAsLTEuMTIgMC4xOTgsLTIuNDM3IDAuNTkzLC0zLjgyem01MTcuODA1IC02MC4xODhjLTYuNDU0LDIzLjc3MyAtMTguNTcsNDIuNDc0IC0zNi40ODIsNTYuMDQgLTE3Ljg0NiwxMy41NjUgLTM4Ljk4NCwyMC4zNDggLTYzLjI4MywyMC4zNDggLTE1LjY3MywwIC0yOS43LC02Ljc4MyAtNDIuMDgsLTIwLjI4MiAtMTEuOTE5LC0xMy4xMDUgLTE3LjkxMSwtMjcuNjU4IC0xNy45MTEsLTQzLjU5NCAwLC00LjQ3OCAwLjUyNiwtOC42OTMgMS41MTQsLTEyLjUxMmw0NS4zNzIgLTE2OC44NDRjMS42NDYsLTYuMzg3IDUuNzI5LC05LjYxNCAxMi4xODMsLTkuNjE0IDguNDI5LDAgMTIuNzA5LDQuMjE1IDEyLjcwOSwxMi42NDQgMCwxLjU4IC0wLjE5OCwyLjgzMSAtMC41MjcsMy42ODdsLTQzLjUyOCAxNjIuMDYxYy0xLjExOSw0LjQxMiAtMS42NDYsOC40MjkgLTEuNjQ2LDEyLjE4MyAwLDExLjUyNCAzLjg4NSwyMC44NzUgMTEuNzIyLDI4LjExOCA3Ljc3LDcuMjQ0IDE3LjQ1LDEwLjg2NiAyOS4wNCwxMC44NjYgMTQuMzU2LDAgMjguMTE5LC01LjAwNSA0MS4yODksLTE1LjA4IDEzLjIzNiwtMTAuMDc1IDIxLjY2NSwtMjIuMDYgMjUuNDE5LC0zNi4wMjFsNDUuMjQgLTE2OC43NzhjMS42NDYsLTYuNDUzIDUuNjYzLC05LjY4IDEyLjA1MSwtOS42OCA4LjQ5NSwwIDEyLjcwOSw0LjIxNSAxMi43MDksMTIuNTc4IDAsMS41MTQgLTAuMTMyLDIuNzY1IC0wLjM5NSwzLjYyMmwtNDMuMzk2IDE2Mi4yNTh6bTMxNS42NCAtMTUzLjE3MWwtNTguOTM3IDIyMC4wNzZjLTEuNjQ2LDYuMzIyIC01LjY2Myw5LjQ4MyAtMTIuMDUxLDkuNDgzIC0zLjIyNywwIC02LjE5LC0xLjI1MSAtOC44MjQsLTMuNzU0IC0yLjcsLTIuNTAyIC00LjA4MywtNS4zOTkgLTQuMDgzLC04LjYyNiAwLC0xLjEyIDAuMTk4LC0yLjQzNyAwLjU5MywtMy44Mmw1Ny4wOTMgLTIxMy4zNTkgLTQ5LjM4OSAwYy04LjQ5NCwwIC0xMi43MDksLTQuMjE0IC0xMi43MDksLTEyLjY0MyAwLC04LjQyOSA0LjIxNSwtMTIuNjQ0IDEyLjcwOSwtMTIuNjQ0bDEzMS45NjcgMGM4LjQ5NSwwIDEyLjc3NSw0LjIxNSAxMi43NzUsMTIuNjQ0IDAsOC40MjkgLTQuMjgsMTIuNjQzIC0xMi43NzUsMTIuNjQzbC01Ni4zNjkgMHptNDEyLjcwNiAxNTMuMTcxYy02LjQ1NCwyMy43NzMgLTE4LjU3LDQyLjQ3NCAtMzYuNDgyLDU2LjA0IC0xNy44NDYsMTMuNTY1IC0zOC45ODQsMjAuMzQ4IC02My4yODMsMjAuMzQ4IC0xNS42NzMsMCAtMjkuNywtNi43ODMgLTQyLjA4LC0yMC4yODIgLTExLjkxOSwtMTMuMTA1IC0xNy45MTEsLTI3LjY1OCAtMTcuOTExLC00My41OTQgMCwtNC40NzggMC41MjYsLTguNjkzIDEuNTE0LC0xMi41MTJsNDUuMzcyIC0xNjguODQ0YzEuNjQ2LC02LjM4NyA1LjcyOSwtOS42MTQgMTIuMTgzLC05LjYxNCA4LjQyOSwwIDEyLjcwOSw0LjIxNSAxMi43MDksMTIuNjQ0IDAsMS41OCAtMC4xOTgsMi44MzEgLTAuNTI3LDMuNjg3bC00My41MjggMTYyLjA2MWMtMS4xMTksNC40MTIgLTEuNjQ2LDguNDI5IC0xLjY0NiwxMi4xODMgMCwxMS41MjQgMy44ODUsMjAuODc1IDExLjcyMiwyOC4xMTggNy43Nyw3LjI0NCAxNy40NSwxMC44NjYgMjkuMDQsMTAuODY2IDE0LjM1NiwwIDI4LjExOSwtNS4wMDUgNDEuMjg5LC0xNS4wOCAxMy4yMzYsLTEwLjA3NSAyMS42NjUsLTIyLjA2IDI1LjQxOSwtMzYuMDIxbDQ1LjI0IC0xNjguNzc4YzEuNjQ2LC02LjQ1MyA1LjY2MywtOS42OCAxMi4wNTEsLTkuNjggOC40OTUsMCAxMi43MDksNC4yMTUgMTIuNzA5LDEyLjU3OCAwLDEuNTE0IC0wLjEzMiwyLjc2NSAtMC4zOTUsMy42MjJsLTQzLjM5NiAxNjIuMjU4em0zMzguMjkzIC0yOS45NjJsMjIuNzg1IDkwLjU0NmMwLjI2MywwLjk4NyAwLjM5NSwyLjA0MSAwLjM5NSwzLjA5NSAwLDguNDk0IC00LjI4LDEyLjcwOSAtMTIuNzc1LDEyLjcwOSAtNi41ODUsMCAtMTAuNjY4LC0zLjIyNyAtMTIuMTgzLC05Ljc0NmwtMjMuMjQ2IC05Mi4yNThjLTEuMjUxLDAuMDY2IC0zLjQyNCwwLjA2NiAtNi4zODcsMC4wNjZsLTUzLjA3NyAwIC0yNC44MjYgOTIuNDU1Yy0xLjc3OCw2LjMyMiAtNS43OTUsOS40ODMgLTEyLjExNiw5LjQ4MyAtMy4yOTMsMCAtNi4yNTYsLTEuMjUxIC04Ljg5LC0zLjc1NCAtMi42MzQsLTIuNTAyIC0zLjk1MSwtNS4zOTkgLTMuOTUxLC04LjYyNiAwLC0xLjEyIDAuMTk3LC0yLjQzNyAwLjU5MiwtMy44Mmw2MC41ODQgLTIyNS43MzljMi4xNzMsLTguNjI3IDcuNzcsLTEyLjkwNyAxNi43OTIsLTEyLjkwN2w2NS45MTcgMGMyMS42LDAgMzguNzg3LDExLjEyOSA1MS40OTYsMzMuMzg3IDUuNjY0LDkuOTQzIDguNDk1LDIwLjAxOSA4LjQ5NSwzMC4yOTIgMCw0LjgwNyAtMC41MjYsOS4wMjEgLTEuNTE0LDEyLjc3NSAtNi43MTcsMjQuNDMxIC0xOS4yMjksNDMuNDYyIC0zNy42MDIsNTYuOTYyIC05LjAyMSw2LjcxNiAtMTkuMTYyLDExLjcyMSAtMzAuNDg5LDE1LjA4em0tMjQuNzYgLTIwLjg3NWMxOS43NTUsMCAzNy4yMDYsLTguNjI3IDUyLjQxOCwtMjUuOTQ2IDEwLjYwMiwtMTIuMDUxIDE1Ljg3LC0yNC42MjggMTUuODcsLTM3Ljc5OSAwLC0xNS4xNDYgLTYuNzE3LC0yNi4zNCAtMjAuMDg1LC0zMy41ODQgLTYuNDUzLC0zLjM1OSAtMTMuNDMzLC01LjAwNSAtMjAuODc1LC01LjAwNWwtNTIuODEzIDAgLTI3LjQ2IDEwMi4zMzQgNTIuOTQ1IDB6bTM4Ny4wODkgLTAuMzk2bC02OS40NzMgMCAtMjcuNDYgMTAyLjMzNCA4OS4wMzEgMGM4LjQ5NSwwIDEyLjc3NSw0LjIxNCAxMi43NzUsMTIuNjQzIDAsOC40MjkgLTQuMjE0LDEyLjY0NCAtMTIuNzA5LDEyLjY0NGwtMTA4Ljg1MyAwYy0zLjY4OCwwIC02LjUxOSwtMS4yNTEgLTguNDk1LC0zLjc1NCAtMS45MDksLTIuNTAyIC0yLjM3LC01LjUzMSAtMS4zMTcsLTguOTU1bDYxLjU3MiAtMjI5LjIzYzIuMTczLC04LjYyNyA3Ljc3LC0xMi45MDcgMTYuNzkyLC0xMi45MDdsMTAxLjYwOSAwYzguNDk1LDAgMTIuNzc1LDQuMjE1IDEyLjc3NSwxMi42NDQgMCw4LjQyOSAtNC4yOCwxMi42NDMgLTEyLjc3NSwxMi42NDNsLTk1LjU1MSAwIC0yMC42MTIgNzYuNjUxIDYyLjY5MSAwYzguNTYxLDAgMTIuNzc1LDQuMjE1IDEyLjc3NSwxMi42NDQgMCw4LjQyOSAtNC4yMTQsMTIuNjQzIC0xMi43NzUsMTIuNjQzeiIvPg0KICA8cGF0aCBmaWxsPSIjRkRGREZDIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMjkzLjA1NCAxNjA5LjE5N2M1LjE4NiwwIDEwLjE0OSwwLjg4OSAxNC44OSwyLjY2NyA0Ljc0MiwxLjc3OCA4Ljk2NSw0LjI2IDEyLjY2OSw3LjQ0NiAzLjcwNCwzLjE4NSA2Ljc0MSw2LjkyNiA5LjExMiwxMS4yMjMgMy43MDQsNi4zNzEgNS41NTYsMTMuMzM1IDUuNTU2LDIwLjg5MiAwLDcuNTU2IC0xLjg1MiwxNC41NTcgLTUuNTU2LDIxLjAwMiAtMy43MDQsNi40NDUgLTguODE2LDExLjU5NCAtMTUuMzM1LDE1LjQ0NyAtNi41MiwzLjg1MiAtMTMuNjMyLDUuNzc4IC0yMS4zMzYsNS43NzhsLTQ2LjAwNiAwYy03LjcwNCwwIC0xNC44MTYsLTEuOTI2IC0yMS4zMzYsLTUuNzc4IC02LjUxOSwtMy44NTMgLTExLjYzMSwtOS4wMzkgLTE1LjMzNSwtMTUuNTU4IC0zLjU1NiwtNi4wNzUgLTUuNDA4LC0xMi42NjggLTUuNTU2LC0xOS43OGwyMS4zMzYgMGMwLDEuNzc4IDAuMjk2LDMuNTE5IDAuODg5LDUuMjIzIDAuNTkzLDEuNzA0IDEuMzMzLDMuMjk2IDIuMjIyLDQuNzc4IDAuODg5LDEuNDgyIDIuMDAxLDIuODE1IDMuMzM0LDQuMDAxIDEuMzM0LDEuMTg1IDIuNzQxLDIuMjIyIDQuMjIzLDMuMTExIDEuNDgxLDAuODg5IDMuMTExLDEuNTU2IDQuODg5LDIgMS43NzgsMC40NDUgMy41NTYsMC42NjcgNS4zMzQsMC42NjdsNDYuMDA2IDBjNS43NzgsMCAxMC43MDUsLTIuMDM3IDE0Ljc3OSwtNi4xMTIgNC4wNzUsLTQuMDc0IDYuMTEyLC05LjAwMSA2LjExMiwtMTQuNzc5IDAsLTUuNzc5IC0yLjAzNywtMTAuNzA1IC02LjExMiwtMTQuNzggLTQuMDc0LC00LjA3NCAtOS4wMDEsLTYuMTEyIC0xNC43NzksLTYuMTEybC00Ni4wMDYgMGMtMTIuMDAxLDAgLTIyLjE1MSwtNC4yOTcgLTMwLjQ0OCwtMTIuODkgLTIuMzcxLC0yLjUxOSAtNC40NDUsLTUuMzM0IC02LjIyMywtOC40NDYgLTMuNzA0LC02LjUxOSAtNS41NTYsLTEzLjUyIC01LjU1NiwtMjEuMDAyIDAsLTcuNDgzIDEuODUyLC0xNC40NDYgNS41NTYsLTIwLjg5MiAzLjcwNCwtNi40NDUgOC44MTYsLTExLjYzMSAxNS4zMzUsLTE1LjU1NyA2LjUyLC0zLjkyNiAxMy42MzIsLTUuODkgMjEuMzM2LC01Ljg5bDQ0Ljg5NSAwYzAuMjk2LDAgMC42MjksMCAxLDAgMC4zNywwIDAuNzc4LDAgMS4yMjIsMCA0Ljg5LDAuMTQ5IDkuNjMxLDEuMTQ5IDE0LjIyNCwzLjAwMSA0LjU5MywxLjg1MiA4LjcwNSw0LjMzNCAxMi4zMzUsNy40NDUgMy42MywzLjExMiA2LjYzLDYuNzQyIDkuMDAxLDEwLjg5IDMuNTU2LDYuMjIzIDUuNDA4LDEyLjg5MSA1LjU1NiwyMC4wMDNsLTIxLjMzNiAwYy0wLjI5NiwtNS40ODIgLTIuMzcsLTEwLjExMyAtNi4yMjMsLTEzLjg5MSAtMy44NTIsLTMuNzc4IC04LjUxOSwtNS44MTUgLTE0LjAwMSwtNi4xMTJsLTQ2LjY3MyAwYy01Ljc3OCwwIC0xMC43NDIsMi4wNzUgLTE0Ljg5LDYuMjIzIC00LjE0OSw0LjE0OSAtNi4yMjMsOS4xMTIgLTYuMjIzLDE0Ljg5MSAwLDMuNTU2IDAuODUyLDYuODUzIDIuNTU1LDkuODkgMS43MDQsMy4wMzcgNC4wMDEsNS41MTkgNi44OSw3LjQ0NSAyLjg4OSwxLjkyNyA2LjAzOCwzLjAzOCA5LjQ0NiwzLjMzNCAwLjg4OSwwIDEuNjMsMCAyLjIyMiwwIDEuMTg2LDAgMi40NDUsMC4wNzQgMy43NzgsMC4yMjJsNDIuMjI4IDB6bTE1OC4zMyA4NC40NTVsLTIxLjMzNiAwIDAgLTExNS41NjkgMjEuMzM2IDAgMCAxMTUuNTY5em01Ni4yMjkgLTEyNi4yMzdsLTEzMS41NzEgMCAwIC0yMS4zMzYgMTMxLjU3MSAwIDAgMjEuMzM2em0xNTAuOTk2IC0yMS41NTlsMjEuMzM2IDAgMCA5NC4wMTJjMCwxMS43MDUgLTMuOTI2LDIxLjc4IC0xMS43NzksMzAuMjI2IC0yLjk2MywzLjExMSAtNi4xNDksNiAtOS41NTcsOC42NjcgLTEzLjE4Niw5LjkyNyAtMjguMDAzLDE0Ljg5MSAtNDQuNDQ5LDE0Ljg5MSAtMTYuNTk1LDAgLTMxLjQ4NiwtNC45NjQgLTQ0LjY3MiwtMTQuODkxIC0zLjQwOCwtMi42NjcgLTYuNTk0LC01LjYzIC05LjU1NywtOC44OSAtNy43MDUsLTguMjk3IC0xMS41NTcsLTE4LjI5OCAtMTEuNTU3LC0zMC4wMDNsMCAtOTQuMDEyIDIxLjExNCAwIDAgODEuNTY2YzAsMTIuMTQ5IDQuMTg1LDIyLjU5NSAxMi41NTcsMzEuMzM3IDguMzcxLDguNzQyIDE4LjU1NywxMy4yNjEgMzAuNTU5LDEzLjU1NyAwLjQ0NCwwIDAuOTYzLDAgMS41NTYsMCAwLjQ0NCwwIDAuOTYzLDAgMS41NTUsMCAxMi4wMDIsLTAuMjk2IDIyLjE1MSwtNC44MTUgMzAuNDQ5LC0xMy41NTcgOC4yOTcsLTguNzQyIDEyLjQ0NSwtMTkuMTg4IDEyLjQ0NSwtMzEuMzM3bDAgLTgxLjU2NnptMTk0LjMzNSA2My43ODZjMC40NDUsMy40MDggMC42NjcsNi44OSAwLjY2NywxMC40NDYgMCwzLjcwNCAtMC4yOTYsNy4zMzQgLTAuODg5LDEwLjg5IC0xLjQ4MiwxMC44MTYgLTUuMjIzLDIwLjc0MyAtMTEuMjI0LDI5Ljc4MSAtNiw5LjAzOCAtMTMuNTk0LDE2LjQ0NyAtMjIuNzgsMjIuMjI1IC05LjE4Nyw1Ljc3OSAtMTkuMjYyLDkuMzM1IC0zMC4yMjYsMTAuNjY4bC02Ny43ODYgMCAwIC0xMTUuNTY5IDIxLjExNCAwIDAgOTQuMjMzIDQ1LjMzOCAwYzEwLjk2NSwtMS40ODIgMjAuNDg0LC02LjAzOCAyOC41NTksLTEzLjY2OCA4LjA3NSwtNy42MzEgMTMuMjI0LC0xNi44NTQgMTUuNDQ3LC0yNy42NyAwLjc0MSwtMy41NTYgMS4xMTEsLTcuMTg2IDEuMTExLC0xMC44OSAwLC0zLjU1NiAtMC4zNywtNy4wMzggLTEuMTExLC0xMC40NDYgLTIuNTE5LC0xMy4wMzkgLTkuMTEzLC0yMy41NTkgLTE5Ljc4LC0zMS41NTkgLTguNzQyLC02LjY2OCAtMTguNTk1LC0xMC4yMjQgLTI5LjU2LC0xMC42NjhsLTYxLjExOCAwIDAgLTIxLjMzNiA1OS41NjMgMGMxMi4xNDksMC4xNDggMjMuNDg0LDMgMzQuMDA0LDguNTU2IDEwLjUyLDUuNTU2IDE5LjE1LDEzLjE4NyAyNS44OTIsMjIuODkyIDYuNzQxLDkuNzA1IDExLjAwMSwyMC40MSAxMi43NzksMzIuMTE1em00MS40MjggODQuMDFsMjEuMTE0IDAgMCAtMTQ4LjAxOCAtMjEuMTE0IDAgMCAxNDguMDE4em0yMC40NDcgLTE0Ny4xMjlsMCAxNDYuNDYyIC0xOS43OCAwIDAgLTE0Ni40NjIgMTkuNzggMHptLTIwLjQ0NyAtMC44ODlsMjEuMTE0IDAgMCAxNDguMDE4IC0yMS4xMTQgMCAwIC0xNDguMDE4em0xNzIuODg4IDM3LjAwNWMtMTAuMjk3LC0xMC4yOTggLTIyLjcwNiwtMTUuNDQ3IC0zNy4yMjYsLTE1LjQ0NyAtMTQuNTIxLDAgLTI2LjkzLDUuMTQ5IC0zNy4yMjcsMTUuNDQ3IC0xMC4yOTgsMTAuMjk3IC0xNS40NDYsMjIuNjY5IC0xNS40NDYsMzcuMTE1IDAsMTQuNDQ2IDUuMTQ4LDI2LjgxOCAxNS40NDYsMzcuMTE2IDEwLjI5NywxMC4yOTcgMjIuNzA2LDE1LjQ0NiAzNy4yMjcsMTUuNDQ2IDE0LjUyLDAgMjYuOTI5LC01LjE0OSAzNy4yMjYsLTE1LjQ0NiAxMC4yOTgsLTEwLjI5OCAxNS40NDcsLTIyLjY3IDE1LjQ0NywtMzcuMTE2IDAsLTE0LjQ0NiAtNS4xNDksLTI2LjgxOCAtMTUuNDQ3LC0zNy4xMTV6bS0xMTEuMDEzIDM3LjIyNmMwLC04LjE0OSAxLjIyMiwtMTUuOTY1IDMuNjY3LC0yMy40NDcgMi40NDUsLTcuNDgyIDUuOTY0LC0xNC4yNjEgMTAuNTU3LC0yMC4zMzYgNC41OTMsLTYuMDc1IDkuODksLTExLjM3MSAxNS44OTEsLTE1Ljg5MSA2LC00LjUxOSAxMi43NzksLTguMDM4IDIwLjMzNSwtMTAuNTU2IDcuNTU3LC0yLjUxOSAxNS4zMzYsLTMuNzc5IDIzLjMzNywtMy43NzkgMTMuMzM1LDAgMjUuNzA2LDMuMjk3IDM3LjExNSw5Ljg5IDExLjQwOSw2LjU5NCAyMC40MSwxNS41NTggMjcuMDAzLDI2Ljg5MyA2LjU5NCwxMS4zMzQgOS44OTEsMjMuNzA2IDkuODkxLDM3LjExNSAwLDEzLjQwOSAtMy4yOTcsMjUuNzgxIC05Ljg5MSwzNy4xMTYgLTYuNTkzLDExLjMzNCAtMTUuNTk0LDIwLjI5OSAtMjcuMDAzLDI2Ljg5MiAtMTEuNDA5LDYuNTkzIC0yMy43OCw5Ljg5IC0zNy4xMTUsOS44OSAtMTMuMzM1LDAgLTI1LjY3LC0zLjI5NyAtMzcuMDA1LC05Ljg5IC0xMS4zMzUsLTYuNTkzIC0yMC4yOTksLTE1LjU1OCAtMjYuODkyLC0yNi44OTIgLTYuNTkzLC0xMS4zMzUgLTkuODksLTIzLjY3IC05Ljg5LC0zNy4wMDV6Ii8+DQogPC9nPg0KPC9zdmc+DQo=" alt="Future Studio" draggable={false} style={{ width: "100%", maxWidth: 700, height: "auto", pointerEvents: "none", userSelect: "none", WebkitUserDrag: "none" }} />;
}
function Stars() { return <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(i => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#e84393"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}</div>; }
const TG = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-1.97 9.28c-.15.67-.54.83-1.09.52l-3.02-2.23-1.46 1.4c-.16.16-.3.3-.61.3l.22-3.06 5.57-5.03c.24-.22-.05-.34-.38-.13l-6.88 4.34-2.97-.93c-.64-.2-.66-.64.14-.95l11.6-4.47c.54-.2 1.01.13.83.95z" /></svg>;
const WA = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.56 0 .24 5.31.24 11.83c0 2.08.54 4.11 1.58 5.91L0 24l6.44-1.69a11.8 11.8 0 0 0 5.63 1.43h.01c6.52 0 11.84-5.31 11.84-11.83 0-3.16-1.23-6.13-3.4-8.43zM12.08 21.7h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.82 1 1.02-3.72-.24-.38a9.78 9.78 0 0 1-1.5-5.19c0-5.42 4.42-9.83 9.86-9.83 2.63 0 5.1 1.02 6.95 2.88a9.77 9.77 0 0 1 2.88 6.95c0 5.42-4.42 9.83-9.84 9.83zm5.39-7.35c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.8-1.67-2.1-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.48.71.31 1.27.5 1.7.64.71.22 1.36.19 1.87.11.57-.09 1.77-.72 2.02-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" /></svg>;
const CalcIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /></svg>;

function useInView(th = 0.15) {
  const ref = useRef(null); const [v, setV] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.unobserve(el); } }, { threshold: th }); o.observe(el); return () => o.disconnect(); }, [th]);
  return [ref, v];
}
function A({ children, className = "", delay = 0 }) {
  const [ref, v] = useInView();
  return <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(40px)", transition: `all .8s cubic-bezier(.16,1,.3,1) ${delay}s` }}>{children}</div>;
}

/* ══════════════════════════════════════════
   TEXTILE PAGES
   ══════════════════════════════════════════ */
const TEXTILE_DATA = {
  tshirts: {
    title: "Футболки",
    subtitle: "Для печати DTF",
    desc: "Широкий выбор футболок для нанесения DTF-принтов. Наши футболки создаются напрямую на фабрике по собственным лекалам, которые мы разрабатывали лично. Мы внимательно подошли к каждой детали: от кроя и посадки до выбора ткани и цвета. Всё для того, чтобы футболка идеально сидела, подходила разным типам фигуры, не сковывала движения и выглядела достойно в любой ситуации. Мы предлагаем качественный текстиль под любые задачи: от повседневной носки до брендинга и мерча.",
    items: [
      { name: "Футболка оверсайз", galleryModel: "oversize", sizes: "XS – 3XL", variants: [
        { label: "180 г/м²", material: "100% хлопок", colors: "Чёрный, Белый, Розовый, Тёмно-серый, Меланж", price: "800 ₽", desc: "Средней плотности футболка свободного кроя. Идеальна для ярких принтов. Не садится после стирки." },
        { label: "240 г/м²", material: "100% хлопок", colors: "Чёрный, Белый, Бежевый, Розовый", price: "1 000 ₽", desc: "Плотная футболка свободного кроя. Идеальна для ярких принтов. Не садится после стирки." },
      ] },
      { name: "Футболка классика", galleryModel: "classic", sizes: "XS – 3XL", variants: [
        { label: "180 г/м²", material: "100% хлопок", colors: "Чёрный, Белый", price: "650 ₽", desc: "Классический крой, мягкий хлопок. Отлично подходит для корпоративных тиражей и мерча." },
      ] },
    ]
  },
  hoodies: {
    title: "Худи",
    subtitle: "Для печати DTF",
    desc: "Худи и толстовки с DTF-печатью — популярный формат для мерча, корпоративной одежды и подарков.",
    items: [
      { name: "Худи оверсайз", material: "80% хлопок, 20% полиэстер, 320 г/м²", colors: "Белое, чёрное, серое, бежевое", sizes: "S – 3XL", price: "от 1 800 ₽", desc: "Плотное худи с капюшоном и карманом-кенгуру. Мягкий начёс внутри." },
      { name: "Худи классика", material: "80% хлопок, 20% полиэстер, 280 г/м²", colors: "15+ цветов", sizes: "XS – 4XL", price: "от 1 400 ₽", desc: "Классический крой, средняя плотность. Удобно для повседневной носки и принтов." },
      { name: "Свитшот", material: "80% хлопок, 20% полиэстер, 280 г/м²", colors: "Белый, чёрный, серый, цветные", sizes: "S – 3XL", price: "от 1 200 ₽", desc: "Без капюшона, круглый ворот. Чистый фасад для крупных принтов." },
    ]
  },
  shoppers: {
    title: "Шопперы",
    subtitle: "Для печати DTF",
    desc: "Экологичные шопперы и сумки с DTF-печатью — отличный вариант для мерча, промо-акций и подарков.",
    items: [
      { name: "Шоппер хлопковый", material: "100% хлопок, 210 г/м²", colors: "Натуральный, белый, чёрный", sizes: "38×42 см", price: "от 330 ₽", desc: "Плотная хлопковая сумка с длинными ручками. Вмещает до 15 кг." },
      { name: "Шоппер с дном", material: "100% хлопок, 240 г/м²", colors: "Натуральный, чёрный", sizes: "38×42×10 см", price: "от 450 ₽", desc: "Расширенное дно для большей вместимости. Удобен для покупок." },
      { name: "Сумка-мешок", material: "100% хлопок, 160 г/м²", colors: "Белый, чёрный, натуральный", sizes: "35×45 см", price: "от 280 ₽", desc: "Лёгкая сумка на затяжках. Компактная, идеальна для промо." },
    ]
  }
};

const TSHIRT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const TSHIRT_SIZE_GUIDE = [
  { size: "XS", chest: 49, length: 65 },
  { size: "S", chest: 52, length: 67 },
  { size: "M", chest: 55, length: 69 },
  { size: "L", chest: 58, length: 71 },
  { size: "XL", chest: 61, length: 73 },
  { size: "2XL", chest: 64, length: 75 },
  { size: "3XL", chest: 67, length: 77 },
];
const TSHIRT_SIZE_GUIDE_SECTIONS = [
  { title: "Оверсайз футболки", rows: TSHIRT_SIZE_GUIDE },
  { title: "Базовые футболки", rows: TSHIRT_SIZE_GUIDE },
];
const CONSTRUCTOR_PRODUCTS = [
  {
    key: "basic",
    name: "Базовая футболка",
    model: "classic",
    price: 650,
    description: "Классический крой для повседневых и корпоративных тиражей.",
    colors: ["Чёрный", "Белый"],
    sizes: TSHIRT_SIZE_OPTIONS,
    printAreas: {
      front: { left: 50, top: 48, width: 28, height: 31 },
      back: { left: 50, top: 44, width: 30, height: 34 },
    },
  },
  {
    key: "oversize",
    name: "Футболка оверсайз",
    model: "oversize",
    price: 800,
    description: "Свободный силуэт для ярких принтов и мерча с объёмной посадкой.",
    colors: ["Чёрный", "Белый"],
    sizes: TSHIRT_SIZE_OPTIONS,
    printAreas: {
      front: { left: 50, top: 47, width: 30, height: 33 },
      back: { left: 50, top: 43, width: 32, height: 36 },
    },
  },
];
const CONSTRUCTOR_TABS = [
  ["textile", "Текстиль"],
  ["upload", "Загрузить"],
  ["text", "Текст"],
  ["prints", "Принты"],
  ["order", "В заказ"],
];
const COLOR_SWATCHES = {
  "чёрный": { background: "#111111", border: "rgba(255,255,255,.2)", labelColor: "#f0eef5" },
  "черный": { background: "#111111", border: "rgba(255,255,255,.2)", labelColor: "#f0eef5" },
  "белый": { background: "#f5f5f5", border: "rgba(255,255,255,.18)", labelColor: "#1a1a1a" },
  "белое": { background: "#f5f5f5", border: "rgba(255,255,255,.18)", labelColor: "#1a1a1a" },
  "розовый": { background: "#f3a7c6", border: "rgba(255,255,255,.14)", labelColor: "#1a1a1a" },
  "тёмно-серый": { background: "#50545c", border: "rgba(255,255,255,.14)", labelColor: "#f0eef5" },
  "темно-серый": { background: "#50545c", border: "rgba(255,255,255,.14)", labelColor: "#f0eef5" },
  "серый": { background: "#8d939d", border: "rgba(255,255,255,.14)", labelColor: "#1a1a1a" },
  "меланж": { background: "linear-gradient(135deg,#b9bbc1,#8b9099)", border: "rgba(255,255,255,.14)", labelColor: "#1a1a1a" },
  "бежевый": { background: "#d8c1a2", border: "rgba(255,255,255,.14)", labelColor: "#1a1a1a" },
  "бежевое": { background: "#d8c1a2", border: "rgba(255,255,255,.14)", labelColor: "#1a1a1a" },
  "натуральный": { background: "#d9cdb5", border: "rgba(255,255,255,.14)", labelColor: "#1a1a1a" },
  "цветные": { background: "linear-gradient(135deg,#e84393,#6c5ce7)", border: "rgba(255,255,255,.14)", labelColor: "#f0eef5" },
};

const TSHIRT_GALLERY_FALLBACK_VIEWS = [
  { key: "front", label: "Фото 1" },
  { key: "back", label: "Фото 2" },
  { key: "detail", label: "Фото 3" },
];

const TSHIRT_REAL_GALLERY_PATHS = {
  oversize: {
    shared: {},
    variants: {
      "180": {
        "розовый": "/tshirts/oversize/180/pink",
        "темно-серый": "/tshirts/oversize/180/dark-gray",
        "меланж": "/tshirts/oversize/180/melange",
      },
      "240": {
        "черный": "/tshirts/oversize/240/black",
        "белый": "/tshirts/oversize/240/white",
        "розовый": "/tshirts/oversize/240/pink",
        "бежевый": "/tshirts/oversize/240/beige",
      },
    },
  },
  classic: {
    shared: {},
    variants: {
      "180": {
        "черный": "/tshirts/classic/180/black",
        "белый": "/tshirts/classic/180/white",
      },
    },
  },
};

const TSHIRT_GALLERY_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];
const TSHIRT_GALLERY_MAX_IMAGES = 12;

const TSHIRT_GALLERY_COLORS = {
  "черный": { base: "#151517", shade: "#050507", highlight: "#3d3f45", accent: "rgba(255,255,255,.2)", text: "#f0eef5" },
  "белый": { base: "#f4f1ed", shade: "#d5d0c9", highlight: "#ffffff", accent: "rgba(0,0,0,.08)", text: "#1b1b1d" },
  "розовый": { base: "#e7a6c0", shade: "#bf7f98", highlight: "#f3c8db", accent: "rgba(255,255,255,.18)", text: "#1b1b1d" },
  "темно-серый": { base: "#5f6670", shade: "#3f464f", highlight: "#89919c", accent: "rgba(255,255,255,.16)", text: "#f0eef5" },
  "меланж": { base: "#b8bcc3", shade: "#9299a3", highlight: "#d8dce2", accent: "rgba(255,255,255,.18)", text: "#1b1b1d", pattern: "speckle" },
  "бежевый": { base: "#d8c0a2", shade: "#b39674", highlight: "#ead9c3", accent: "rgba(255,255,255,.16)", text: "#1b1b1d" },
};

function parseColorOptions(colorsValue) {
  if (!colorsValue) return [];
  return colorsValue.split(",").map((color) => color.trim()).filter(Boolean);
}

function getDefaultTshirtColor(options) {
  if (!options?.length) return "";
  return options.find((option) => normalizeColorName(option) === "черный") || "";
}

function resolveColorSwatch(colorName) {
  return COLOR_SWATCHES[colorName.toLowerCase().replace(/ё/g, "е")] || {
    background: "linear-gradient(135deg,#6c5ce7,#e84393)",
    border: "rgba(255,255,255,.14)",
    labelColor: "#f0eef5",
  };
}

function normalizeColorName(colorName = "") {
  return colorName.toLowerCase().replace(/ё/g, "е").trim();
}

function resolveTshirtGalleryColor(colorName) {
  return TSHIRT_GALLERY_COLORS[normalizeColorName(colorName)] || {
    base: "#8f80f2",
    shade: "#5f4ed7",
    highlight: "#c0b4ff",
    accent: "rgba(255,255,255,.16)",
    text: "#f0eef5",
  };
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeVariantLabel(variantLabel = "") {
  const match = String(variantLabel).match(/\d+/);
  return match ? match[0] : "";
}

function resolveRealGalleryPath(model, colorName, variantLabel) {
  const normalizedColor = normalizeColorName(colorName);
  const modelConfig = TSHIRT_REAL_GALLERY_PATHS[model];
  if (!modelConfig) return "";

  const normalizedVariant = normalizeVariantLabel(variantLabel);
  const variantPath = normalizedVariant ? modelConfig.variants?.[normalizedVariant]?.[normalizedColor] : "";
  return variantPath || modelConfig.shared?.[normalizedColor] || "";
}

function buildOrderedGalleryCandidates(model, colorName, variantLabel) {
  const basePath = resolveRealGalleryPath(model, colorName, variantLabel);
  if (!basePath) return [];

  return Array.from({ length: TSHIRT_GALLERY_MAX_IMAGES }, (_, index) => {
    const order = String(index + 1).padStart(2, "0");
    const plainOrder = String(index + 1);
    return {
      key: `photo-${order}`,
      label: `Фото ${index + 1}`,
      order,
      sources: TSHIRT_GALLERY_EXTENSIONS.flatMap((ext) => ([
        `${basePath}/${order}.${ext}`,
        `${basePath}/${plainOrder}.${ext}`,
      ])),
    };
  });
}

function loadImageCandidate(sources) {
  return new Promise((resolve) => {
    const tryIndex = (index) => {
      if (index >= sources.length) {
        resolve(null);
        return;
      }

      const image = new Image();
      image.onload = () => resolve(sources[index]);
      image.onerror = () => tryIndex(index + 1);
      image.src = sources[index];
    };

    tryIndex(0);
  });
}

function buildTshirtMockupSvg({ model, colorName, view }) {
  const colorKey = normalizeColorName(colorName) || "черный";
  const palette = resolveTshirtGalleryColor(colorKey);
  const gradientId = `${model}-${colorKey}-${view}-gradient`;
  const highlightId = `${model}-${colorKey}-${view}-highlight`;
  const patternId = `${model}-${colorKey}-${view}-speckle`;
  const isOversize = model === "oversize";
  const body = isOversize
    ? { x: 316, y: 280, width: 568, height: 820, radius: 92, leftSleeve: "rotate(-23 272 414)", rightSleeve: "rotate(23 928 414)", sleeveWidth: 228, sleeveHeight: 246, sleeveX: 184, sleeveY: 316, neckCx: 600, neckCy: view === "front" ? 290 : 282, neckOuterRx: 124, neckOuterRy: 66, neckInnerRx: view === "front" ? 84 : 72, neckInnerRy: view === "front" ? 38 : 26 }
    : { x: 356, y: 286, width: 488, height: 796, radius: 76, leftSleeve: "rotate(-19 302 410)", rightSleeve: "rotate(19 898 410)", sleeveWidth: 188, sleeveHeight: 224, sleeveX: 208, sleeveY: 330, neckCx: 600, neckCy: view === "front" ? 296 : 288, neckOuterRx: 108, neckOuterRy: 58, neckInnerRx: view === "front" ? 68 : 60, neckInnerRy: view === "front" ? 34 : 22 };
  const detailBlock = view === "detail";
  const fabricFill = palette.pattern === "speckle"
    ? `url(#${patternId})`
    : `url(#${gradientId})`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" fill="none">
      <defs>
        <linearGradient id="${gradientId}" x1="260" y1="180" x2="930" y2="1180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${palette.highlight}" />
          <stop offset="0.38" stop-color="${palette.base}" />
          <stop offset="1" stop-color="${palette.shade}" />
        </linearGradient>
        <radialGradient id="${highlightId}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(496 404) rotate(58) scale(590 520)">
          <stop offset="0" stop-color="rgba(255,255,255,.34)" />
          <stop offset="0.48" stop-color="rgba(255,255,255,.08)" />
          <stop offset="1" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <pattern id="${patternId}" width="36" height="36" patternUnits="userSpaceOnUse">
          <rect width="36" height="36" fill="${palette.base}" />
          <circle cx="8" cy="10" r="2.5" fill="${palette.highlight}" opacity=".33" />
          <circle cx="24" cy="18" r="2" fill="${palette.shade}" opacity=".32" />
          <circle cx="14" cy="28" r="2.4" fill="${palette.highlight}" opacity=".2" />
        </pattern>
        <filter id="shadow" x="94" y="116" width="1012" height="1232" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="34" stdDeviation="38" flood-color="rgba(0,0,0,.42)" />
        </filter>
      </defs>

      <rect width="1200" height="1500" fill="#0a0a0f" />
      <rect x="40" y="40" width="1120" height="1420" rx="42" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.06)" />
      <ellipse cx="600" cy="1278" rx="290" ry="70" fill="rgba(0,0,0,.34)" />

      ${detailBlock ? `
        <g filter="url(#shadow)">
          <circle cx="600" cy="580" r="286" fill="${fabricFill}" stroke="rgba(255,255,255,.12)" />
          <circle cx="600" cy="580" r="286" fill="url(#${highlightId})" opacity=".75" />
          <path d="M464 464c40 26 92 40 136 40 46 0 98-14 136-40" stroke="${palette.accent}" stroke-width="26" stroke-linecap="round" />
          <path d="M454 794c48-22 96-32 146-32 50 0 100 10 146 32" stroke="${palette.accent}" stroke-width="18" stroke-linecap="round" opacity=".8" />
          <path d="M412 680c114 14 262 14 376 0" stroke="rgba(255,255,255,.14)" stroke-width="4" stroke-dasharray="8 10" opacity=".5" />
        </g>
      ` : `
        <g filter="url(#shadow)">
          <rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" rx="${body.radius}" fill="${fabricFill}" />
          <rect x="${body.sleeveX}" y="${body.sleeveY}" width="${body.sleeveWidth}" height="${body.sleeveHeight}" rx="72" transform="${body.leftSleeve}" fill="${fabricFill}" />
          <rect x="${1200 - body.sleeveX - body.sleeveWidth}" y="${body.sleeveY}" width="${body.sleeveWidth}" height="${body.sleeveHeight}" rx="72" transform="${body.rightSleeve}" fill="${fabricFill}" />
          <rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" rx="${body.radius}" fill="url(#${highlightId})" opacity=".88" />
          <ellipse cx="${body.neckCx}" cy="${body.neckCy}" rx="${body.neckOuterRx}" ry="${body.neckOuterRy}" fill="#0a0a0f" />
          <ellipse cx="${body.neckCx}" cy="${body.neckCy + 8}" rx="${body.neckInnerRx}" ry="${body.neckInnerRy}" fill="${fabricFill}" opacity=".94" />
          ${view === "front" ? `<path d="M482 512c68 22 170 22 238 0" stroke="${palette.accent}" stroke-width="14" stroke-linecap="round" opacity=".72" />` : `<path d="M484 472c74 16 158 16 232 0" stroke="${palette.accent}" stroke-width="10" stroke-linecap="round" opacity=".46" />`}
          ${view === "back" ? `<path d="M418 420c120 54 244 54 364 0" stroke="rgba(255,255,255,.08)" stroke-width="8" opacity=".6" />` : ""}
          <path d="M${body.x + 36} ${body.y + body.height - 54}H${body.x + body.width - 36}" stroke="rgba(255,255,255,.12)" stroke-width="6" stroke-linecap="round" opacity=".48" />
        </g>
      `}

      <g opacity=".82">
        <text x="94" y="124" fill="#6c5ce7" font-size="34" font-family="Outfit, Arial, sans-serif" font-weight="600">FUTURE STUDIO</text>
        <text x="94" y="180" fill="rgba(240,238,245,.52)" font-size="20" font-family="Outfit, Arial, sans-serif">${isOversize ? "Оверсайз" : "Классика"} • ${colorName}</text>
      </g>
      <text x="94" y="1380" fill="${palette.text}" opacity=".82" font-size="26" font-family="Outfit, Arial, sans-serif">${TSHIRT_GALLERY_FALLBACK_VIEWS.find((slide) => slide.key === view)?.label || "Предпросмотр"}</text>
    </svg>
  `;
}

function buildTshirtFallbackSlides(itemName, model, colorName) {
  const previewColor = colorName || "Чёрный";
  return TSHIRT_GALLERY_FALLBACK_VIEWS.map((view) => {
    const fallbackSrc = svgToDataUri(buildTshirtMockupSvg({ model, colorName: previewColor, view: view.key }));
    return {
      key: view.key,
      label: view.label,
      colorName: previewColor,
      alt: `${itemName} — ${previewColor}, ${view.label.toLowerCase()}`,
      src: fallbackSrc,
    };
  });
}

function getTshirtSizes(item) {
  return item?.sizes === "XS – 3XL" ? TSHIRT_SIZE_OPTIONS : [];
}

function buildTelegramOrderLink({ itemName, material, price, size, color }) {
  const details = [
    `Здравствуйте! Хочу заказать ${itemName}.`,
    material ? `Материал: ${material}` : null,
    size ? `Размер: ${size}` : null,
    color ? `Цвет: ${color}` : null,
    price ? `Цена: ${price}` : null,
  ].filter(Boolean).join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(details)}`;
}

function buildTelegramBasketLink(lines) {
  const message = [
    "Здравствуйте! Хочу заказать футболки:",
    "",
    ...lines.map((line, index) => {
      const parts = [
        `${index + 1}. ${line.itemName}`,
        line.variantLabel ? `плотность ${line.variantLabel}` : null,
        line.size ? `размер ${line.size}` : null,
        line.color ? `цвет ${line.color}` : null,
        `кол-во ${line.qty} шт`,
      ].filter(Boolean);
      return parts.join(", ");
    }),
  ].join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(message)}`;
}

function buildConstructorPresetSvg(kind) {
  const presets = {
    future: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
        <rect width="600" height="600" rx="120" fill="url(#bg)" />
        <defs>
          <linearGradient id="bg" x1="80" y1="60" x2="520" y2="540" gradientUnits="userSpaceOnUse">
            <stop stop-color="#e84393" />
            <stop offset="1" stop-color="#6c5ce7" />
          </linearGradient>
        </defs>
        <text x="300" y="330" text-anchor="middle" fill="white" font-size="132" font-family="Outfit, Arial, sans-serif" font-weight="700">FS</text>
      </svg>
    `,
    lightning: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
        <rect width="600" height="600" rx="120" fill="#151517" />
        <path d="M334 56 148 332h116l-40 212 228-316H332l2-172Z" fill="url(#bolt)"/>
        <defs>
          <linearGradient id="bolt" x1="140" y1="60" x2="442" y2="540" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f9ed69" />
            <stop offset="1" stop-color="#f08a5d" />
          </linearGradient>
        </defs>
      </svg>
    `,
    smile: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
        <circle cx="300" cy="300" r="250" fill="url(#face)" />
        <circle cx="220" cy="250" r="28" fill="#151517" />
        <circle cx="380" cy="250" r="28" fill="#151517" />
        <path d="M194 336c28 64 92 104 164 104 72 0 136-40 164-104" stroke="#151517" stroke-width="26" stroke-linecap="round"/>
        <defs>
          <linearGradient id="face" x1="90" y1="90" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f9ed69" />
            <stop offset="1" stop-color="#f08a5d" />
          </linearGradient>
        </defs>
      </svg>
    `,
    circle: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none">
        <circle cx="300" cy="300" r="250" fill="url(#ring)" />
        <circle cx="300" cy="300" r="154" fill="#0b0b10" />
        <text x="300" y="280" text-anchor="middle" fill="white" font-size="54" font-family="Outfit, Arial, sans-serif" font-weight="500">FUTURE</text>
        <text x="300" y="346" text-anchor="middle" fill="#e84393" font-size="74" font-family="Outfit, Arial, sans-serif" font-weight="700">DTF</text>
        <defs>
          <linearGradient id="ring" x1="90" y1="70" x2="510" y2="530" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6c5ce7" />
            <stop offset="1" stop-color="#e84393" />
          </linearGradient>
        </defs>
      </svg>
    `,
  };

  return svgToDataUri(presets[kind] || presets.future);
}

const CONSTRUCTOR_PRESET_PRINTS = [
  { key: "future", label: "Future Badge", src: buildConstructorPresetSvg("future") },
  { key: "lightning", label: "Lightning", src: buildConstructorPresetSvg("lightning") },
  { key: "smile", label: "Smile", src: buildConstructorPresetSvg("smile") },
  { key: "circle", label: "Future DTF", src: buildConstructorPresetSvg("circle") },
];

function buildConstructorTelegramLink(lines) {
  const message = [
    "Здравствуйте! Хочу оформить заказ через конструктор футболок.",
    "",
    ...lines.map((line, index) => {
      const details = [
        `${index + 1}. ${line.productName}`,
        `цвет ${line.color}`,
        `размер ${line.size}`,
        `сторона ${line.side === "front" ? "спереди" : "сзади"}`,
        `кол-во ${line.qty} шт`,
        line.uploadName ? `макет ${line.uploadName}` : null,
        line.text ? `текст «${line.text}»` : null,
        line.presetLabel ? `принт ${line.presetLabel}` : null,
        `предварительно ${line.total.toLocaleString("ru-RU")} ₽`,
      ].filter(Boolean);
      return details.join(", ");
    }),
  ].join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(message)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readImageSize(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  });
}

function parsePriceValue(price) {
  if (!price) return 0;
  const digits = String(price).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function SelectorTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(240,238,245,.38)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;
}

const FIELD_LABEL_STYLE = {
  width: 92,
  minWidth: 92,
  fontSize: 12,
  fontWeight: 400,
  color: "rgba(240,238,245,.35)",
  textTransform: "uppercase",
  letterSpacing: 1,
};

const FIELD_BOX_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 14px",
  background: "rgba(255,255,255,.02)",
  borderRadius: 10,
  minHeight: 56,
};

const CONTROL_STRIP_STYLE = {
  display: "flex",
  gap: 8,
  flexWrap: "nowrap",
  overflowX: "auto",
  flex: 1,
  minWidth: 0,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

function FieldRow({ label, children, minHeight = 56 }) {
  return (
    <div className="field-row" style={{ ...FIELD_BOX_STYLE, minHeight }}>
      <span className="field-row-label" style={FIELD_LABEL_STYLE}>{label}</span>
      <div className="field-row-content" style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function SizeSelector({ options, value, onChange }) {
  if (!options.length) return null;
  return (
    <FieldRow label="Размер" minHeight={102}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", minHeight: 68 }}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? "" : option)}
              style={{
                minWidth: 46,
                padding: "8px 12px",
                borderRadius: 10,
                border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
                background: active ? "linear-gradient(135deg,rgba(232,67,147,.16),rgba(108,92,231,.16))" : "rgba(255,255,255,.03)",
                color: active ? "#f0eef5" : "rgba(240,238,245,.56)",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                transition: "all .25s",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </FieldRow>
  );
}

function ColorSelector({ options, value, onChange }) {
  if (!options.length) return null;
  return (
    <FieldRow label="Цвет" minHeight={102}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", minHeight: 68 }}>
        {options.map((option) => {
          const active = option === value;
          const swatch = resolveColorSwatch(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? "" : option)}
              aria-label={`Выбрать цвет ${option}`}
              title={option}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px 7px 7px",
                borderRadius: 999,
                border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
                background: active ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)",
                cursor: "pointer",
                transition: "all .25s",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: swatch.background, border: `1px solid ${swatch.border}` }} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#f0eef5" : "rgba(240,238,245,.56)" }}>{option}</span>
            </button>
          );
        })}
      </div>
    </FieldRow>
  );
}

function QtySelector({ value, onChange }) {
  return (
    <FieldRow label="Количество">
      <div className="qty-inline" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {[
          { label: "−", next: Math.max(1, value - 1) },
          { label: "+", next: value + 1 },
        ].map((control) => (
          <button
            key={control.label}
            type="button"
            onClick={() => onChange(control.next)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.03)",
              color: "#f0eef5",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {control.label}
          </button>
        ))}
        <input
          type="number"
          min="1"
          value={value}
          onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
          className="inf"
          style={{ width: 88, padding: "8px 12px", textAlign: "center", fontSize: 16, fontWeight: 600 }}
        />
        <span style={{ fontSize: 13, color: "rgba(240,238,245,.45)" }}>шт</span>
      </div>
    </FieldRow>
  );
}

function TshirtSizeGuideTable({ title, rows }) {
  return (
    <div className="cs" style={{ padding: 18, border: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 14 }}>{title}</div>
      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
        <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12))" }}>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.75)", textTransform: "uppercase", letterSpacing: 1.2 }}>Размер</th>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.75)", textTransform: "uppercase", letterSpacing: 1.2 }}>Ширина груди</th>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.75)", textTransform: "uppercase", letterSpacing: 1.2 }}>Длина изделия от плечевого шва</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.size}`} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>{row.size}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "rgba(240,238,245,.72)" }}>{row.chest} см</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "rgba(240,238,245,.72)" }}>{row.length} см</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TshirtPhotoGallery({ itemName, galleryModel, activeColor, activeVariantLabel, onOpen }) {
  const fallbackSlides = buildTshirtFallbackSlides(itemName, galleryModel, activeColor || "Чёрный");
  const [slides, setSlides] = useState(fallbackSlides);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] || slides[0];

  useEffect(() => {
    let cancelled = false;

    const loadSlides = async () => {
      setLoading(true);
      const orderedCandidates = buildOrderedGalleryCandidates(galleryModel, activeColor || "Чёрный", activeVariantLabel);
      const resolvedSlides = [];

      for (let index = 0; index < orderedCandidates.length; index += 1) {
        const candidate = orderedCandidates[index];
        const resolvedSrc = await loadImageCandidate(candidate.sources);
        if (!resolvedSrc) {
          continue;
        }

        resolvedSlides.push({
          key: candidate.key,
          label: candidate.label,
          colorName: activeColor || "Чёрный",
          alt: `${itemName} — ${activeColor || "Чёрный"}, ${candidate.label.toLowerCase()}`,
          src: resolvedSrc,
        });
      }

      if (cancelled) return;
      setSlides(resolvedSlides.length ? resolvedSlides : buildTshirtFallbackSlides(itemName, galleryModel, activeColor || "Чёрный"));
      setActiveIndex(0);
      setLoading(false);
    };

    loadSlides();
    return () => {
      cancelled = true;
    };
  }, [galleryModel, activeColor, activeVariantLabel, itemName]);

  if (!activeSlide) return null;

  return (
    <div className="cs" style={{ padding: 14, marginBottom: 16, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.015)" }}>
      <button
        type="button"
        onClick={() => onOpen?.({
          title: `${itemName} · ${activeSlide.colorName}`,
          activeIndex,
          slides,
        })}
        style={{
          width: "100%",
          padding: 0,
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 18,
          overflow: "hidden",
          cursor: "zoom-in",
          background: "rgba(255,255,255,.02)",
          position: "relative",
        }}
      >
        <img
          src={activeSlide.src}
          alt={activeSlide.alt}
          draggable={false}
          style={{
            width: "100%",
            aspectRatio: "1 / 1.08",
            objectFit: "cover",
            display: "block",
            userSelect: "none",
            WebkitUserDrag: "none",
          }}
        />
        <span style={{ position: "absolute", left: 14, top: 14, padding: "7px 11px", borderRadius: 999, background: "rgba(8,8,12,.72)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, fontWeight: 500, color: "#f0eef5", backdropFilter: "blur(10px)" }}>
          {activeSlide.colorName}
        </span>
        <span style={{ position: "absolute", right: 14, bottom: 14, padding: "7px 11px", borderRadius: 999, background: "rgba(8,8,12,.72)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.85)", backdropFilter: "blur(10px)" }}>
          {loading ? "Загружаем фото…" : "Нажмите для увеличения"}
        </span>
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 12, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={`${slide.key}-${slide.colorName}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              style={{
                padding: 0,
                borderRadius: 14,
                overflow: "hidden",
                minWidth: 86,
                border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.06)",
                background: active ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)",
                cursor: "pointer",
                transition: "all .25s",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                draggable={false}
                style={{ width: 84, height: 84, objectFit: "cover", display: "block", userSelect: "none", WebkitUserDrag: "none" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MainTshirtCard({ item, onOpen }) {
  const [vi, setVi] = useState(0);
  const hv = item.variants && item.variants.length > 0;
  const cur = hv ? item.variants[vi] : null;
  const price = hv && cur.price ? cur.price : item.price;
  const material = hv ? cur.material : item.material;
  const colors = hv ? cur.colors : item.colors;
  const desc = hv && cur.desc ? cur.desc : item.desc;
  const sizeOptions = getTshirtSizes(item);
  const colorOptions = parseColorOptions(colors);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  return (
    <div className="cg main-card" style={{ padding: 32, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      <div className="main-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
        <h3 style={{ fontSize: 20, fontWeight: 500 }}>{item.name}</h3>
        <span className="price-pill" style={{ background: "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))", padding: "6px 14px", borderRadius: 20, fontSize: 15, fontWeight: 600, color: "#e84393", whiteSpace: "nowrap" }}>{price}</span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.5)", lineHeight: 1.7, marginBottom: 16 }}>{desc}</p>

      {hv && (
        <div style={{ marginBottom: 14 }}>
          <FieldRow label="Плотность">
            <div style={{ ...CONTROL_STRIP_STYLE, gap: 6 }}>
              {item.variants.map((v, j) => (
                <button key={j} onClick={() => {
                  setVi(j);
                  setSelectedSize("");
                  setSelectedColor("");
                }} style={{
                  minWidth: 110,
                  flexShrink: 0,
                  padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontSize: 13,
                  fontWeight: vi === j ? 600 : 400, fontFamily: "'Outfit',sans-serif",
                  background: vi === j ? "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))" : "rgba(255,255,255,.03)",
                  color: vi === j ? "#e84393" : "rgba(240,238,245,.45)",
                  border: vi === j ? "1px solid rgba(232,67,147,.25)" : "1px solid rgba(255,255,255,.06)",
                  transition: "all .3s",
                }}>{v.label}</button>
              ))}
            </div>
          </FieldRow>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <FieldRow label="Материал">
          <div className="field-value" style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,238,245,.65)", textAlign: "right", marginLeft: "auto" }}>{material}</div>
        </FieldRow>
        <SizeSelector options={sizeOptions} value={selectedSize} onChange={setSelectedSize} />
        <ColorSelector options={colorOptions} value={selectedColor} onChange={setSelectedColor} />
      </div>

      <button onClick={onOpen} className="bo" style={{ width: "100%", marginTop: 18, padding: "12px 24px", fontSize: 14 }}>Подробнее</button>
    </div>
  );
}

function ProductCard({ item, i, type, onAddTshirtSelection, onOpenGallery }) {
  const [varIdx, setVarIdx] = useState(0);
  const hasVariants = item.variants && item.variants.length > 0;
  const isTshirt = type === "tshirts";
  const activeVariant = hasVariants ? item.variants[varIdx] : null;
  const displayVariant = activeVariant;
  const material = hasVariants ? displayVariant?.material : item.material;
  const colors = hasVariants ? (isTshirt ? (activeVariant?.colors || "") : displayVariant?.colors) : item.colors;
  const price = hasVariants && displayVariant?.price ? displayVariant.price : item.price;
  const desc = hasVariants && displayVariant?.desc ? displayVariant.desc : item.desc;
  const sizeOptions = isTshirt ? getTshirtSizes(item) : [];
  const colorOptions = isTshirt ? parseColorOptions(colors) : [];
  const defaultColor = isTshirt ? getDefaultTshirtColor(colorOptions) : "";
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedQty, setSelectedQty] = useState(1);
  const galleryColor = selectedColor || colorOptions[0] || "Чёрный";
  const orderLink = isTshirt
    ? buildTelegramOrderLink({ itemName: item.name, material, price, size: selectedSize, color: selectedColor })
    : "https://t.me/FUTURE_178";
  const variantLabel = activeVariant?.label || "";
  const canAddTshirtSelection = Boolean(isTshirt && variantLabel && selectedSize && selectedQty >= 1);

  const handleAddTshirtSelection = (event) => {
    if (!onAddTshirtSelection || !canAddTshirtSelection) return;
    const originRect = event.currentTarget.getBoundingClientRect();
    onAddTshirtSelection({
      itemName: item.name,
      variantLabel,
      size: selectedSize,
      color: selectedColor,
      qty: selectedQty,
      price,
    }, originRect);
  };

  return (
    <div className="cs product-card" style={{
      padding: 32, display: "flex", flexDirection: "column",
      opacity: 0, animation: `fadeUp 0.6s ${i * 0.08}s forwards`,
      border: "1px solid rgba(255,255,255,.06)",
      transition: "border-color 0.4s, transform 0.4s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,67,147,.2)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div className="product-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 500 }}>{item.name}</h3>
        <span className="price-pill" style={{ background: "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))", padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 600, color: "#e84393", whiteSpace: "nowrap" }}>{price}</span>
      </div>
      {isTshirt && (
        <TshirtPhotoGallery
          itemName={item.name}
          galleryModel={item.galleryModel || "oversize"}
          activeColor={galleryColor}
          activeVariantLabel={variantLabel}
          onOpen={onOpenGallery}
        />
      )}
      <p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.5)", lineHeight: 1.7, marginBottom: 18, flex: 1 }}>{desc}</p>

      {/* Variant toggle */}
      {hasVariants && isTshirt && (
        <div style={{ marginBottom: 14 }}>
          <FieldRow label="Плотность">
            <div style={{ ...CONTROL_STRIP_STYLE, gap: 6 }}>
              {item.variants.map((v, vi) => (
                <button key={vi} onClick={() => {
                  const nextVariant = item.variants[vi];
                  const nextDefaultColor = getDefaultTshirtColor(parseColorOptions(nextVariant?.colors || ""));
                  setVarIdx(vi);
                  setSelectedSize("");
                  setSelectedColor(nextDefaultColor);
                }}
                  style={{
                    minWidth: 110,
                    flexShrink: 0,
                    padding: "9px 10px", borderRadius: 10, cursor: "pointer",
                    fontSize: 13, fontWeight: varIdx === vi ? 600 : 400, fontFamily: "'Outfit',sans-serif",
                    background: varIdx === vi ? "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15))" : "rgba(255,255,255,.03)",
                    color: varIdx === vi ? "#e84393" : "rgba(240,238,245,.45)",
                    border: varIdx === vi ? "1px solid rgba(232,67,147,.25)" : "1px solid rgba(255,255,255,.06)",
                    transition: "all .3s",
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </FieldRow>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldRow label="Материал">
          <div className="field-value" style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,238,245,.65)", textAlign: "right", marginLeft: "auto" }}>{material}</div>
        </FieldRow>
        {isTshirt ? (
          <>
            <SizeSelector options={sizeOptions} value={selectedSize} onChange={setSelectedSize} />
            <ColorSelector options={colorOptions} value={selectedColor} onChange={setSelectedColor} />
            <QtySelector value={selectedQty} onChange={setSelectedQty} />
          </>
        ) : (
          [["Цвета", colors], ["Размеры", item.sizes]].map(([label, val]) => (
            <FieldRow key={label} label={label}>
              <div className="field-value" style={{ fontSize: 13, fontWeight: 400, color: "rgba(240,238,245,.65)", textAlign: "right", marginLeft: "auto" }}>{val}</div>
            </FieldRow>
          ))
        )}
      </div>
      {isTshirt ? (
        <>
          <div style={{ minHeight: 18, marginTop: 14, fontSize: 12, color: "rgba(240,238,245,.4)", textAlign: "center", opacity: canAddTshirtSelection ? 0 : 1, transition: "opacity .2s ease" }}>
            {canAddTshirtSelection ? " " : "Для заказа выберите размер."}
          </div>
          <button onClick={handleAddTshirtSelection} className="btg" disabled={!canAddTshirtSelection} style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex", padding: "12px 24px", fontSize: 14, opacity: canAddTshirtSelection ? 1 : 0.45, cursor: canAddTshirtSelection ? "pointer" : "not-allowed", filter: canAddTshirtSelection ? "none" : "grayscale(.15)" }}>
          + Добавить в заказ
          </button>
        </>
      ) : (
        <a href={orderLink} target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex", padding: "12px 24px", fontSize: 14 }}>
          <TG /> Заказать
        </a>
      )}
    </div>
  );
}

function TextilePage({ type, onBack, onNavigate }) {
  const data = TEXTILE_DATA[type];
  const [tshirtOrder, setTshirtOrder] = useState([]);
  const [flyingCartItem, setFlyingCartItem] = useState(null);
  const [cartPulse, setCartPulse] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [galleryModal, setGalleryModal] = useState(null);
  const basketSummaryRef = useRef(null);

  useEffect(() => {
    if (!sizeGuideOpen && !galleryModal) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (galleryModal) {
          setGalleryModal(null);
          return;
        }
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
  }, [sizeGuideOpen, galleryModal]);

  if (!data) return null;

  const addTshirtSelection = (selection, originRect) => {
    setTshirtOrder((current) => {
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

    if (!originRect || !basketSummaryRef.current) return;

    const targetRect = basketSummaryRef.current.getBoundingClientRect();
    const labelParts = [selection.itemName, selection.size, selection.color, `${selection.qty} шт`].filter(Boolean);
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setFlyingCartItem({
      id,
      label: labelParts.join(" • "),
      startX: originRect.left + originRect.width / 2,
      startY: originRect.top + originRect.height / 2,
      dx: targetRect.left + targetRect.width / 2 - (originRect.left + originRect.width / 2),
      dy: targetRect.top + targetRect.height / 2 - (originRect.top + originRect.height / 2),
      lift: Math.min(120, Math.max(54, Math.abs(targetRect.top - originRect.top) * 0.28)),
    });

    window.setTimeout(() => {
      setCartPulse(true);
      window.setTimeout(() => setCartPulse(false), 760);
    }, 560);

    window.setTimeout(() => {
      setFlyingCartItem((current) => current && current.id === id ? null : current);
    }, 980);
  };

  const removeTshirtSelection = (id) => {
    setTshirtOrder((current) => current.filter((line) => line.id !== id));
  };

  const updateTshirtSelectionQty = (id, nextQty) => {
    setTshirtOrder((current) => current.map((line) => line.id === id ? { ...line, qty: Math.max(1, nextQty) } : line));
    setCartPulse(true);
    window.setTimeout(() => setCartPulse(false), 520);
  };

  const tshirtOrderQty = tshirtOrder.reduce((sum, line) => sum + line.qty, 0);
  const tshirtOrderTotal = tshirtOrder.reduce((sum, line) => sum + parsePriceValue(line.price) * line.qty, 0);
  const tshirtOrderLink = tshirtOrder.length ? buildTelegramBasketLink(tshirtOrder) : "https://t.me/FUTURE_178";

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh" }}>
      <style>{STYLES}{`@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}@keyframes cartPulseGlow{0%{transform:scale(1);box-shadow:0 0 0 rgba(232,67,147,0)}30%{transform:scale(1.035);box-shadow:0 0 0 6px rgba(232,67,147,.06),0 10px 30px rgba(232,67,147,.18)}65%{transform:scale(1.015);box-shadow:0 0 0 10px rgba(108,92,231,.04),0 12px 34px rgba(108,92,231,.14)}100%{transform:scale(1);box-shadow:0 0 0 rgba(232,67,147,0)}}@keyframes cartFly{0%{transform:translate3d(0,0,0) scale(1) rotate(0deg);opacity:.98;filter:blur(0)}38%{transform:translate3d(calc(var(--dx) * .42),calc(var(--dy) * .34 - var(--lift)),0) scale(.96) rotate(-8deg);opacity:1;filter:blur(0)}72%{transform:translate3d(calc(var(--dx) * .78),calc(var(--dy) * .82 - calc(var(--lift) * .18)),0) scale(.78) rotate(6deg);opacity:.72;filter:blur(.2px)}100%{transform:translate3d(var(--dx),var(--dy),0) scale(.52) rotate(12deg);opacity:0;filter:blur(.8px)}}`}</style>

      {flyingCartItem && (
        <div
          style={{
            position: "fixed",
            left: flyingCartItem.startX - 90,
            top: flyingCartItem.startY - 18,
            zIndex: 60,
            pointerEvents: "none",
            "--dx": `${flyingCartItem.dx}px`,
            "--dy": `${flyingCartItem.dy}px`,
            "--lift": `${flyingCartItem.lift}px`,
            animation: "cartFly .9s cubic-bezier(.22,.8,.24,1) forwards",
            willChange: "transform, opacity, filter",
          }}
        >
          <div style={{ maxWidth: 180, padding: "9px 14px", borderRadius: 999, background: "linear-gradient(135deg,rgba(232,67,147,.96),rgba(108,92,231,.96))", boxShadow: "0 16px 38px rgba(232,67,147,.28)", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", backdropFilter: "blur(8px)" }}>
            {flyingCartItem.label}
          </div>
        </div>
      )}

      {type === "tshirts" && sizeGuideOpen && (
        <div
          onClick={() => setSizeGuideOpen(false)}
          className="modal-shell"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(6,6,10,.78)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            className="cs modal-card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1100px, 100%)",
              maxHeight: "min(82vh, 920px)",
              overflow: "auto",
              padding: 24,
              border: "1px solid rgba(255,255,255,.08)",
              boxShadow: "0 28px 90px rgba(0,0,0,.45)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 8 }}>Спецификация</div>
                <div style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 500 }}>Размерная сетка футболок</div>
                <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 8 }}>Окно открывается поверх страницы. Закрывается по крестику, клику вне окна или клавишей `Esc`.</div>
              </div>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.04)",
                  color: "#f0eef5",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontSize: 20,
                  lineHeight: 1,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                ×
              </button>
            </div>

            <div className="size-guide-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, alignItems: "start" }}>
              {TSHIRT_SIZE_GUIDE_SECTIONS.map((section) => (
                <TshirtSizeGuideTable key={section.title} title={section.title} rows={section.rows} />
              ))}
            </div>

            <div style={{ fontSize: 13, color: "rgba(240,238,245,.4)", marginTop: 14 }}>Все параметры указаны в сантиметрах. Если нужна помощь с подбором размера, можно добавить комментарий при заказе.</div>
          </div>
        </div>
      )}

      {type === "tshirts" && galleryModal && (
        <div
          onClick={() => setGalleryModal(null)}
          className="modal-shell"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 75,
            background: "rgba(5,5,9,.84)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            className="cs modal-card"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1180px, 100%)",
              maxHeight: "min(88vh, 980px)",
              overflow: "auto",
              padding: 24,
              border: "1px solid rgba(255,255,255,.08)",
              boxShadow: "0 28px 90px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 8 }}>Фото изделия</div>
                <div style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 500 }}>{galleryModal.title}</div>
                <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 8 }}>Листайте стрелками ← → или переключайте миниатюры ниже.</div>
              </div>
              <button
                type="button"
                onClick={() => setGalleryModal(null)}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(255,255,255,.04)",
                  color: "#f0eef5",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontSize: 20,
                  lineHeight: 1,
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}>
              <img
                src={galleryModal.slides[galleryModal.activeIndex]?.src}
                alt={galleryModal.slides[galleryModal.activeIndex]?.alt}
                draggable={false}
                style={{ width: "100%", display: "block", maxHeight: "68vh", objectFit: "contain", userSelect: "none", WebkitUserDrag: "none" }}
              />
            </div>

            <div className="gallery-thumb-grid" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              {galleryModal.slides.map((slide, index) => {
                const active = galleryModal.activeIndex === index;
                return (
                  <button
                    key={`${slide.key}-${slide.colorName}`}
                    type="button"
                    onClick={() => setGalleryModal((current) => current ? { ...current, activeIndex: index } : current)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 8,
                      borderRadius: 16,
                      minWidth: 220,
                      border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.06)",
                      background: active ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.02)",
                      cursor: "pointer",
                      fontFamily: "'Outfit',sans-serif",
                      textAlign: "left",
                    }}
                  >
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      draggable={false}
                      style={{ width: 66, height: 66, borderRadius: 12, objectFit: "cover", display: "block", userSelect: "none", WebkitUserDrag: "none" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: "#f0eef5" }}>{slide.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(240,238,245,.45)", marginTop: 4 }}>{slide.colorName}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
        <div className="scroll-tabs" style={{ display: "flex", justifyContent: "center", gap: 8, margin: "28px 0 40px" }}>
          {[["tshirts", "Футболки"], ["hoodies", "Худи"], ["shoppers", "Шопперы"]].map(([key, label]) => (
            <button key={key} onClick={() => onNavigate(key)} className={`tb ${type === key ? "ta" : "ti"}`}>{label}</button>
          ))}
        </div>

        {/* Product cards */}
        <div className="textile-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 24, marginBottom: 48 }}>
          {data.items.map((item, i) => <ProductCard key={i} item={item} i={i} type={type} onAddTshirtSelection={type === "tshirts" ? addTshirtSelection : undefined} onOpenGallery={type === "tshirts" ? setGalleryModal : undefined} />)}
        </div>

        {type === "tshirts" && (
          <div className="cs" style={{ padding: 22, marginBottom: 24, border: "1px solid rgba(255,255,255,.06)" }}>
            <button
              type="button"
              onClick={() => setSizeGuideOpen((current) => !current)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "none",
                border: "none",
                color: "#f0eef5",
                cursor: "pointer",
                padding: 0,
                fontFamily: "'Outfit',sans-serif",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 6 }}>Спецификация</div>
                <div style={{ fontSize: 22, fontWeight: 500 }}>Размерная сетка</div>
                <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 6 }}>Открывает отдельное окно поверх страницы с таблицами размеров.</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M9 21H3v-6" />
                  <path d="m3 21 11-11" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {type === "tshirts" && (
          <div className="cs" style={{ padding: 26, marginBottom: 28, border: "1px solid rgba(232,67,147,.15)" }}>
            <div className="textile-order-summary" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: tshirtOrder.length ? 18 : 0 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 500 }}>Ваш заказ по футболкам</div>
                <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 6 }}>Добавляйте несколько позиций с разным кроем, плотностью, цветом, размером и количеством.</div>
              </div>
              <div className="textile-order-cards" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", minWidth: 160, border: "1px solid transparent" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.38)", textTransform: "uppercase", marginBottom: 6 }}>Всего в заказе</div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{tshirtOrderQty} <span style={{ fontSize: 14, color: "rgba(240,238,245,.45)" }}>шт</span></div>
                </div>
                <div ref={basketSummaryRef} style={{ padding: "12px 16px", borderRadius: 14, background: cartPulse ? "linear-gradient(135deg,rgba(232,67,147,.18),rgba(108,92,231,.18))" : "linear-gradient(135deg,rgba(232,67,147,.1),rgba(108,92,231,.1))", minWidth: 220, animation: cartPulse ? "cartPulseGlow .76s cubic-bezier(.22,.8,.24,1)" : "none", border: cartPulse ? "1px solid rgba(232,67,147,.32)" : "1px solid rgba(232,67,147,.16)", transition: "border-color .25s, background .25s, box-shadow .25s", boxShadow: cartPulse ? "0 12px 34px rgba(232,67,147,.16)" : "0 8px 24px rgba(232,67,147,.08)" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.42)", textTransform: "uppercase", marginBottom: 8 }}>Сумма заказа</div>
                  <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, background: "linear-gradient(135deg,#f08ac0,#9c8bff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{tshirtOrderTotal.toLocaleString("ru-RU")} ₽</div>
                </div>
              </div>
            </div>

            {tshirtOrder.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tshirtOrder.map((line) => (
                  <div key={line.id} className="textile-order-line" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "12px 14px", background: "rgba(255,255,255,.02)", borderRadius: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{line.itemName}</div>
                      <div style={{ fontSize: 13, color: "rgba(240,238,245,.45)" }}>
                        {[line.variantLabel ? `Плотность: ${line.variantLabel}` : null, line.size ? `Размер: ${line.size}` : null, line.color ? `Цвет: ${line.color}` : null].filter(Boolean).join(" • ")}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(240,238,245,.55)" }}>{(parsePriceValue(line.price) * line.qty).toLocaleString("ru-RU")} ₽</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 10, background: "rgba(255,255,255,.03)" }}>
                        <button onClick={() => updateTshirtSelectionQty(line.id, line.qty - 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#f0eef5", cursor: "pointer", fontSize: 18, lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>
                          −
                        </button>
                        <div style={{ minWidth: 52, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{line.qty} <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(240,238,245,.45)" }}>шт</span></div>
                        <button onClick={() => updateTshirtSelectionQty(line.id, line.qty + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "#f0eef5", cursor: "pointer", fontSize: 18, lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>
                          +
                        </button>
                      </div>
                      <button onClick={() => removeTshirtSelection(line.id)} style={{ background: "none", border: "1px solid rgba(255,255,255,.08)", color: "rgba(240,238,245,.55)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
                <a href={tshirtOrderLink} target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 8, display: "flex" }}>
                  <TG /> Отправить заказ в Telegram
                </a>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(240,238,245,.38)", marginTop: 14 }}>Пока нет добавленных позиций. Выберите параметры в карточках выше и нажмите «Добавить в заказ».</div>
            )}
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "24px 5%", textAlign: "center" }}><p style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.2)" }}>© 2026 Future Studio • СПб • DTF-печать</p></footer>
    </div>
  );
}

/* ══════════════════════════════════════════
   CALCULATOR PAGE
   ══════════════════════════════════════════ */
function CalcPage({ onBack }) {
  const [withApply, setWithApply] = useState(true);
  const [items, setItems] = useState([{ id: 1, w: 20, h: 30, qty: 10 }]);
  const [nid, setNid] = useState(2);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutViewportRef = useRef(null);

  const add = () => {
    if (items.length >= MAX_CALC_ITEMS) return;
    setItems([...items, { id: nid, w: 15, h: 20, qty: 5 }]);
    setNid((prev) => prev + 1);
  };
  const rm = (id) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const upd = (id, f, v) => {
    let n = parseFloat(v); if (isNaN(n) || n < 0) n = 0;
    if (f === "qty") n = Math.max(0, Math.round(n)); else n = Math.max(0, n);
    setItems(items.map(i => i.id === id ? { ...i, [f]: n } : i));
  };

  const valid = items.every(i => i.w > 0 && i.h > 0 && i.qty > 0);
  const oversized = items.some(i => Math.min(i.w, i.h) > BED_W);

  const packItems = items.map((it, idx) => ({ w: it.w, h: it.h, qty: it.qty, color: COLORS[idx % COLORS.length] }));
  const pack = valid && !oversized ? packOnBed(packItems) : { length: 0, placements: [] };

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const lengthCm = pack.length;
  const meters = lengthCm / 100;
  const metersRound = meters > 0 ? Math.max(1, Math.ceil(meters * 10) / 10) : 0;

  const useFormatPricing = withApply && totalQty > 0 && totalQty <= 15;
  const itemFormats = items.map(it => {
    const fmt = getFormat(it.w, it.h);
    return { ...it, format: fmt, formatCost: fmt ? fmt.price * it.qty : null };
  });
  const allFitsFormat = itemFormats.every(it => it.format !== null);
  const formatTotal = allFitsFormat ? itemFormats.reduce((s, it) => s + it.formatCost, 0) : 0;
  const isSmallOrder = useFormatPricing && allFitsFormat;

  const print = getPrintCost(metersRound);
  const apply = withApply ? getApplyCost(totalQty) : { rate: 0, cost: 0 };
  const standardTotal = print.cost + apply.cost;
  const total = isSmallOrder ? formatTotal : standardTotal;

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
            {items.map((it, idx) => (
              <div key={it.id} className="cs calc-panel" style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Принт #{idx + 1}</span>
                  {items.length > 1 && <button onClick={() => rm(it.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(240,238,245,.3)", cursor: "pointer", fontSize: 16, fontFamily: "inherit" }} onMouseEnter={e => e.target.style.color = "#e84393"} onMouseLeave={e => e.target.style.color = "rgba(240,238,245,.3)"}>✕</button>}
                </div>
                <div className="calc-item-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[["Ширина, см", "w"], ["Высота, см", "h"], ["Кол-во", "qty"]].map(([label, f]) => (
                    <div key={f}>
                      <label style={{ fontSize: 10, fontWeight: 400, color: "rgba(240,238,245,.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5, display: "block" }}>{label}</label>
                      <input type="number" value={it[f] || ""} onChange={e => upd(it.id, f, e.target.value)} className="inf" style={{ padding: "10px 12px", fontSize: 16, fontWeight: 500, textAlign: "center" }} min={f === "qty" ? 1 : 0.1} step={f === "qty" ? 1 : 0.5} />
                    </div>
                  ))}
                </div>
                {(Math.min(it.w, it.h) > BED_W && it.w > 0 && it.h > 0) && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.2)", fontSize: 12, color: "#ff6b6b" }}>
                    Обе стороны &gt; {BED_W} см — не помещается
                  </div>
                )}
              </div>
            ))}
            {items.length < MAX_CALC_ITEMS && (
              <button onClick={add} style={{ background: "rgba(255,255,255,.02)", border: "1.5px dashed rgba(255,255,255,.1)", borderRadius: 20, padding: 18, cursor: "pointer", color: "rgba(240,238,245,.35)", fontSize: 14, fontFamily: "'Outfit',sans-serif", transition: "all .3s" }} onMouseEnter={e => { e.target.style.borderColor = "rgba(232,67,147,.4)"; e.target.style.color = "#e84393"; }} onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,.1)"; e.target.style.color = "rgba(240,238,245,.35)"; }}>
                + Добавить размер
              </button>
            )}
            <div style={{ fontSize: 12, color: "rgba(240,238,245,.38)", marginTop: items.length < MAX_CALC_ITEMS ? -4 : 0 }}>
              Добавлено {items.length} из {MAX_CALC_ITEMS} размеров.
            </div>

            {valid && !oversized && lengthCm > 0 && (
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
                          return (
                            <g key={i}>
                              <rect x={pad + p.x * scale} y={bedTop + renderY * scale} width={Math.max(p.w * scale - .3, 1)} height={Math.max(p.h * scale - .3, 1)} fill={p.color} stroke="rgba(255,255,255,.15)" strokeWidth=".5" rx="2" />
                              {p.w * scale > 30 && p.h * scale > 16 && (
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
                    {[["Всего принтов", `${totalQty} шт`], ["Длина печати", `${lengthCm.toFixed(1)} см`], ["Погонных метров", `${metersRound.toFixed(1)} м`]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.02)", borderRadius: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>{l}</span>
                        <span style={{ fontSize: 17, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                    {!isSmallOrder && meters > 0 && meters < 1 && (
                      <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,80,80,.08)", border: "1.5px solid rgba(255,80,80,.25)", display: "flex", alignItems: "center", gap: 12 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#ff6b6b" }}>Минимальный заказ — 1 п/м</div>
                          <div style={{ fontSize: 12, fontWeight: 300, color: "rgba(255,107,107,.6)", marginTop: 2 }}>Добавьте больше принтов для оформления заказа</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                    {isSmallOrder ? (
                      <>
                        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(108,92,231,.06)", border: "1px solid rgba(108,92,231,.15)", marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 400, color: "#6c5ce7" }}>Расчёт по формату (до 15 шт, с нанесением)</div>
                        </div>
                        {itemFormats.map((it, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 400, display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                                {it.w}×{it.h} см → {it.format.name}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)", marginLeft: 18 }}>{it.qty} шт × {it.format.price} ₽</div>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 600 }}>{it.formatCost.toLocaleString("ru")} ₽</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><div style={{ fontSize: 14, fontWeight: 400 }}>Печать</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)" }}>{metersRound.toFixed(1)} м × {print.rate} ₽/м</div></div>
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

                  <div style={{ marginTop: 20, padding: "18px 22px", borderRadius: 14, background: "linear-gradient(135deg,rgba(232,67,147,.1),rgba(108,92,231,.1))", border: "1px solid rgba(232,67,147,.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>Итого</span>
                      <span style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total.toLocaleString("ru")} ₽</span>
                    </div>
                    {totalQty > 0 && <div style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)", marginTop: 4, textAlign: "right" }}>≈ {Math.round(total / totalQty)} ₽ / принт</div>}
                  </div>

                  {(!isSmallOrder && meters > 0 && meters < 1) ? (
                    <div style={{ width: "100%", textAlign: "center", marginTop: 18, padding: "14px 36px", borderRadius: 50, background: "rgba(255,255,255,.04)", color: "rgba(240,238,245,.25)", fontSize: 16, fontWeight: 500, fontFamily: "'Outfit',sans-serif", cursor: "not-allowed" }}>Минимум 1 п/м для заказа</div>
                  ) : (
                    <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex" }}><TG /> Оформить заказ</a>
                  )}
                </>
              )}
            </div>

            {isSmallOrder ? (
              <div className="cs calc-panel" style={{ padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Цены по формату (до 15 шт, печать + нанесение)</div>
                {FORMAT_PRICES.map((f, i) => {
                  const active = itemFormats.some(it => it.format && it.format.name === f.name);
                  return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderRadius: 8, background: active ? "rgba(232,67,147,.08)" : "transparent" }}><span style={{ fontSize: 13, fontWeight: 300, color: active ? "#e84393" : "rgba(240,238,245,.35)" }}>{f.name} ({f.short}×{f.long})</span><span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#e84393" : "rgba(240,238,245,.45)" }}>{f.price} ₽/шт</span></div>;
                })}
              </div>
            ) : (
              <>
                <div className="cs calc-panel" style={{ padding: 22 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Тарифы — печать</div>
                  {PRINT_TIERS.map((t, i) => {
                    const a = valid && metersRound > 0 && Math.ceil(metersRound) >= t.min && Math.ceil(metersRound) <= t.max;
                    return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderRadius: 8, background: a ? "rgba(232,67,147,.08)" : "transparent" }}><span style={{ fontSize: 13, fontWeight: 300, color: a ? "#e84393" : "rgba(240,238,245,.35)" }}>{t.max === Infinity ? `от ${t.min} м` : `${t.min}–${t.max} м`}</span><span style={{ fontSize: 13, fontWeight: a ? 600 : 400, color: a ? "#e84393" : "rgba(240,238,245,.45)" }}>{t.price} ₽/м</span></div>;
                  })}
                </div>
                {withApply && (
                  <div className="cs calc-panel" style={{ padding: 22 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Тарифы — нанесение</div>
                    {APPLY_TIERS.map((t, i) => {
                      const a = valid && totalQty >= t.min && totalQty <= t.max;
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
    </div>
  );
}

function ConstructorPage({ onBack }) {
  const [activeTab, setActiveTab] = useState("textile");
  const [productKey, setProductKey] = useState("oversize");
  const [side, setSide] = useState("front");
  const [color, setColor] = useState("Чёрный");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [uploadDesign, setUploadDesign] = useState(null);
  const [uploadScale, setUploadScale] = useState(78);
  const [uploadPosition, setUploadPosition] = useState({ x: 50, y: 50 });
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textWeight, setTextWeight] = useState(700);
  const [textUppercase, setTextUppercase] = useState(true);
  const [presetKey, setPresetKey] = useState("");
  const [presetScale, setPresetScale] = useState(52);
  const [basket, setBasket] = useState([]);
  const printAreaRef = useRef(null);

  const product = CONSTRUCTOR_PRODUCTS.find((item) => item.key === productKey) || CONSTRUCTOR_PRODUCTS[0];
  const printArea = product.printAreas[side];
  const previewSrc = svgToDataUri(buildTshirtMockupSvg({ model: product.model, colorName: color, view: side }));
  const selectedPreset = CONSTRUCTOR_PRESET_PRINTS.find((item) => item.key === presetKey) || null;
  const hasDecoration = Boolean(uploadDesign || textValue.trim() || selectedPreset);
  const canAddToBasket = Boolean(size && hasDecoration && qty >= 1);
  const currentTotal = product.price * qty;
  const currentOrderLine = {
    productName: product.name,
    color,
    size,
    qty,
    side,
    uploadName: uploadDesign?.name || "",
    text: textValue.trim(),
    presetLabel: selectedPreset?.label || "",
    total: currentTotal,
  };

  const getUploadMetrics = (scaleValue = uploadScale) => {
    if (!printAreaRef.current || !uploadDesign?.width || !uploadDesign?.height) return null;

    const { width: areaWidth, height: areaHeight } = printAreaRef.current.getBoundingClientRect();
    if (!areaWidth || !areaHeight) return null;

    const aspectRatio = uploadDesign.width / uploadDesign.height;
    const preferredWidth = areaWidth * (scaleValue / 100);
    const width = Math.min(preferredWidth, areaHeight * aspectRatio, areaWidth);
    const height = aspectRatio ? width / aspectRatio : areaHeight;

    return { areaWidth, areaHeight, width, height };
  };

  const clampUploadPosition = (position, metrics = getUploadMetrics()) => {
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    if (!metrics) {
      return { x: clamp(position.x, 0, 100), y: clamp(position.y, 0, 100) };
    }

    const minX = (metrics.width / 2 / metrics.areaWidth) * 100;
    const maxX = 100 - minX;
    const minY = (metrics.height / 2 / metrics.areaHeight) * 100;
    const maxY = 100 - minY;

    return {
      x: minX > maxX ? 50 : clamp(position.x, minX, maxX),
      y: minY > maxY ? 50 : clamp(position.y, minY, maxY),
    };
  };

  const resolveUploadPositionFromPointer = (clientX, clientY) => {
    if (!printAreaRef.current) return uploadPosition;
    const rect = printAreaRef.current.getBoundingClientRect();
    const nextPosition = {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
    return clampUploadPosition(nextPosition);
  };

  const handleProductChange = (nextProductKey) => {
    const nextProduct = CONSTRUCTOR_PRODUCTS.find((item) => item.key === nextProductKey);
    if (!nextProduct) return;
    setProductKey(nextProductKey);
    setSize("");
    if (!nextProduct.colors.includes(color)) {
      setColor(nextProduct.colors[0]);
    }
  };

  const handleColorChange = (nextColor) => {
    const resolvedColor = nextColor || product.colors[0];
    const previousAutoTextColor = color === "Белый" ? "#111111" : "#ffffff";
    setColor(resolvedColor);
    if (textColor === previousAutoTextColor) {
      setTextColor(resolvedColor === "Белый" ? "#111111" : "#ffffff");
    }
  };

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = await readFileAsDataUrl(file);
    const dimensions = await readImageSize(src);
    setUploadDesign({ name: file.name, src, ...dimensions });
    setUploadPosition({ x: 50, y: 50 });
    setActiveTab("upload");
  };

  const handleUploadScaleChange = (event) => {
    const nextScale = Number(event.target.value);
    setUploadScale(nextScale);
    setUploadPosition((current) => clampUploadPosition(current, getUploadMetrics(nextScale)));
  };

  const handleUploadRemove = () => {
    setUploadDesign(null);
    setUploadPosition({ x: 50, y: 50 });
    setIsDraggingUpload(false);
  };

  const handleUploadPointerDown = (event) => {
    if (!uploadDesign || !printAreaRef.current) return;

    event.preventDefault();

    const pointerId = event.pointerId;
    const node = event.currentTarget;
    const updatePosition = (clientX, clientY) => {
      const nextPosition = resolveUploadPositionFromPointer(clientX, clientY);
      setUploadPosition((current) => (
        current.x === nextPosition.x && current.y === nextPosition.y ? current : nextPosition
      ));
    };

    setIsDraggingUpload(true);
    node.setPointerCapture?.(pointerId);
    updatePosition(event.clientX, event.clientY);

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const stopDragging = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      setIsDraggingUpload(false);
      node.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  const addCurrentToBasket = () => {
    if (!canAddToBasket) return;
    setBasket((current) => [
      ...current,
      {
        ...currentOrderLine,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
    ]);
    setActiveTab("order");
  };

  const removeBasketItem = (id) => {
    setBasket((current) => current.filter((item) => item.id !== id));
  };

  const telegramLink = buildConstructorTelegramLink(basket.length ? basket : [currentOrderLine]);
  const basketTotal = (basket.length ? basket : [currentOrderLine]).reduce((sum, item) => sum + item.total, 0);
  const overlayText = textUppercase ? textValue.toUpperCase() : textValue;

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh" }}>
      <style>{STYLES}</style>

      <div className="page-shell" style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 5% 56px" }}>
        <button type="button" onClick={onBack} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "inherit", padding: 0, font: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e84393" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          <LogoMini />
        </button>

        <div style={{ textAlign: "center", margin: "34px auto 28px", maxWidth: 860 }}>
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Новая страница</span>
          <h1 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 200, marginTop: 12 }}>
            Конструктор <span style={{ fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>футболок</span>
          </h1>
          <p style={{ color: "rgba(240,238,245,.45)", fontWeight: 300, fontSize: 15, marginTop: 10, lineHeight: 1.75 }}>
            Отдельный экран для быстрого подбора базовой или оверсайз футболки, выбора стороны печати, загрузки макета, добавления текста и отправки заказа менеджеру.
          </p>
        </div>

        <div className="constructor-shell" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 26, alignItems: "start" }}>
          <div className="cs constructor-preview constructor-panel" style={{ padding: 24, border: "1px solid rgba(255,255,255,.06)", position: "sticky", top: 28 }}>
            <div className="constructor-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.8, color: "rgba(240,238,245,.4)", textTransform: "uppercase", marginBottom: 6 }}>Предпросмотр</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{product.name}</div>
                <div style={{ fontSize: 14, color: "rgba(240,238,245,.45)", marginTop: 8 }}>{product.description}</div>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 16, background: "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))", border: "1px solid rgba(232,67,147,.12)" }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(240,238,245,.38)", marginBottom: 6 }}>Предварительно</div>
                <div style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg,#f08ac0,#9c8bff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{currentTotal.toLocaleString("ru-RU")} ₽</div>
              </div>
            </div>

            <div style={{ borderRadius: 28, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)", position: "relative" }}>
              <img src={previewSrc} alt={`${product.name} — ${color}`} draggable={false} style={{ width: "100%", display: "block", aspectRatio: "1 / 1.08", objectFit: "cover", userSelect: "none", WebkitUserDrag: "none" }} />
              <div ref={printAreaRef} style={{ position: "absolute", left: `${printArea.left}%`, top: `${printArea.top}%`, width: `${printArea.width}%`, height: `${printArea.height}%`, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                {selectedPreset ? <img src={selectedPreset.src} alt={selectedPreset.label} draggable={false} style={{ position: "absolute", width: `${presetScale}%`, maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.25))" }} /> : null}
                {uploadDesign ? <div role="presentation" onPointerDown={handleUploadPointerDown} style={{ position: "absolute", left: `${uploadPosition.x}%`, top: `${uploadPosition.y}%`, transform: "translate(-50%, -50%)", width: `${uploadScale}%`, maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto", cursor: isDraggingUpload ? "grabbing" : "grab", touchAction: "none" }}><img src={uploadDesign.src} alt={uploadDesign.name} draggable={false} style={{ width: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.24))", userSelect: "none", WebkitUserDrag: "none" }} /></div> : null}
                {overlayText ? <div style={{ position: "absolute", bottom: "8%", maxWidth: "100%", padding: "0 6%", textAlign: "center", fontSize: `${textSize}px`, lineHeight: 1.05, fontWeight: textWeight, color: textColor, letterSpacing: 1, textShadow: color === "Белый" ? "0 2px 14px rgba(0,0,0,.16)" : "0 2px 14px rgba(0,0,0,.32)" }}>{overlayText}</div> : null}
              </div>
              <div style={{ position: "absolute", left: 16, top: 16, padding: "7px 11px", borderRadius: 999, background: "rgba(8,8,12,.72)", border: "1px solid rgba(255,255,255,.08)", fontSize: 12, fontWeight: 500, color: "#f0eef5", backdropFilter: "blur(10px)" }}>{side === "front" ? "Спереди" : "Сзади"}</div>
            </div>

            <div className="constructor-meta-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 14 }}>
              {[["Модель", product.name.replace("футболка", "").trim()], ["Цвет", color], ["Размер", size || "—"], ["Кол-во", `${qty} шт`]].map(([label, value]) => (
                <div key={label} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(240,238,245,.36)", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="cs constructor-panel" style={{ padding: 12, border: "1px solid rgba(255,255,255,.06)" }}>
              <div className="scroll-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CONSTRUCTOR_TABS.map(([key, label]) => {
                  const active = activeTab === key;
                  return <button key={key} type="button" onClick={() => setActiveTab(key)} className={`tb ${active ? "ta" : "ti"}`} style={{ padding: "10px 18px" }}>{label}</button>;
                })}
              </div>
            </div>

            {activeTab === "textile" ? (
              <div className="cs constructor-panel" style={{ padding: 24, border: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 14 }}>
                <SelectorTitle>Текстиль</SelectorTitle>
                <FieldRow label="Модель" minHeight={112}>
                  <div className="constructor-two-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                    {CONSTRUCTOR_PRODUCTS.map((item) => {
                      const active = item.key === productKey;
                      return <button key={item.key} type="button" onClick={() => handleProductChange(item.key)} style={{ textAlign: "left", padding: 16, borderRadius: 16, border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}><div style={{ fontSize: 16, fontWeight: 600, color: "#f0eef5" }}>{item.name}</div><div style={{ fontSize: 13, color: "rgba(240,238,245,.45)", marginTop: 6 }}>{item.description}</div><div style={{ fontSize: 15, fontWeight: 600, color: "#e84393", marginTop: 10 }}>{item.price.toLocaleString("ru-RU")} ₽</div></button>;
                    })}
                  </div>
                </FieldRow>
                <FieldRow label="Сторона">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[["front", "Спереди"], ["back", "Спина"]].map(([key, label]) => <button key={label} type="button" onClick={() => setSide(key)} className={`tb ${side === key ? "ta" : "ti"}`} style={{ padding: "9px 16px" }}>{label}</button>)}
                  </div>
                </FieldRow>
                <ColorSelector options={product.colors} value={color} onChange={handleColorChange} />
                <SizeSelector options={product.sizes} value={size} onChange={setSize} />
                <QtySelector value={qty} onChange={setQty} />
              </div>
            ) : null}

            {activeTab === "upload" ? (
              <div className="cs constructor-panel" style={{ padding: 24, border: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 14 }}>
                <SelectorTitle>Загрузить макет</SelectorTitle>
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 180, borderRadius: 20, border: "1.5px dashed rgba(255,255,255,.12)", background: "rgba(255,255,255,.02)", cursor: "pointer", textAlign: "center", padding: 20 }}>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUploadChange} style={{ display: "none" }} />
                  <div style={{ fontSize: 18, fontWeight: 500 }}>Перетащите файл или выберите изображение</div>
                  <div style={{ fontSize: 13, color: "rgba(240,238,245,.45)", maxWidth: 380 }}>Подойдут PNG, JPG, WEBP или SVG. Загруженный макет сразу появится на превью футболки.</div>
                </label>
                {uploadDesign ? <><FieldRow label="Файл"><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><span style={{ fontSize: 14, color: "rgba(240,238,245,.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uploadDesign.name}</span><button type="button" onClick={handleUploadRemove} className="bo" style={{ padding: "8px 14px", fontSize: 13 }}>Удалить</button></div></FieldRow><FieldRow label="Масштаб"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="35" max="100" value={uploadScale} onChange={handleUploadScaleChange} style={{ width: "100%" }} /><span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{uploadScale}%</span></div></FieldRow><FieldRow label="Позиция"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ fontSize: 13, color: "rgba(240,238,245,.48)" }}>Перетаскивайте изображение мышкой прямо на превью.</span><button type="button" onClick={() => setUploadPosition({ x: 50, y: 50 })} className="bo" style={{ padding: "8px 14px", fontSize: 13 }}>По центру</button></div></FieldRow></> : null}
              </div>
            ) : null}

            {activeTab === "text" ? (
              <div className="cs constructor-panel" style={{ padding: 24, border: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 14 }}>
                <SelectorTitle>Текст</SelectorTitle>
                <textarea className="inf" rows={4} placeholder="Например: FUTURE TEAM" value={textValue} onChange={(event) => setTextValue(event.target.value)} style={{ resize: "vertical", minHeight: 118 }} />
                <FieldRow label="Размер"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="18" max="72" value={textSize} onChange={(event) => setTextSize(Number(event.target.value))} style={{ width: "100%" }} /><span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{textSize}px</span></div></FieldRow>
                <FieldRow label="Насыщенность"><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[400, 500, 700, 800].map((weight) => <button key={weight} type="button" onClick={() => setTextWeight(weight)} className={`tb ${textWeight === weight ? "ta" : "ti"}`} style={{ padding: "9px 14px" }}>{weight}</button>)}</div></FieldRow>
                <FieldRow label="Цвет"><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{[["#ffffff", "Белый"], ["#111111", "Чёрный"], ["#e84393", "Розовый"], ["#6c5ce7", "Фиолетовый"]].map(([hex, label]) => <button key={hex} type="button" onClick={() => setTextColor(hex)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px 7px 7px", borderRadius: 999, border: textColor === hex ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)", background: textColor === hex ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: hex, border: "1px solid rgba(255,255,255,.18)" }} /><span style={{ fontSize: 13, color: "rgba(240,238,245,.7)" }}>{label}</span></button>)}</div></FieldRow>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "rgba(240,238,245,.65)", cursor: "pointer" }}><input type="checkbox" checked={textUppercase} onChange={(event) => setTextUppercase(event.target.checked)} />Автоматически переводить текст в верхний регистр</label>
              </div>
            ) : null}

            {activeTab === "prints" ? (
              <div className="cs constructor-panel" style={{ padding: 24, border: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 14 }}>
                <SelectorTitle>Быстрые принты</SelectorTitle>
                <div className="constructor-two-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  {CONSTRUCTOR_PRESET_PRINTS.map((item) => {
                    const active = presetKey === item.key;
                    return <button key={item.key} type="button" onClick={() => setPresetKey(active ? "" : item.key)} style={{ padding: 12, borderRadius: 18, border: active ? "1px solid rgba(232,67,147,.3)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.14),rgba(108,92,231,.14))" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: "inherit" }}><img src={item.src} alt={item.label} draggable={false} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 14, objectFit: "cover", display: "block" }} /><div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", marginTop: 10 }}>{item.label}</div></button>;
                  })}
                </div>
                {selectedPreset ? <FieldRow label="Масштаб"><div style={{ display: "flex", alignItems: "center", gap: 14 }}><input type="range" min="24" max="80" value={presetScale} onChange={(event) => setPresetScale(Number(event.target.value))} style={{ width: "100%" }} /><span style={{ minWidth: 52, textAlign: "right", fontSize: 13, color: "rgba(240,238,245,.6)" }}>{presetScale}%</span></div></FieldRow> : null}
              </div>
            ) : null}

            {activeTab === "order" ? (
              <div className="cs constructor-panel" style={{ padding: 24, border: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 14 }}>
                <SelectorTitle>В заказ</SelectorTitle>
                <div className="constructor-two-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}><div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(240,238,245,.36)", marginBottom: 6 }}>Текущая конфигурация</div><div style={{ fontSize: 18, fontWeight: 600 }}>{product.name}</div><div style={{ fontSize: 14, color: "rgba(240,238,245,.5)", marginTop: 8, lineHeight: 1.65 }}>Цвет: {color}<br />Сторона: {side === "front" ? "спереди" : "сзади"}<br />Размер: {size || "не выбран"}<br />Кол-во: {qty} шт</div></div>
                  <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}><div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(240,238,245,.36)", marginBottom: 6 }}>Макет</div><div style={{ fontSize: 14, color: "rgba(240,238,245,.72)", lineHeight: 1.7 }}>{uploadDesign ? `Файл: ${uploadDesign.name}` : "Файл не загружен"}<br />{textValue.trim() ? `Текст: ${textValue.trim()}` : "Текст не добавлен"}<br />{selectedPreset ? `Принт: ${selectedPreset.label}` : "Пресет не выбран"}</div></div>
                </div>
                <div className="constructor-order-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button type="button" onClick={addCurrentToBasket} disabled={!canAddToBasket} className="btg" style={{ flex: 1, justifyContent: "center", opacity: canAddToBasket ? 1 : 0.45, cursor: canAddToBasket ? "pointer" : "not-allowed", filter: canAddToBasket ? "none" : "grayscale(.15)" }}>+ Добавить конфигурацию</button><a href={telegramLink} target="_blank" rel="noopener noreferrer" className="bo" style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "14px 22px" }}>Отправить в Telegram</a></div>
                <div style={{ fontSize: 12, color: "rgba(240,238,245,.42)", lineHeight: 1.6 }}>Для добавления конфигурации выберите размер и добавьте хотя бы один элемент: файл, текст или быстрый принт.</div>
                <div className="cs constructor-panel" style={{ padding: 18, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
                  <div className="constructor-basket-summary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: basket.length ? 12 : 0 }}><div><div style={{ fontSize: 18, fontWeight: 600 }}>Ваш список</div><div style={{ fontSize: 13, color: "rgba(240,238,245,.42)", marginTop: 4 }}>Можно собрать несколько разных футболок перед отправкой.</div></div><div style={{ fontSize: 24, fontWeight: 700, background: "linear-gradient(135deg,#f08ac0,#9c8bff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{basketTotal.toLocaleString("ru-RU")} ₽</div></div>
                  {basket.length ? basket.map((item) => <div key={item.id} className="constructor-basket-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontSize: 14, lineHeight: 1.7 }}><div style={{ fontWeight: 600 }}>{item.productName}</div><div style={{ color: "rgba(240,238,245,.5)" }}>{item.color} • {item.size} • {item.qty} шт • {item.side === "front" ? "спереди" : "сзади"}</div><div style={{ color: "rgba(240,238,245,.42)" }}>{[item.uploadName, item.text ? `текст: ${item.text}` : null, item.presetLabel].filter(Boolean).join(" • ") || "без дополнительных элементов"}</div></div><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}><div style={{ fontSize: 16, fontWeight: 600 }}>{item.total.toLocaleString("ru-RU")} ₽</div><button type="button" onClick={() => removeBasketItem(item.id)} className="bo" style={{ padding: "8px 12px", fontSize: 13 }}>Удалить</button></div></div>) : <div style={{ fontSize: 14, color: "rgba(240,238,245,.42)", marginTop: 12 }}>Пока нет сохранённых конфигураций. Соберите футболку и нажмите «Добавить конфигурацию».</div>}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN SITE
   ══════════════════════════════════════════ */
const NAV = ["Главная", "Портфолио", "Текстиль", "Цены", "Отзывы", "Контакты"];
const SCROLL_NAV = { "Главная": "hero", "Цены": "pricing", "Отзывы": "reviews", "Контакты": "contact" };
const TEXTILE_MENU = [["tshirts", "Футболки"], ["hoodies", "Худи"], ["shoppers", "Шопперы"]];
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
  { text: "Мин. стоимость — 500 ₽" },
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

  if (pg === "constructor") return <ConstructorPage onBack={() => navigateToPage("main")} />;
  if (pg === "calc") return <CalcPage onBack={() => navigateToPage("main")} />;
  if (pg === "portfolio") return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080c", color: "#f0eef5", fontFamily: "'Outfit',sans-serif" }}>Загрузка портфолио…</div>}>
      <PortfolioPage onBack={() => navigateToPage("main")} />
    </Suspense>
  );
  if (pg.startsWith("textile_")) return <TextilePage type={pg.replace("textile_", "")} onBack={() => navigateToPage("main")} onNavigate={(t) => navigateToPage("textile_" + t)} />;

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif", background: "#08080c", color: "#f0eef5", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{STYLES}</style>

      {/* NAV */}
      <nav className="nb" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: sy > 50 ? "rgba(8,8,12,.85)" : "rgba(8,8,12,0)", boxShadow: sy > 50 ? "inset 0 -1px 0 rgba(255,255,255,.05)" : "inset 0 -1px 0 rgba(255,255,255,0)", transition: "background-color .35s ease, box-shadow .35s ease", padding: "0 5%", willChange: "background-color, box-shadow" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
          <div className="nav-left">
            <button type="button" onClick={() => go("Главная")} style={{ background: "none", border: "none", color: "inherit", padding: 0, font: "inherit", cursor: "pointer" }} aria-label="На главную">
              <LogoMini />
            </button>
            <button onClick={oc} className="nav-calc-btn nav-desktop-calc" style={{ background: "linear-gradient(135deg,#e84393,#6c5ce7)", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Оптовый калькулятор</button>
          </div>
          <div style={{ gap: 28, alignItems: "center" }} className="nav-main nav-desktop-main">
            {NAV.map(n => n === "Текстиль" ? (
              <div
                key={n}
                style={{ position: "relative" }}
                onMouseEnter={() => setTxMenuOpen(true)}
                onMouseLeave={() => setTxMenuOpen(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setTxMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={txMenuOpen}
                  onClick={() => setTxMenuOpen((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setTxMenuOpen(true);
                    }
                    if (event.key === "Escape") {
                      setTxMenuOpen(false);
                    }
                  }}
                  style={{ cursor: "pointer", fontSize: 14, fontWeight: 300, letterSpacing: 1.5, color: txMenuOpen || pg.startsWith("textile_") ? "#e84393" : "rgba(240,238,245,.6)", transition: "color .3s", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, fontFamily: "inherit" }}
                >
                  {n}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform .3s", transform: txMenuOpen ? "rotate(180deg)" : "rotate(0)" }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {txMenuOpen && (
                  <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", paddingTop: 8, zIndex: 110 }}>
                    <div role="menu" aria-label="Разделы текстиля" style={{ background: "rgba(16,16,24,.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "8px 0", minWidth: 160, boxShadow: "0 16px 48px rgba(0,0,0,.5)" }}>
                      {TEXTILE_MENU.map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => { setTxMenuOpen(false); goTextile(key); }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 14, fontWeight: 300, color: pg === "textile_" + key ? "#e84393" : "rgba(240,238,245,.6)", cursor: "pointer", transition: "all .2s", letterSpacing: 0.5, background: "none", border: "none", fontFamily: "inherit" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#e84393"; e.currentTarget.style.background = "rgba(232,67,147,.06)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = pg === "textile_" + key ? "#e84393" : "rgba(240,238,245,.6)"; e.currentTarget.style.background = "transparent"; }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" key={n} onClick={() => go(n)} style={{ cursor: "pointer", fontSize: 14, fontWeight: 300, letterSpacing: 1.5, color: ac === n ? "#e84393" : "rgba(240,238,245,.6)", transition: "color .3s", textTransform: "uppercase", background: "none", border: "none", padding: 0, fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.color = "#e84393"} onMouseLeave={e => { if (ac !== n) e.currentTarget.style.color = "rgba(240,238,245,.6)"; }}>{n}</button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="nav-contacts">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }} className="nav-contacts-stack">
                <a href="tel:+79500003464" style={{ color: "#f0eef5", textDecoration: "none", fontSize: 14, fontWeight: 500, letterSpacing: 0.4, whiteSpace: "nowrap", transition: "color .3s" }} onMouseEnter={e => e.currentTarget.style.color = "#e84393"} onMouseLeave={e => e.currentTarget.style.color = "#f0eef5"}>+7 (950) 000-34-64</a>
                <a href="mailto:future178@yandex.ru" style={{ color: "rgba(240,238,245,.58)", textDecoration: "none", fontSize: 12, fontWeight: 300, letterSpacing: 0.3, whiteSpace: "nowrap", transition: "color .3s" }} onMouseEnter={e => e.currentTarget.style.color = "#e84393"} onMouseLeave={e => e.currentTarget.style.color = "rgba(240,238,245,.58)"}>future178@yandex.ru</a>
              </div>
              <div className="nav-socials">
                <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="nav-social-btn" style={{ width: 38, height: 38, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "linear-gradient(135deg,#0088cc,#6c5ce7)", boxShadow: "0 8px 24px rgba(0,136,204,.2)" }}>
                  <TG />
                </a>
                <a href="https://wa.me/79500003464" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="nav-social-btn" style={{ width: 38, height: 38, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "linear-gradient(135deg,#25D366,#128C7E)", boxShadow: "0 8px 24px rgba(37,211,102,.2)" }}>
                  <WA />
                </a>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setMn(!mn)} className="mobile-nav-trigger" aria-label={mn ? "Закрыть меню" : "Открыть меню"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </nav>

      {mn && (
        <div className="mobile-nav-overlay" onClick={() => setMn(false)}>
          <div className="mobile-nav-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-nav-head">
              <div>
                <div className="mobile-nav-eyebrow">Навигация</div>
                <div className="mobile-nav-title">Разделы сайта</div>
                <div className="mobile-nav-subtitle">Собрал все основные действия в одном выезжающем меню, чтобы на телефоне ничего не нужно было свайпать по горизонтали.</div>
              </div>
              <button type="button" className="mobile-nav-close" onClick={() => setMn(false)} aria-label="Закрыть меню">×</button>
            </div>

            <div className="mobile-nav-group">
              <div className="mobile-nav-section-title">Основное</div>
              {NAV.filter((item) => item !== "Текстиль").map((item) => {
                const isActive = ac === item || (item === "Главная" && pg === "main") || (item === "Портфолио" && pg === "portfolio");
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => go(item)}
                    className={`mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}
                  >
                    <span>{item}</span>
                    <span style={{ color: isActive ? "#fff" : "rgba(240,238,245,.32)" }}>+</span>
                  </button>
                );
              })}
            </div>

            <div className="mobile-nav-group">
              <div className="mobile-nav-section-title">Текстиль</div>
              <div className="mobile-nav-submenu">
                {TEXTILE_MENU.map(([key, label]) => {
                  const isActive = pg === `textile_${key}`;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => goTextile(key)}
                      className={`mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}
                    >
                      <span>{label}</span>
                      <span style={{ color: isActive ? "#fff" : "rgba(240,238,245,.32)" }}>+</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mobile-nav-actions">
              <button type="button" onClick={() => { setMn(false); goConstructor(); }} className="bo mobile-nav-action">Конструктор футболок</button>
              <button type="button" onClick={() => { setMn(false); oc(); }} className="bp mobile-nav-action">Оптовый калькулятор</button>
            </div>

            <div className="mobile-nav-meta">
              <a href="tel:+79500003464" style={{ fontSize: 18, fontWeight: 500, letterSpacing: 0.6, color: "#f0eef5" }}>+7 (950) 000-34-64</a>
              <a href="mailto:future178@yandex.ru" style={{ fontSize: 14, fontWeight: 300, letterSpacing: 0.4, color: "rgba(240,238,245,.6)" }}>future178@yandex.ru</a>
              <div className="mobile-nav-socials">
                <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" aria-label="Telegram" style={{ background: "linear-gradient(135deg,#0088cc,#6c5ce7)" }}>
                  <TG />
                </a>
                <a href="https://wa.me/79500003464" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
                  <WA />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section id="hero" className="hero-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 5% 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(232,67,147,.12) 0%,transparent 70%)", top: -100, left: -150, animation: "float 8s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(108,92,231,.1) 0%,transparent 70%)", bottom: -50, right: -100, animation: "float 10s ease-in-out infinite 2s", pointerEvents: "none" }} />
        <A><LogoFull /></A>
        <A delay={.15}><h1 className="hero-title" style={{ fontSize: "clamp(28px,5vw,56px)", fontWeight: 200, letterSpacing: 2, marginTop: 24, lineHeight: 1.3 }}>DTF-печать <span style={{ background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 500 }}>нового поколения</span></h1></A>
        <A delay={.3}><p className="hero-subtitle" style={{ fontSize: "clamp(15px,2vw,18px)", fontWeight: 300, color: "rgba(240,238,245,.5)", maxWidth: 560, margin: "20px auto 0", lineHeight: 1.7 }}>Собственное современное производство в Санкт-Петербурге. Яркие, стойкие принты на любых тканях — от 1 штуки до крупных тиражей.</p></A>

        <A delay={.4}><div className="hero-rating" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, background: "rgba(255,255,255,.04)", padding: "8px 20px", borderRadius: 50, border: "1px solid rgba(255,255,255,.06)" }}><Stars /><span style={{ fontSize: 14, fontWeight: 500 }}>5.0</span><span style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)" }}>• 63 оценки</span></div></A>
        <A delay={.5} className="flex gap-4 mt-10 flex-wrap justify-center hero-actions">
          <button className="bp hero-primary" onClick={() => go("Контакты")}>Оставить заявку</button>
          <button className="bo hero-secondary" onClick={goConstructor}>Конструктор футболок</button>
          <button className="bcalc hero-tertiary" onClick={oc}><CalcIcon /> Оптовый калькулятор</button>
          <a className="btg hero-support" href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer"><TG /> Быстрый ответ</a>
        </A>
        <A delay={.65} className="flex gap-12 mt-20 flex-wrap justify-center hero-stats">
          {[["3 000+", "Заказов"], ["от 1 шт", "Печатаем"], ["от 30мин", "Срочно"]].map(([v, l]) => <div key={l} className="hero-stat" style={{ textAlign: "center" }}><div style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{v}</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.4)", letterSpacing: 1, marginTop: 4 }}>{l}</div></div>)}
        </A>
      </section>


      {/* PRICING */}
      <section id="pricing" className="section-shell" style={{ padding: "100px 5%" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <A className="text-center mb-12"><span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#e84393", textTransform: "uppercase" }}>Стоимость</span><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Наши <span style={{ fontWeight: 600 }}>цены</span></h2></A>
          <A delay={.1}><div className="scroll-tabs" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
            <button className={`tb ${pt === "format" ? "ta" : "ti"}`} onClick={() => setPt("format")}>DTF печать с переносом</button>
            <button className={`tb ${pt === "meter" ? "ta" : "ti"}`} onClick={() => setPt("meter")}>Погонные метры</button>
          </div></A>
          {pt === "format" && <A delay={.15}>
            <div className="cg pricing-table desktop-pricing-table" style={{ padding: 8, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.1))" }}>
                <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.7)", textTransform: "uppercase" }}>Формат</th>
                <th style={{ padding: "16px 24px", textAlign: "center", fontSize: 13, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.7)", textTransform: "uppercase" }}>Цена</th>
                <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.7)", textTransform: "uppercase" }}>Условие</th>
              </tr></thead>
              <tbody>{DP.map((p, i) => <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.04)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(232,67,147,.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "16px 24px", fontSize: 15 }}>{p.f}</td>
                <td style={{ padding: "16px 24px", textAlign: "center", fontSize: 18, fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{p.p} ₽<div className="mobile-pricing-note">{p.n ? `при заказе ${p.n}` : "без условия"}</div></td>
                <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)" }}>{p.n ? `при заказе ${p.n}` : "—"}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="mobile-pricing-list">
              {DP.map((p) => (
                <div key={p.f} className="mobile-pricing-row">
                  <div className="mobile-pricing-meta">
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", lineHeight: 1.35 }}>{p.f}</div>
                  </div>
                  <div className="mobile-pricing-price">
                    <div style={{ fontSize: 19, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{p.p} ₽</div>
                    {p.n ? <div className="mobile-pricing-note">{`при заказе ${p.n}`}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
              {PRICING_NOTES.map((note) => (
                <div
                  key={note.text}
                  style={note.highlight
                    ? { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: "rgba(232,67,147,.08)", border: "1px solid rgba(232,67,147,.18)", color: "#f0eef5", fontSize: 13, fontWeight: 500 }
                    : { display: "flex", gap: 10, fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.4)" }}
                >
                  <span style={{ color: note.highlight ? "#fff" : "#e84393", fontSize: note.highlight ? 12 : 10, marginTop: 2 }}>●</span>
                  <span>{note.text}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 28 }}><button className="bcalc" onClick={oc}><CalcIcon />Рассчитать оптовый заказ</button></div>
          </A>}
          {pt === "meter" && <A delay={.15}>
            <div className="cg pricing-table desktop-pricing-table" style={{ padding: 8, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "linear-gradient(135deg,rgba(108,92,231,.15),rgba(232,67,147,.1))" }}>{MP.map((m, i) => <th key={i} style={{ padding: "16px 12px", textAlign: "center", fontSize: 14, fontWeight: 500, color: "rgba(240,238,245,.7)" }}>{m.r}</th>)}</tr></thead>
              <tbody><tr style={{ borderTop: "1px solid rgba(255,255,255,.04)" }}>{MP.map((m, i) => <td key={i} style={{ padding: "20px 12px", textAlign: "center", fontSize: 18, fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{m.p}</td>)}</tr></tbody>
            </table></div>
            <div className="mobile-pricing-list">
              {MP.map((m) => (
                <div key={m.r} className="mobile-pricing-row">
                  <div className="mobile-pricing-meta">
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", lineHeight: 1.35 }}>{m.r}</div>
                  </div>
                  <div className="mobile-pricing-price">
                    <div style={{ fontSize: 19, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{m.p}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)", padding: "0 8px", display: "flex", gap: 10 }}><span style={{ color: "#6c5ce7", fontSize: 10 }}>●</span>Ширина — 58 см. Без переноса.</div>
            <div style={{ textAlign: "center", marginTop: 28 }}><button className="bcalc" onClick={oc}><CalcIcon />Рассчитать оптовый заказ</button></div>
          </A>}
        </div>
      </section>

      {/* OUR T-SHIRTS */}
      <section className="section-shell" style={{ padding: "100px 5%" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <A className="text-center mb-16">
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Собственное производство</span>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Наши <span style={{ fontWeight: 600 }}>футболки</span></h2>
            <p style={{ color: "rgba(240,238,245,.4)", fontWeight: 300, marginTop: 10, fontSize: 15, maxWidth: 600, margin: "10px auto 0" }}>Создаём напрямую на фабрике по собственным лекалам. От кроя и посадки до выбора ткани — всё продумано до мелочей.</p>
          </A>
          <div className="main-tshirt-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 24 }}>
            {TEXTILE_DATA.tshirts.items.map((item, i) => (
              <A key={i} delay={i * 0.1}>
                <MainTshirtCard item={item} onOpen={() => navigateToPage("textile_tshirts")} />
              </A>
            ))}
          </div>
          <A delay={0.3} className="text-center mt-10">
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="bcalc" onClick={() => navigateToPage("textile_tshirts")}>
                Весь каталог текстиля →
              </button>
              <button className="bo" onClick={goConstructor}>
                Открыть конструктор
              </button>
            </div>
          </A>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="section-shell" style={{ padding: "100px 5%" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <A className="text-center mb-16"><span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Нам доверяют</span><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Отзывы <span style={{ fontWeight: 600 }}>клиентов</span></h2><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}><Stars /><span style={{ fontSize: 15, fontWeight: 500 }}>5.0</span><span style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.4)" }}>Яндекс Карты</span></div></A>
          <div className="reviews-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {RV.map((r, i) => <A key={i} delay={i * .1}><div className="cg review-card" style={{ padding: 32, height: "100%", display: "flex", flexDirection: "column" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><div style={{ fontSize: 16, fontWeight: 500 }}>{r.name}</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)", marginTop: 2 }}>{r.date}</div></div><Stars /></div><p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.55)", lineHeight: 1.7, flex: 1 }}>«{r.text}»</p></div></A>)}
          </div>
          <A delay={.35} className="text-center mt-8"><a href="https://yandex.ru/maps/org/future_studio/220314499581/reviews/" target="_blank" rel="noopener noreferrer" style={{ color: "#e84393", fontSize: 14, textDecoration: "none", borderBottom: "1px solid rgba(232,67,147,.3)", paddingBottom: 2 }}>Все 63 отзыва →</a></A>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section-shell" style={{ padding: "100px 5% 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <A className="text-center mb-12"><span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Свяжитесь с нами</span><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Оставить <span style={{ fontWeight: 600 }}>заявку</span></h2></A>
          <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32 }}>
            <A delay={.1}>
                <form className="cg contact-card" style={{ padding: "36px 32px" }} onSubmit={handleContactSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <input className="inf" placeholder="Ваше имя" value={fm.n} onChange={e => setFm({ ...fm, n: e.target.value })} required />
                    <input className="inf" placeholder="Телефон" value={fm.p} onChange={e => setFm({ ...fm, p: e.target.value })} required />
                    <textarea className="inf" placeholder="Опишите заказ..." rows={4} style={{ resize: "vertical", minHeight: 100 }} value={fm.m} onChange={e => setFm({ ...fm, m: e.target.value })} />
                    <div style={{ fontSize: 12, color: "rgba(240,238,245,.45)", lineHeight: 1.5 }}>
                      После отправки откроется Telegram с подготовленным сообщением для менеджера.
                    </div>
                    <button type="submit" className="bp" style={{ width: "100%", marginTop: 4 }}>Отправить в Telegram</button>
                  </div>
                </form>
            </A>
            <A delay={.2}><div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="cg contact-card" style={{ padding: 24, overflow: "hidden" }}><div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "#e84393", textTransform: "uppercase", marginBottom: 12 }}>Адрес</div><div style={{ fontSize: 16 }}>Санкт-Петербург</div><div style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.6)" }}>пр. Авиаконструкторов, 5к2, эт. 2</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.35)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#6c5ce7" strokeWidth="10"/><path d="M22 65 C22 35, 35 25, 50 58 C65 25, 78 35, 78 65" fill="none" stroke="#6c5ce7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/></svg>Комендантский проспект</div><div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)" }}><iframe src="https://yandex.ru/map-widget/v1/?pt=30.246977,60.011073,pm2rdm&z=16&l=map" width="100%" height="180" frameBorder="0" style={{ display: "block", filter: "invert(0.9) hue-rotate(180deg) brightness(1.1) contrast(0.9)" }} allowFullScreen /></div></div>
              <div className="cg contact-card" style={{ padding: 24 }}><div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "#e84393", textTransform: "uppercase", marginBottom: 12 }}>Телефон</div><a href="tel:+79500003464" style={{ fontSize: 20, fontWeight: 500, color: "#f0eef5", textDecoration: "none" }}>+7 (950) 000-34-64</a></div>
              <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" className="cg contact-card" style={{ padding: 24, textDecoration: "none", color: "#f0eef5", display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#0088cc,#6c5ce7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><TG /></div><div><div style={{ fontSize: 15, fontWeight: 500 }}>Telegram</div><div style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>@FUTURE_178</div></div></a>
              <a href="mailto:future178@yandex.ru" className="cg contact-card" style={{ padding: 24, textDecoration: "none", color: "#f0eef5", display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#e84393,#6c5ce7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg></div><div><div style={{ fontSize: 15, fontWeight: 500 }}>Почта</div><div style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>future178@yandex.ru</div></div></a>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["Оплата картой", "СБП", "Безнал", "Наличными"].map(f => <span key={f} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>{f}</span>)}</div>
            </div></A>
          </div>
        </div>
      </section>

      <div className="mobile-only mobile-quick-actions">
        <a href="tel:+79500003464">Позвонить</a>
        <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" className="mobile-quick-accent">Telegram</a>
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

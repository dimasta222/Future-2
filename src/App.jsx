import { lazy, Suspense, useState, useEffect, useRef } from "react";
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
import TG from "./components/TG.jsx";
import TextileOrderModal from "./components/TextileOrderModal.jsx";
import TextileProductDetail from "./components/TextileProductDetail.jsx";
import TshirtSizeGuideTrigger from "./components/TshirtSizeGuideTrigger.jsx";
import STYLES from "./shared/appStyles.js";
import { parsePriceValue } from "./shared/textileHelpers.js";
import { saveCalcState, loadCalcState, clearCalcState } from "./utils/persistStorage.js";
import { PRINT_FORMATS } from "./data/printFormats.js";

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
      { name: "Футболка классика", sizes: "XS – 3XL", variants: [
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
      { name: "Худи варёное", sizes: "S – 2XL", galleryModel: "hoodie-washed", variants: [
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
const TSHIRT_SIZE_GUIDE_SECTIONS = [
  { title: "Оверсайз футболки", rows: TSHIRT_SIZE_GUIDE },
  { title: "Базовые футболки", rows: TSHIRT_SIZE_GUIDE },
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

function TextilePage({ type, onBack, onNavigate, initialProduct, onClearInitialProduct }) {
  const data = TEXTILE_DATA[type];
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(() => {
    if (!initialProduct) return null;
    const catalogItems = flattenCatalogItems(data?.items || []);
    const match = catalogItems.find((ci) =>
      ci.galleryModel === initialProduct.galleryModel
      && ci.variants?.[0]?.label === initialProduct.variants?.[0]?.label
    ) || catalogItems.find((ci) => ci.galleryModel === initialProduct.galleryModel) || null;
    if (match && initialProduct._initialColor) {
      match._initialColor = initialProduct._initialColor;
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
      <style>{STYLES}{`@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.product-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,4vw,48px);align-items:start}@media(max-width:768px){.product-detail-grid{grid-template-columns:1fr}}`}</style>

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
  const [withApply, setWithApply] = useState(() => { const s = loadCalcState(); return s?.withApply ?? true; });
  const [items, setItems] = useState(() => { const s = loadCalcState(); return s?.items ?? [{ id: 1, w: 20, h: 30, qty: 10 }]; });
  const [nid, setNid] = useState(() => { const s = loadCalcState(); return s?.nid ?? 2; });
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [mobileLayoutVisible, setMobileLayoutVisible] = useState(false);
  const layoutViewportRef = useRef(null);

  useEffect(() => { saveCalcState({ items, withApply, nid }); }, [items, withApply, nid]);

  const resetCalc = () => {
    clearCalcState();
    setItems([{ id: 1, w: 20, h: 30, qty: 10 }]);
    setNid(2);
    setWithApply(true);
    setLayoutOpen(false);
  };

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

  const activeItems = items.filter(i => i.w > 0 && i.h > 0 && i.qty > 0);
  const valid = activeItems.length > 0;
  const oversized = activeItems.some(i => Math.min(i.w, i.h) > BED_W);

  const packItems = activeItems.map((it) => ({ w: it.w, h: it.h, qty: it.qty, color: COLORS[items.indexOf(it) % COLORS.length] }));
  const pack = valid && !oversized ? packOnBed(packItems) : { length: 0, placements: [] };

  const totalQty = activeItems.reduce((s, i) => s + i.qty, 0);
  const lengthCm = pack.length;
  const meters = lengthCm / 100;
  const metersRaw = meters > 0 ? Math.ceil(meters * 10) / 10 : 0;
  const metersRound = metersRaw > 0 && !withApply ? Math.max(1, metersRaw) : metersRaw;

  const overThreeMeters = metersRaw > 3;
  const itemFormats = activeItems.map((it) => {
    const idx = items.indexOf(it);
    const fmt = getFormat(it.w, it.h);
    const eligible = withApply && !overThreeMeters && fmt !== null && it.qty <= 15;
    return { ...it, format: fmt, formatCost: eligible ? fmt.price * it.qty : null, eligible, idx };
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
  const printTotal = isSmallOrder ? formatPartCost : isMixed ? formatPartCost + meterPartPrint.cost + meterPartApply.cost : standardTotal;
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

  const calcOrderLink = `https://t.me/FUTURE_178?text=${encodeURIComponent([
    "Здравствуйте! Хочу рассчитать заказ DTF-печати.",
    totalQty > 0 ? `Количество принтов: ${totalQty} шт` : null,
    `Печать: ${printTotal.toLocaleString("ru-RU")} ₽`,
    `Итого: ${total.toLocaleString("ru-RU")} ₽`,
  ].filter(Boolean).join("\n"))}`;

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
                    {[["Всего принтов", `${totalQty} шт`], ["Длина печати", `${lengthCm.toFixed(1)} см`], ["Погонных метров", `${metersRound.toFixed(1)} м`]].map(([l, v]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.02)", borderRadius: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>{l}</span>
                        <span style={{ fontSize: 17, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                    {!isSmallOrder && !withApply && meters > 0 && meters < 1 && (
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
                    {isSmallOrder || isMixed ? (
                      <>
                        {formatItems.map((it, i) => (
                          <div key={`f${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 400, display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[it.idx % COLORS.length], flexShrink: 0 }} />
                                {it.w}×{it.h} см → {it.format.name}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)", marginLeft: 18 }}>{it.qty} шт × {it.format.price} ₽</div>
                            </div>
                            <span style={{ fontSize: 18, fontWeight: 600 }}>{it.formatCost.toLocaleString("ru")} ₽</span>
                          </div>
                        ))}
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

                  {(!isSmallOrder && !withApply && meters > 0 && meters < 1) ? (
                    <div style={{ width: "100%", textAlign: "center", marginTop: 18, padding: "14px 36px", borderRadius: 50, background: "rgba(255,255,255,.04)", color: "rgba(240,238,245,.25)", fontSize: 16, fontWeight: 500, fontFamily: "'Outfit',sans-serif", cursor: "not-allowed" }}>Минимум 1 п/м для заказа</div>
                  ) : (
                    <a href={calcOrderLink} target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", marginTop: 18, display: "flex" }}><TG /> Оформить заказ</a>
                  )}
                </>
              )}
            </div>

            {(isSmallOrder || isMixed) && (
              <div className="cs calc-panel" style={{ padding: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 14 }}>Цены по формату (до 15 шт/размер, печать + нанесение)</div>
                {FORMAT_PRICES.map((f, i) => {
                  const active = formatItems.some(it => it.format && it.format.name === f.name);
                  return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderRadius: 8, background: active ? "rgba(232,67,147,.08)" : "transparent" }}><span style={{ fontSize: 13, fontWeight: 300, color: active ? "#e84393" : "rgba(240,238,245,.35)" }}>{f.name} ({f.short}×{f.long})</span><span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#e84393" : "rgba(240,238,245,.45)" }}>{f.price} ₽/шт</span></div>;
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
  const [initialTextileProduct, setInitialTextileProduct] = useState(null);
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
      <ConstructorRoute onBack={() => navigateToPage("main")} />
    </Suspense>
  );
  if (pg === "calc") return <CalcPage onBack={() => navigateToPage("main")} />;
  if (pg === "portfolio") return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#08080c", color: "#f0eef5", fontFamily: "'Outfit',sans-serif" }}>Загрузка портфолио…</div>}>
      <PortfolioPage onBack={() => navigateToPage("main")} />
    </Suspense>
  );
  if (pg.startsWith("textile_")) return <TextilePage type={pg.replace("textile_", "")} initialProduct={initialTextileProduct} onClearInitialProduct={() => setInitialTextileProduct(null)} onBack={() => navigateToPage("main")} onNavigate={(t) => navigateToPage("textile_" + t)} />;

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
      <ContactSection Reveal={A} formData={fm} setFormData={setFm} onSubmit={handleContactSubmit} />

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

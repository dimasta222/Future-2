import { normalizeColorName, normalizeVariantLabel } from "./textileHelpers.js";

const PUBLIC_BASE_URL = import.meta.env.BASE_URL || "/";

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

const HOME_TSHIRT_PREVIEW_PATHS = {
  oversize: {
    "180": {
      "черный": "/tshirts/home img t-shirt/oversize/180/black/futbolka_oversize_black_180.png",
      "белый": "/tshirts/home img t-shirt/oversize/180/white/futbolka_oversize_white_180.png",
      "розовый": "/tshirts/home img t-shirt/oversize/180/pink/futbolka_oversize_pink_180.png",
    },
  },
};

const HOME_TSHIRT_PREVIEW_CACHE = new Set();

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

function resolveTshirtGalleryColor(colorName) {
  return TSHIRT_GALLERY_COLORS[normalizeColorName(colorName)] || {
    base: "#8f80f2",
    shade: "#5f4ed7",
    highlight: "#c0b4ff",
    accent: "rgba(255,255,255,.16)",
    text: "#f0eef5",
  };
}

export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function toPublicAssetUrl(path) {
  if (!path) return "";
  const normalizedPath = String(path).replace(/^\/+/, "");
  return encodeURI(`${PUBLIC_BASE_URL}${normalizedPath}`);
}

function resolveRealGalleryPath(model, colorName, variantLabel) {
  const normalizedColor = normalizeColorName(colorName);
  const modelConfig = TSHIRT_REAL_GALLERY_PATHS[model];
  if (!modelConfig) return "";

  const normalizedVariant = normalizeVariantLabel(variantLabel);
  const variantPath = normalizedVariant ? modelConfig.variants?.[normalizedVariant]?.[normalizedColor] : "";
  return toPublicAssetUrl(variantPath || modelConfig.shared?.[normalizedColor] || "");
}

export function buildOrderedGalleryCandidates(model, colorName, variantLabel) {
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

export function resolveHomepageTshirtPreview(model, colorName, variantLabel) {
  const normalizedModel = model || "classic";
  const normalizedColor = normalizeColorName(colorName);
  const normalizedVariant = normalizeVariantLabel(variantLabel);
  const previewSrc = normalizedVariant
    ? HOME_TSHIRT_PREVIEW_PATHS[normalizedModel]?.[normalizedVariant]?.[normalizedColor]
    : "";

  return toPublicAssetUrl(previewSrc);
}

export function preloadHomepageTshirtPreview(src) {
  if (!src || HOME_TSHIRT_PREVIEW_CACHE.has(src)) return;
  HOME_TSHIRT_PREVIEW_CACHE.add(src);
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

export function loadImageCandidate(sources) {
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

export function buildTshirtMockupSvg({ model, colorName, view, showViewLabel = true, showHeader = true }) {
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

      ${showHeader ? `<g opacity=".82"><text x="94" y="124" fill="#6c5ce7" font-size="34" font-family="Outfit, Arial, sans-serif" font-weight="600">FUTURE STUDIO</text><text x="94" y="180" fill="rgba(240,238,245,.52)" font-size="20" font-family="Outfit, Arial, sans-serif">${isOversize ? "Оверсайз" : "Классика"} • ${colorName}</text></g>` : ""}
      ${showViewLabel ? `<text x="94" y="1380" fill="${palette.text}" opacity=".82" font-size="26" font-family="Outfit, Arial, sans-serif">${TSHIRT_GALLERY_FALLBACK_VIEWS.find((slide) => slide.key === view)?.label || "Предпросмотр"}</text>` : ""}
    </svg>
  `;
}

export function buildHomepageTshirtPlaceholderSvg({ model, colorName }) {
  const colorKey = normalizeColorName(colorName) || "черный";
  const palette = resolveTshirtGalleryColor(colorKey);
  const gradientId = `${model}-${colorKey}-home-gradient`;
  const highlightId = `${model}-${colorKey}-home-highlight`;
  const patternId = `${model}-${colorKey}-home-speckle`;
  const isOversize = model === "oversize";
  const body = isOversize
    ? { x: 240, y: 180, width: 440, height: 620, radius: 78, leftSleeve: "rotate(-22 196 308)", rightSleeve: "rotate(22 724 308)", sleeveWidth: 178, sleeveHeight: 194, sleeveX: 126, sleeveY: 224, neckCx: 460, neckCy: 192, neckOuterRx: 96, neckOuterRy: 46, neckInnerRx: 64, neckInnerRy: 26 }
    : { x: 266, y: 188, width: 388, height: 604, radius: 66, leftSleeve: "rotate(-18 220 314)", rightSleeve: "rotate(18 700 314)", sleeveWidth: 146, sleeveHeight: 176, sleeveX: 154, sleeveY: 246, neckCx: 460, neckCy: 202, neckOuterRx: 84, neckOuterRy: 40, neckInnerRx: 54, neckInnerRy: 24 };
  const fabricFill = palette.pattern === "speckle" ? `url(#${patternId})` : `url(#${gradientId})`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 980" fill="none">
      <defs>
        <linearGradient id="${gradientId}" x1="240" y1="160" x2="676" y2="836" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${palette.highlight}" />
          <stop offset="0.44" stop-color="${palette.base}" />
          <stop offset="1" stop-color="${palette.shade}" />
        </linearGradient>
        <radialGradient id="${highlightId}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(372 276) rotate(56) scale(338 314)">
          <stop offset="0" stop-color="rgba(255,255,255,.3)" />
          <stop offset=".5" stop-color="rgba(255,255,255,.08)" />
          <stop offset="1" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <pattern id="${patternId}" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="${palette.base}" />
          <circle cx="7" cy="8" r="2.2" fill="${palette.highlight}" opacity=".32" />
          <circle cx="19" cy="15" r="1.8" fill="${palette.shade}" opacity=".22" />
          <circle cx="12" cy="24" r="2" fill="${palette.highlight}" opacity=".18" />
        </pattern>
        <filter id="home-shadow" x="46" y="72" width="828" height="838" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="32" stdDeviation="32" flood-color="rgba(20,16,24,.16)" />
        </filter>
      </defs>

      <ellipse cx="460" cy="874" rx="198" ry="30" fill="rgba(20,16,24,.12)" />

      <g filter="url(#home-shadow)">
        <rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" rx="${body.radius}" fill="${fabricFill}" />
        <rect x="${body.sleeveX}" y="${body.sleeveY}" width="${body.sleeveWidth}" height="${body.sleeveHeight}" rx="58" transform="${body.leftSleeve}" fill="${fabricFill}" />
        <rect x="${920 - body.sleeveX - body.sleeveWidth}" y="${body.sleeveY}" width="${body.sleeveWidth}" height="${body.sleeveHeight}" rx="58" transform="${body.rightSleeve}" fill="${fabricFill}" />
        <rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" rx="${body.radius}" fill="url(#${highlightId})" opacity=".88" />
        <ellipse cx="${body.neckCx}" cy="${body.neckCy}" rx="${body.neckOuterRx}" ry="${body.neckOuterRy}" fill="#efe8df" />
        <ellipse cx="${body.neckCx}" cy="${body.neckCy + 7}" rx="${body.neckInnerRx}" ry="${body.neckInnerRy}" fill="${fabricFill}" opacity=".96" />
        <path d="M${body.x + 32} ${body.y + body.height - 46}H${body.x + body.width - 32}" stroke="rgba(255,255,255,.12)" stroke-width="5" stroke-linecap="round" opacity=".42" />
        <path d="M382 386c42 16 116 18 156 0" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" opacity=".64" />
      </g>
    </svg>
  `;
}

export function buildTshirtFallbackSlides(itemName, model, colorName) {
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
import { normalizeColorName } from "../../shared/textileHelpers.js";

const PUBLIC_BASE_URL = import.meta.env.BASE_URL || "/";

function resolvePublicAssetPath(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${PUBLIC_BASE_URL}${normalizedPath}`;
}

function buildOversizeMockupAssetSet(side) {
  const resolvedSide = side === "back" ? "back" : "front";

  return {
    mockupSrc: resolvePublicAssetPath(`mockups/oversize-black-${resolvedSide}.png`),
    guideSrc: resolvePublicAssetPath(`mockups/oversize-black-${resolvedSide}-guide.png`),
  };
}

const OVERSIZE_REAL_MOCKUP_COLOR_SLUGS = {
  "черный": "black",
  "белый": "white",
  "розовый": "pink",
  "бежевый": "beige",
  "серый": "gray",
  "темно-серый": "gray",
  "тёмно-серый": "gray",
};

export const CONSTRUCTOR_PRINT_FORMATS = [
  { name: "A6", short: 10, long: 15, price: 250 },
  { name: "A5", short: 15, long: 20, price: 290 },
  { name: "A4", short: 20, long: 30, price: 350 },
  { name: "A3", short: 30, long: 42, price: 450 },
  { name: "A3+", short: 35, long: 48, price: 650 },
  { name: "A3++", short: 40, long: 50, price: 800 },
];

export function getConstructorPrintFormat(widthCm, heightCm) {
  const smallSideCm = Math.min(Number(widthCm) || 0, Number(heightCm) || 0);
  const largeSideCm = Math.max(Number(widthCm) || 0, Number(heightCm) || 0);

  return CONSTRUCTOR_PRINT_FORMATS.find((format) => (
    smallSideCm <= format.short && largeSideCm <= format.long
  )) || CONSTRUCTOR_PRINT_FORMATS[CONSTRUCTOR_PRINT_FORMATS.length - 1] || null;
}

function resolveOversizeMockupSrc(side, colorName = "") {
  const resolvedSide = side === "back" ? "back" : "front";
  const colorSlug = OVERSIZE_REAL_MOCKUP_COLOR_SLUGS[normalizeColorName(colorName)];

  if (!colorSlug) {
    return "";
  }

  return resolvePublicAssetPath(`mockups/oversize-${colorSlug}-${resolvedSide}.png`);
}

const OVERSIZE_PRINT_AREA_GEOMETRY = {
  front: {
    left: 50,
    top: 55.5,
    width: 53,
    height: 79,
  },
  back: {
    left: 50,
    top: 56,
    width: 53,
    height: 79,
  },
};

const PRINT_AREA_PHYSICAL_SIZES = {
  XS: { physicalWidthCm: 41, physicalHeightCm: 52 },
  S: { physicalWidthCm: 43, physicalHeightCm: 54 },
  M: { physicalWidthCm: 46, physicalHeightCm: 53 },
  L: { physicalWidthCm: 47, physicalHeightCm: 55 },
  XL: { physicalWidthCm: 49, physicalHeightCm: 57 },
  "2XL": { physicalWidthCm: 51, physicalHeightCm: 62 },
  "3XL": { physicalWidthCm: 54, physicalHeightCm: 63 },
};

function buildPrintAreaSizeOverrides(side) {
  return Object.fromEntries(
    Object.entries(PRINT_AREA_PHYSICAL_SIZES).map(([size, physicalSize]) => [
      size,
      {
        ...OVERSIZE_PRINT_AREA_GEOMETRY[side === "back" ? "back" : "front"],
        ...physicalSize,
        ...buildOversizeMockupAssetSet(side),
      },
    ])
  );
}

const PRINT_AREA_SIZE_OVERRIDES = {
  front: buildPrintAreaSizeOverrides("front"),
  back: buildPrintAreaSizeOverrides("back"),
};

export const CONSTRUCTOR_PRINT_AREAS = {
  classic: {
    front: {
      left: 50,
      top: 55.5,
      width: 53,
      height: 79,
      physicalWidthCm: 46,
      physicalHeightCm: 53,
      sizeOverrides: PRINT_AREA_SIZE_OVERRIDES.front,
    },
    back: {
      left: 50,
      top: 56,
      width: 53,
      height: 79,
      physicalWidthCm: 46,
      physicalHeightCm: 53,
      sizeOverrides: PRINT_AREA_SIZE_OVERRIDES.back,
    },
  },
  oversize: {
    front: {
      left: 50,
      top: 55.5,
      width: 53,
      height: 79,
      physicalWidthCm: 46,
      physicalHeightCm: 53,
      sizeOverrides: PRINT_AREA_SIZE_OVERRIDES.front,
    },
    back: {
      left: 50,
      top: 56,
      width: 53,
      height: 79,
      physicalWidthCm: 46,
      physicalHeightCm: 53,
      sizeOverrides: PRINT_AREA_SIZE_OVERRIDES.back,
    },
  },
};

export function resolveConstructorPrintArea(printAreas, side = "front", size = "") {
  const resolvedSide = side === "back" ? "back" : "front";
  const fallbackArea = CONSTRUCTOR_PRINT_AREAS.classic[resolvedSide] || CONSTRUCTOR_PRINT_AREAS.classic.front;
  const baseArea = printAreas?.[resolvedSide] || printAreas?.front || fallbackArea;

  if (!baseArea) {
    return fallbackArea;
  }

  const { sizeOverrides, ...baseAreaWithoutOverrides } = baseArea;
  const normalizedSize = String(size || "").trim().toUpperCase();
  const sizeOverride = normalizedSize ? sizeOverrides?.[normalizedSize] : null;

  return sizeOverride
    ? { ...baseAreaWithoutOverrides, ...sizeOverride }
    : baseAreaWithoutOverrides;
}

export function resolveConstructorMockupSrc(printAreas, side = "front", size = "", colorName = "") {
  const resolvedMockupSrc = resolveConstructorPrintArea(printAreas, side, size)?.mockupSrc || "";
  const resolvedOversizeMockupSrc = resolveOversizeMockupSrc(side, colorName);

  if (resolvedOversizeMockupSrc) {
    return resolvedOversizeMockupSrc;
  }

  if (!resolvedMockupSrc) {
    return "";
  }

  const normalizedColor = normalizeColorName(colorName);
  const isOversizeBlackMockup = /(^|\/)mockups\/oversize-black-/.test(resolvedMockupSrc);

  if (isOversizeBlackMockup && normalizedColor && normalizedColor !== "черный") {
    return "";
  }

  return resolvedMockupSrc;
}

export const CONSTRUCTOR_SIZE_GUIDES = {
  oversize: [
    { size: "XS", chest: 49, length: 65 },
    { size: "S", chest: 52, length: 67 },
    { size: "M", chest: 55, length: 69 },
    { size: "L", chest: 58, length: 71 },
    { size: "XL", chest: 61, length: 73 },
    { size: "2XL", chest: 64, length: 75 },
    { size: "3XL", chest: 67, length: 77 },
  ],
  classic: [
    { size: "XS", chest: 49, length: 65 },
    { size: "S", chest: 52, length: 67 },
    { size: "M", chest: 55, length: 69 },
    { size: "L", chest: 58, length: 71 },
    { size: "XL", chest: 61, length: 73 },
    { size: "2XL", chest: 64, length: 75 },
    { size: "3XL", chest: 67, length: 77 },
  ],
};

export const CONSTRUCTOR_TABS = [
  { key: "textile", label: "Текстиль" },
  { key: "upload", label: "Загрузить" },
  { key: "layers", label: "Слои" },
  { key: "text", label: "Текст" },
  { key: "shapes", label: "Фигуры" },
];

export function getConstructorSizeGuide(model) {
  return CONSTRUCTOR_SIZE_GUIDES[model] || null;
}

import { LOCAL_FONTS, LOCAL_FONT_GROUP_LABELS } from "../../generated/localFonts.js";

const RUSSIAN_FONTS = [
  { key: "great-vibes-ru", label: "Great Vibes", family: "'Great Vibes', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "alumni-sans-ru", label: "Alumni Sans", family: "'Alumni Sans', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "fira-sans-condensed-ru", label: "Fira Sans Condensed", family: "'Fira Sans Condensed', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "caveat-ru", label: "Caveat", family: "'Caveat', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "comfortaa-ru", label: "Comfortaa", family: "'Comfortaa', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "lobster-ru", label: "Lobster", family: "'Lobster', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "pacifico-ru", label: "Pacifico", family: "'Pacifico', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "roboto-slab-ru", label: "Roboto Slab", family: "'Roboto Slab', serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "oswald-ru", label: "Oswald", family: "'Oswald', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-mono-one-ru", label: "Rubik Mono One", family: "'Rubik Mono One', monospace", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "press-start-2p-ru", label: "Press Start 2P", family: "'Press Start 2P', monospace", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "advent-pro-ru", label: "Advent Pro", family: "'Advent Pro', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "yanone-kaffeesatz-ru", label: "Yanone Kaffeesatz", family: "'Yanone Kaffeesatz', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "amatic-sc-ru", label: "Amatic SC", family: "'Amatic SC', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "old-standard-tt-ru", label: "Old Standard TT", family: "'Old Standard TT', serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "dela-gothic-one-ru", label: "Dela Gothic One", family: "'Dela Gothic One', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "bad-script-ru", label: "Bad Script", family: "'Bad Script', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "pangolin-ru", label: "Pangolin", family: "'Pangolin', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "marck-script-ru", label: "Marck Script", family: "'Marck Script', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "neucha-ru", label: "Neucha", family: "'Neucha', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "pattaya-ru", label: "Pattaya", family: "'Pattaya', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rampart-one-ru", label: "Rampart One", family: "'Rampart One', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-wet-paint-ru", label: "Rubik Wet Paint", family: "'Rubik Wet Paint', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "reggae-one-ru", label: "Reggae One", family: "'Reggae One', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "kelly-slab-ru", label: "Kelly Slab", family: "'Kelly Slab', serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "ruslan-display-ru", label: "Ruslan Display", family: "'Ruslan Display', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-dirt-ru", label: "Rubik Dirt", family: "'Rubik Dirt', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-glitch-ru", label: "Rubik Glitch", family: "'Rubik Glitch', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "train-one-ru", label: "Train One", family: "'Train One', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-doodle-shadow-ru", label: "Rubik Doodle Shadow", family: "'Rubik Doodle Shadow', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "kablammo-ru", label: "Kablammo", family: "'Kablammo', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "stick-ru", label: "Stick", family: "'Stick', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-bubbles-ru", label: "Rubik Bubbles", family: "'Rubik Bubbles', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "comforter-ru", label: "Comforter", family: "'Comforter', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "climate-crisis-ru", label: "Climate Crisis", family: "'Climate Crisis', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "tiny5-ru", label: "Tiny5", family: "'Tiny5', monospace", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "comforter-brush-ru", label: "Comforter Brush", family: "'Comforter Brush', cursive", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "stalinist-one-ru", label: "Stalinist One", family: "'Stalinist One', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "oi-ru", label: "Oi", family: "'Oi', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "rubik-marker-hatch-ru", label: "Rubik Marker Hatch", family: "'Rubik Marker Hatch', sans-serif", group: "Русские", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
];

const BUILTIN_TEXT_FONTS = [
  { key: "outfit", label: "Outfit", family: "'Outfit', sans-serif", group: "sans", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 800 },
  { key: "inter", label: "Inter", family: "'Inter', sans-serif", group: "sans", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 800 },
  { key: "bebas", label: "Bebas Neue", family: "'Bebas Neue', sans-serif", group: "display", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "unbounded", label: "Unbounded", family: "'Unbounded', sans-serif", group: "display", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 700 },
  { key: "script", label: "Marck Script", family: "'Marck Script', cursive", group: "script", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "mono", label: "IBM Plex Mono", family: "'IBM Plex Mono', monospace", group: "mono", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 700 },
];

export const CONSTRUCTOR_TEXT_FONTS = [...BUILTIN_TEXT_FONTS, ...RUSSIAN_FONTS, ...LOCAL_FONTS];
export { LOCAL_FONT_GROUP_LABELS };

export const CONSTRUCTOR_TEXT_SOLID_COLORS = [
  ["#ffffff", "Белый"],
  ["#111111", "Чёрный"],
  ["#f43f5e", "Коралловый"],
  ["#f59e0b", "Янтарный"],
  ["#84cc16", "Лайм"],
  ["#14b8a6", "Тиффани"],
  ["#0ea5e9", "Голубой"],
  ["#6366f1", "Индиго"],
  ["#8b5cf6", "Лавандовый"],
  ["#ec4899", "Фуксия"],
];

export const CONSTRUCTOR_SHAPE_BASIC_COLORS = [
  ["#000000", "Чёрный"],
  ["#636366", "Графит"],
  ["#7e7e80", "Серый"],
  ["#b1b1b3", "Светло-серый"],
  ["#c8c8ca", "Пепельный"],
  ["#e2e2e5", "Туман"],
  ["#ffffff", "Белый"],
  ["#ff3131", "Красный"],
  ["#ff5757", "Алый"],
  ["#ed5bb7", "Розовый"],
  ["#cd93e8", "Пудровый"],
  ["#b660db", "Сиреневый"],
  ["#824ef0", "Фиолетовый"],
  ["#5b20dc", "Индиго"],
  ["#1199b7", "Морской"],
  ["#1cb8d8", "Бирюзовый"],
  ["#5ccfd9", "Тиффани"],
  ["#40a8eb", "Небесный"],
  ["#4e67ed", "Кобальт"],
  ["#1759b7", "Синий"],
  ["#2c0ec7", "Ультрамарин"],
  ["#0cc160", "Зелёный"],
  ["#7ed957", "Лайм"],
  ["#b8ff54", "Салатовый"],
  ["#ffd85a", "Лимонный"],
  ["#ffc266", "Медовый"],
  ["#ff914d", "Оранжевый"],
  ["#ff7a1a", "Мандарин"],
];

export const CONSTRUCTOR_TEXT_GRADIENTS = [
  { key: "future-pulse", label: "Future Pulse", css: "linear-gradient(135deg, #e84393 0%, #6c5ce7 100%)", stops: ["#e84393", "#6c5ce7"] },
  { key: "sunset-run", label: "Sunset Run", css: "linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)", stops: ["#ff9966", "#ff5e62"] },
  { key: "mint-wave", label: "Mint Wave", css: "linear-gradient(135deg, #34d399 0%, #06b6d4 100%)", stops: ["#34d399", "#06b6d4"] },
  { key: "acid-pop", label: "Acid Pop", css: "linear-gradient(135deg, #facc15 0%, #84cc16 100%)", stops: ["#facc15", "#84cc16"] },
  { key: "blue-glow", label: "Blue Glow", css: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)", stops: ["#38bdf8", "#2563eb"] },
  { key: "rose-gold", label: "Rose Gold", css: "linear-gradient(135deg, #f9a8d4 0%, #f59e0b 100%)", stops: ["#f9a8d4", "#f59e0b"] },
];

const SHAPE_CANVAS_SIZE = 512;
const SHAPE_CENTER = SHAPE_CANVAS_SIZE / 2;

function formatShapeNumber(value) {
  return Number(value.toFixed(1));
}

function buildShapePathData(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${formatShapeNumber(x)} ${formatShapeNumber(y)}`).join(" ") + " Z";
}

function buildShapePathPart({ d, lineJoin = "round", lineCap = null }) {
  return `<path d="${d}" fill="{{fill}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}"${lineJoin ? ` stroke-linejoin="${lineJoin}"` : ""}${lineCap ? ` stroke-linecap="${lineCap}"` : ""} />`;
}

function buildShapeRectPart({ x, y, width, height, rx = 0, ry = rx }) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"${rx ? ` rx="${rx}"` : ""}${ry ? ` ry="${ry}"` : ""} fill="{{fill}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" />`;
}

function buildShapeCirclePart({ cx = SHAPE_CENTER, cy = SHAPE_CENTER, r }) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="{{fill}}" stroke="{{stroke}}" stroke-width="{{strokeWidth}}" />`;
}

function buildShapePolygonMarkup(points) {
  return buildShapePathPart({ d: buildShapePathData(points) });
}

function clampShapeValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPointDistance(pointA, pointB) {
  return Math.hypot(pointB[0] - pointA[0], pointB[1] - pointA[1]);
}

function buildRoundedPolygonPathData(points, roundness = 0) {
  if (!Array.isArray(points) || points.length < 3) {
    return buildShapePathData(points || []);
  }

  const normalizedRoundness = clampShapeValue((Number(roundness) || 0) / 100, 0, 1);

  if (normalizedRoundness <= 0) {
    return buildShapePathData(points);
  }

  const corners = points.map((point, index) => {
    const previousPoint = points[(index - 1 + points.length) % points.length];
    const nextPoint = points[(index + 1) % points.length];
    const previousLength = getPointDistance(point, previousPoint);
    const nextLength = getPointDistance(point, nextPoint);
    const maxRadius = Math.max(0, Math.min(previousLength, nextLength) * 0.5 - 0.01);
    const radius = maxRadius * normalizedRoundness;

    if (radius <= 0) {
      return {
        vertex: point,
        start: point,
        end: point,
      };
    }

    const start = [
      point[0] + ((previousPoint[0] - point[0]) / previousLength) * radius,
      point[1] + ((previousPoint[1] - point[1]) / previousLength) * radius,
    ];
    const end = [
      point[0] + ((nextPoint[0] - point[0]) / nextLength) * radius,
      point[1] + ((nextPoint[1] - point[1]) / nextLength) * radius,
    ];

    return {
      vertex: point,
      start,
      end,
    };
  });

  const parts = [`M ${formatShapeNumber(corners[0].start[0])} ${formatShapeNumber(corners[0].start[1])}`];

  corners.forEach((corner, index) => {
    parts.push(`Q ${formatShapeNumber(corner.vertex[0])} ${formatShapeNumber(corner.vertex[1])} ${formatShapeNumber(corner.end[0])} ${formatShapeNumber(corner.end[1])}`);

    const nextCorner = corners[(index + 1) % corners.length];
    parts.push(`L ${formatShapeNumber(nextCorner.start[0])} ${formatShapeNumber(nextCorner.start[1])}`);
  });

  parts.push("Z");
  return parts.join(" ");
}

const ROUNDABLE_SHAPE_RECT_CONFIG = {
  "basic-square": { x: 88, y: 88, width: 336, height: 336 },
};

function parseSimplePolygonPathData(pathData) {
  const tokens = String(pathData || "").match(/[A-Za-z]|-?\d*\.?\d+/g) || [];
  const points = [];
  let currentCommand = null;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (/^[A-Za-z]$/.test(token)) {
      currentCommand = token.toUpperCase();
      index += 1;

      if (currentCommand === "Z") {
        continue;
      }

      if (currentCommand !== "M" && currentCommand !== "L") {
        return null;
      }

      continue;
    }

    if (currentCommand !== "M" && currentCommand !== "L") {
      return null;
    }

    const x = Number(tokens[index]);
    const y = Number(tokens[index + 1]);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    points.push([x, y]);
    index += 2;
  }

  return points.length >= 3 ? points : null;
}

function getShapePathDataFromMarkup(markup) {
  const match = String(markup || "").match(/<path\s+[^>]*d="([^"]+)"/i);
  return match ? match[1] : null;
}

function getRoundableShapePolygonPoints(shape) {
  const pathData = getShapePathDataFromMarkup(shape?.markup);

  if (!pathData) {
    return null;
  }

  return parseSimplePolygonPathData(pathData);
}

function buildShapeRoundedRectMarkup({ x, y, width, height }, roundness) {
  const radius = clampShapeValue((Math.min(width, height) / 2) * ((Number(roundness) || 0) / 100), 0, Math.min(width, height) / 2);
  return buildShapeRectPart({ x, y, width, height, rx: radius, ry: radius });
}

function buildShapeRoundedPolygonMarkup(points, roundness) {
  return buildShapePathPart({ d: buildRoundedPolygonPathData(points, roundness) });
}

function buildShapeMarkupWithCornerRoundness(shape, cornerRoundness = 0) {
  const resolvedShape = shape || CONSTRUCTOR_SHAPES[0];

  if (!supportsConstructorShapeCornerRoundness(resolvedShape, cornerRoundness)) {
    return resolvedShape.markup;
  }

  const rectConfig = ROUNDABLE_SHAPE_RECT_CONFIG[resolvedShape.key];
  if (rectConfig) {
    return buildShapeRoundedRectMarkup(rectConfig, cornerRoundness);
  }

  const polygonPoints = getRoundableShapePolygonPoints(resolvedShape);
  if (polygonPoints) {
    return buildShapeRoundedPolygonMarkup(polygonPoints, cornerRoundness);
  }

  return resolvedShape.markup;
}

export function supportsConstructorShapeCornerRoundness(shapeOrKey, cornerRoundness = null) {
  const resolvedShape = typeof shapeOrKey === "string" ? CONSTRUCTOR_SHAPES.find((shape) => shape.key === shapeOrKey) : shapeOrKey;
  const shapeKey = resolvedShape?.key;
  const hasSupportedShape = Boolean(
    (shapeKey && ROUNDABLE_SHAPE_RECT_CONFIG[shapeKey])
    || (resolvedShape && resolvedShape.category !== "lines" && getRoundableShapePolygonPoints(resolvedShape))
  );

  if (!hasSupportedShape) return false;
  if (cornerRoundness === null) return true;
  return clampShapeValue(Number(cornerRoundness) || 0, 0, 100) > 0;
}

function buildShapeRegularPolygonPoints(sides, { radius = 172, rotation = -90, cx = SHAPE_CENTER, cy = SHAPE_CENTER } = {}) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = ((rotation + (360 / sides) * index) * Math.PI) / 180;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function buildShapeRegularPolygonMarkup(sides, options = {}) {
  return buildShapePolygonMarkup(buildShapeRegularPolygonPoints(sides, options));
}

function buildShapeStarPoints(spikes, { outerRadius = 174, innerRadius = 90, rotation = -90, cx = SHAPE_CENTER, cy = SHAPE_CENTER } = {}) {
  return Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = ((rotation + (180 / spikes) * index) * Math.PI) / 180;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function buildShapeStarMarkup(spikes, options = {}) {
  return buildShapePolygonMarkup(buildShapeStarPoints(spikes, options));
}

function buildShapeCompositeMarkup(parts) {
  return parts.join("");
}

function parseSvgNumberList(value) {
  return String(value || "")
    .trim()
    .split(/[\s,]+/)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function createEmptyBounds() {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}

function includePointInBounds(bounds, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function includeRectInBounds(bounds, x, y, width, height) {
  includePointInBounds(bounds, x, y);
  includePointInBounds(bounds, x + width, y + height);
}

function getMarkupAttribute(markupPart, attributeName) {
  const match = markupPart.match(new RegExp(`${attributeName}="([^"]+)"`, "i"));
  return match ? match[1] : null;
}

function appendPathBounds(bounds, pathData) {
  const tokens = String(pathData || "").match(/[A-Za-z]|-?\d*\.?\d+/g) || [];
  let currentCommand = null;
  let currentX = 0;
  let currentY = 0;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];

    if (/^[A-Za-z]$/.test(token)) {
      currentCommand = token.toUpperCase();
      index += 1;
      continue;
    }

    if (!currentCommand) {
      index += 1;
      continue;
    }

    if (currentCommand === "M" || currentCommand === "L" || currentCommand === "T") {
      const x = Number(tokens[index]);
      const y = Number(tokens[index + 1]);
      includePointInBounds(bounds, x, y);
      currentX = x;
      currentY = y;
      index += 2;
      if (currentCommand === "M") {
        currentCommand = "L";
      }
      continue;
    }

    if (currentCommand === "H") {
      const x = Number(tokens[index]);
      includePointInBounds(bounds, x, currentY);
      currentX = x;
      index += 1;
      continue;
    }

    if (currentCommand === "V") {
      const y = Number(tokens[index]);
      includePointInBounds(bounds, currentX, y);
      currentY = y;
      index += 1;
      continue;
    }

    if (currentCommand === "Q" || currentCommand === "S") {
      const points = [
        [Number(tokens[index]), Number(tokens[index + 1])],
        [Number(tokens[index + 2]), Number(tokens[index + 3])],
      ];
      points.forEach(([x, y]) => includePointInBounds(bounds, x, y));
      currentX = points[points.length - 1][0];
      currentY = points[points.length - 1][1];
      index += 4;
      continue;
    }

    if (currentCommand === "C") {
      const points = [
        [Number(tokens[index]), Number(tokens[index + 1])],
        [Number(tokens[index + 2]), Number(tokens[index + 3])],
        [Number(tokens[index + 4]), Number(tokens[index + 5])],
      ];
      points.forEach(([x, y]) => includePointInBounds(bounds, x, y));
      currentX = points[points.length - 1][0];
      currentY = points[points.length - 1][1];
      index += 6;
      continue;
    }

    if (currentCommand === "A") {
      const endX = Number(tokens[index + 5]);
      const endY = Number(tokens[index + 6]);
      includePointInBounds(bounds, endX, endY);
      currentX = endX;
      currentY = endY;
      index += 7;
      continue;
    }

    index += 1;
  }
}

function estimateMarkupBounds(markup) {
  const bounds = createEmptyBounds();
  const shapeParts = String(markup || "").match(/<(rect|circle|path|polygon|polyline)\b[^>]*>/gi) || [];

  shapeParts.forEach((part) => {
    const normalizedPart = part.toLowerCase();

    if (normalizedPart.startsWith("<rect")) {
      const x = Number(getMarkupAttribute(part, "x") || 0);
      const y = Number(getMarkupAttribute(part, "y") || 0);
      const width = Number(getMarkupAttribute(part, "width") || 0);
      const height = Number(getMarkupAttribute(part, "height") || 0);
      includeRectInBounds(bounds, x, y, width, height);
      return;
    }

    if (normalizedPart.startsWith("<circle")) {
      const cx = Number(getMarkupAttribute(part, "cx") || SHAPE_CENTER);
      const cy = Number(getMarkupAttribute(part, "cy") || SHAPE_CENTER);
      const r = Number(getMarkupAttribute(part, "r") || 0);
      includeRectInBounds(bounds, cx - r, cy - r, r * 2, r * 2);
      return;
    }

    if (normalizedPart.startsWith("<polygon") || normalizedPart.startsWith("<polyline")) {
      const numbers = parseSvgNumberList(getMarkupAttribute(part, "points"));
      for (let index = 0; index < numbers.length; index += 2) {
        includePointInBounds(bounds, numbers[index], numbers[index + 1]);
      }
      return;
    }

    if (normalizedPart.startsWith("<path")) {
      appendPathBounds(bounds, getMarkupAttribute(part, "d"));
    }
  });

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY) || !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY)) {
    return {
      minX: 0,
      minY: 0,
      maxX: SHAPE_CANVAS_SIZE,
      maxY: SHAPE_CANVAS_SIZE,
    };
  }

  return bounds;
}

function buildRenderFrame({ bounds, viewBox, padding = 0 }) {
  const minX = Math.max(viewBox.minX, bounds.minX - padding);
  const minY = Math.max(viewBox.minY, bounds.minY - padding);
  const maxX = Math.min(viewBox.minX + viewBox.width, bounds.maxX + padding);
  const maxY = Math.min(viewBox.minY + viewBox.height, bounds.maxY + padding);
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);

  return {
    contentBounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: contentWidth,
      height: contentHeight,
    },
    contentScaleX: contentWidth / viewBox.width,
    contentScaleY: contentHeight / viewBox.height,
    innerOffsetXPercent: -(((minX - viewBox.minX) / contentWidth) * 100),
    innerOffsetYPercent: -(((minY - viewBox.minY) / contentHeight) * 100),
    innerWidthPercent: (viewBox.width / contentWidth) * 100,
    innerHeightPercent: (viewBox.height / contentHeight) * 100,
  };
}

function buildImageRenderFrame({ width, height, bounds }) {
  return buildRenderFrame({
    bounds,
    viewBox: {
      minX: 0,
      minY: 0,
      width: Math.max(1, Number(width) || 1),
      height: Math.max(1, Number(height) || 1),
    },
    padding: 0,
  });
}

function getFullImageRenderFrame(width, height) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);

  return {
    contentBounds: {
      minX: 0,
      minY: 0,
      maxX: safeWidth,
      maxY: safeHeight,
      width: safeWidth,
      height: safeHeight,
    },
    contentScaleX: 1,
    contentScaleY: 1,
    innerOffsetXPercent: 0,
    innerOffsetYPercent: 0,
    innerWidthPercent: 100,
    innerHeightPercent: 100,
  };
}

function buildShapeViewBox(shape) {
  const bounds = estimateMarkupBounds(shape?.markup);
  const padding = 0;
  const minX = Math.max(0, Math.floor(bounds.minX - padding));
  const minY = Math.max(0, Math.floor(bounds.minY - padding));
  const maxX = Math.min(SHAPE_CANVAS_SIZE, Math.ceil(bounds.maxX + padding));
  const maxY = Math.min(SHAPE_CANVAS_SIZE, Math.ceil(bounds.maxY + padding));
  return `${minX} ${minY} ${Math.max(1, maxX - minX)} ${Math.max(1, maxY - minY)}`;
}

export function getConstructorShapeTightBounds(shapeKey) {
  const resolvedShape = getConstructorShape(shapeKey);
  const bounds = estimateMarkupBounds(resolvedShape?.markup);
  const minX = Math.max(0, Math.floor(bounds.minX));
  const minY = Math.max(0, Math.floor(bounds.minY));
  const maxX = Math.min(SHAPE_CANVAS_SIZE, Math.ceil(bounds.maxX));
  const maxY = Math.min(SHAPE_CANVAS_SIZE, Math.ceil(bounds.maxY));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildLineBodyMarkup({ x1, y1, x2, paint, thickness, lineStyle }) {
  const span = Math.max(0, x2 - x1);
  const top = y1 - thickness / 2;

  if (lineStyle === "single") {
    return `<rect x="${formatShapeNumber(x1)}" y="${formatShapeNumber(top)}" width="${formatShapeNumber(span)}" height="${formatShapeNumber(thickness)}" fill="${paint}" />`;
  }

  if (lineStyle === "dashed") {
    const segmentWidth = Math.max(thickness * 4.9, 46);
    const gapWidth = Math.max(thickness * 2.8, 18);
    const step = segmentWidth + gapWidth;
    const segments = [];

    for (let currentX = x1; currentX < x2; currentX += step) {
      const width = Math.min(segmentWidth, x2 - currentX);
      if (width <= 0) break;
      segments.push(`<rect x="${formatShapeNumber(currentX)}" y="${formatShapeNumber(top)}" width="${formatShapeNumber(width)}" height="${formatShapeNumber(thickness)}" fill="${paint}" />`);
    }

    return segments.join("");
  }

  if (lineStyle === "dotted") {
    const dotSize = Math.max(thickness, 6);
    const gapWidth = Math.max(thickness * 2.3, 18);
    const dotTop = y1 - dotSize / 2;
    const step = dotSize + gapWidth;
    const dots = [];

    for (let currentX = x1; currentX < x2; currentX += step) {
      const width = Math.min(dotSize, x2 - currentX);
      if (width <= 0) break;
      dots.push(`<rect x="${formatShapeNumber(currentX)}" y="${formatShapeNumber(dotTop)}" width="${formatShapeNumber(width)}" height="${formatShapeNumber(dotSize)}" fill="${paint}" />`);
    }

    return dots.join("");
  }

  return `<rect x="${formatShapeNumber(x1)}" y="${formatShapeNumber(top)}" width="${formatShapeNumber(span)}" height="${formatShapeNumber(thickness)}" fill="${paint}" />`;
}

function getLineDecorationMetrics(thickness) {
  const safeThickness = Math.max(6, Number(thickness) || 14);

  return {
    arrowLength: Math.max(132, safeThickness * 1.55),
    arrowHalfHeight: Math.max(60, safeThickness * 0.95),
    doubleArrowLength: Math.max(86, safeThickness * 1.2),
    doubleArrowHalfHeight: Math.max(70, safeThickness),
    chevronLength: Math.max(112, safeThickness * 1.4),
    chevronHalfHeight: Math.max(62, safeThickness),
    chevronStrokeWidth: Math.max(18, Math.round(safeThickness * 1.15)),
    barWidth: Math.max(18, safeThickness * 0.46),
    barHeight: Math.max(96, safeThickness * 1.9),
    squareSize: Math.max(46, safeThickness * 1.55),
    squareRadius: Math.max(6, safeThickness * 0.2),
    circleRadius: Math.max(26, safeThickness * 0.82),
    diamondHalfWidth: Math.max(34, safeThickness * 0.88),
    diamondHalfHeight: Math.max(38, safeThickness * 0.88),
  };
}

function getMinLineLayoutWidth(shapeKey, thickness) {
  const metrics = getLineDecorationMetrics(thickness);
  const minBodyWidth = Math.max(12, thickness * 0.6);

  switch (shapeKey) {
    case "line-arrow-right":
      return Math.ceil(50 + metrics.arrowLength + minBodyWidth + 50);
    case "line-chevron-right":
      return Math.ceil(48 + metrics.chevronLength + minBodyWidth + 50);
    case "line-arrow-double":
      return Math.ceil(metrics.doubleArrowLength + minBodyWidth + metrics.doubleArrowLength + 50 + 50);
    case "line-bars":
      return Math.ceil(50 + metrics.barWidth + Math.max(10, thickness * 0.3) + minBodyWidth + Math.max(10, thickness * 0.3) + metrics.barWidth + 50);
    case "line-squares":
      return Math.ceil(50 + metrics.squareSize + 2 + minBodyWidth + 2 + metrics.squareSize + 50);
    case "line-circles":
      return Math.ceil(50 + (metrics.circleRadius * 2) + 2 + minBodyWidth + 2 + (metrics.circleRadius * 2) + 50);
    case "line-diamonds":
      return Math.ceil(50 + (metrics.diamondHalfWidth * 2) + 2 + minBodyWidth + 2 + (metrics.diamondHalfWidth * 2) + 50);
    default:
      return Math.ceil(48 + minBodyWidth + 48);
  }
}

export function getConstructorLineMinAspectRatio(shapeKey, strokeWidth) {
  const thickness = Math.max(6, Number(strokeWidth) || 14);
  return getMinLineLayoutWidth(shapeKey, thickness) / 512;
}

function getLineEndpointInsetsPx(shapeKey) {
  switch (shapeKey) {
    case "line-arrow-right":
    case "line-arrow-double":
    case "line-squares":
    case "line-circles":
    case "line-diamonds":
      return { leftInsetPx: 50, rightInsetPx: 50 };
    case "line-chevron-right":
      return { leftInsetPx: 48, rightInsetPx: 50 };
    case "line-bars":
      return { leftInsetPx: 46, rightInsetPx: 46 };
    case "line-dotted":
    case "line-dashed":
    case "line-solid":
    default:
      return { leftInsetPx: 48, rightInsetPx: 48 };
  }
}

export function getConstructorLineVisualMetrics(shapeKey, strokeWidth, lineAspectRatio = 1) {
  const thickness = Math.max(6, Number(strokeWidth) || 14);
  const metrics = getLineDecorationMetrics(thickness);
  const resolvedAspectRatio = Math.max(0.2, Number(lineAspectRatio) || 1);
  const layoutWidthPx = Math.max(getMinLineLayoutWidth(shapeKey, thickness), Math.round(512 * resolvedAspectRatio));
  const layoutHeightPx = 512;
  const { leftInsetPx, rightInsetPx } = getLineEndpointInsetsPx(shapeKey);

  switch (shapeKey) {
    case "line-arrow-right":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 100, visibleHeightPx: Math.max(thickness, metrics.arrowHalfHeight * 2) };
    case "line-chevron-right":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 98, visibleHeightPx: Math.max(thickness, metrics.chevronHalfHeight * 2) };
    case "line-arrow-double":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 100, visibleHeightPx: Math.max(thickness, metrics.doubleArrowHalfHeight * 2) };
    case "line-bars":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 92, visibleHeightPx: Math.max(thickness, metrics.barHeight) };
    case "line-squares":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 100, visibleHeightPx: Math.max(thickness, metrics.squareSize) };
    case "line-circles":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 100, visibleHeightPx: Math.max(thickness, metrics.circleRadius * 2) };
    case "line-diamonds":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 100, visibleHeightPx: Math.max(thickness, metrics.diamondHalfHeight * 2) };
    case "line-dotted":
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 96, visibleHeightPx: Math.max(thickness, 6) };
    case "line-dashed":
    case "line-solid":
    default:
      return { layoutWidthPx, layoutHeightPx, leftInsetPx, rightInsetPx, visibleWidthPx: layoutWidthPx - 96, visibleHeightPx: thickness };
  }
}

function buildLineDecorationMarkup(shapeKey, paint, thickness) {
  const metrics = getLineDecorationMetrics(thickness);

  switch (shapeKey) {
    case "line-arrow-right":
      return `<polygon points="330,196 462,256 330,316" fill="${paint}" />`;
    case "line-chevron-right":
      return `<polyline points="338,${formatShapeNumber(256 - metrics.chevronHalfHeight)} 450,256 338,${formatShapeNumber(256 + metrics.chevronHalfHeight)}" fill="none" stroke="${paint}" stroke-width="${metrics.chevronStrokeWidth}" stroke-linecap="square" stroke-linejoin="miter" />`;
    case "line-arrow-double":
      return `<polygon points="120,186 34,256 120,326" fill="${paint}" /><polygon points="392,186 478,256 392,326" fill="${paint}" />`;
    case "line-bars":
      return `<rect x="46" y="${formatShapeNumber(256 - (metrics.barHeight / 2))}" width="${formatShapeNumber(metrics.barWidth)}" height="${formatShapeNumber(metrics.barHeight)}" fill="${paint}" /><rect x="${formatShapeNumber(466 - metrics.barWidth)}" y="${formatShapeNumber(256 - (metrics.barHeight / 2))}" width="${formatShapeNumber(metrics.barWidth)}" height="${formatShapeNumber(metrics.barHeight)}" fill="${paint}" />`;
    case "line-squares":
      return `<rect x="46" y="${formatShapeNumber(256 - (metrics.squareSize / 2))}" width="${formatShapeNumber(metrics.squareSize)}" height="${formatShapeNumber(metrics.squareSize)}" rx="${formatShapeNumber(metrics.squareRadius)}" fill="${paint}" /><rect x="${formatShapeNumber(466 - metrics.squareSize)}" y="${formatShapeNumber(256 - (metrics.squareSize / 2))}" width="${formatShapeNumber(metrics.squareSize)}" height="${formatShapeNumber(metrics.squareSize)}" rx="${formatShapeNumber(metrics.squareRadius)}" fill="${paint}" />`;
    case "line-circles":
      return `<circle cx="${formatShapeNumber(50 + metrics.circleRadius)}" cy="256" r="${formatShapeNumber(metrics.circleRadius)}" fill="${paint}" /><circle cx="${formatShapeNumber(462 - metrics.circleRadius)}" cy="256" r="${formatShapeNumber(metrics.circleRadius)}" fill="${paint}" />`;
    case "line-diamonds":
      return `<polygon points="${formatShapeNumber(50 + metrics.diamondHalfWidth)},${formatShapeNumber(256 - metrics.diamondHalfHeight)} ${formatShapeNumber(50 + metrics.diamondHalfWidth * 2)},256 ${formatShapeNumber(50 + metrics.diamondHalfWidth)},${formatShapeNumber(256 + metrics.diamondHalfHeight)} 50,256" fill="${paint}" /><polygon points="${formatShapeNumber(462 - metrics.diamondHalfWidth)},${formatShapeNumber(256 - metrics.diamondHalfHeight)} 462,256 ${formatShapeNumber(462 - metrics.diamondHalfWidth)},${formatShapeNumber(256 + metrics.diamondHalfHeight)} ${formatShapeNumber(462 - metrics.diamondHalfWidth * 2)},256" fill="${paint}" />`;
    default:
      return "";
  }
}

function buildLineShapeSvg({ shape, fillMode, color, gradient, strokeStyle, strokeWidth, preserveAspectRatio = "xMidYMid meet", lineAspectRatio = null }) {
  const paint = fillMode === "gradient" && gradient?.stops?.length ? "url(#shapeGradient)" : color;
  const thickness = Math.max(6, Number(strokeWidth) || 14);
  const resolvedAspectRatio = Math.max(0.2, Number(lineAspectRatio) || 1);
  const minLayoutWidth = getMinLineLayoutWidth(shape.key, thickness);
  const layoutWidth = Math.max(minLayoutWidth, Math.round(512 * resolvedAspectRatio));
  const viewBox = `0 0 ${layoutWidth} 512`;
  const effectiveLineStyle = strokeStyle !== "none"
    ? strokeStyle
    : (shape.defaultLineStyle || "single");
  const defs = fillMode === "gradient" && gradient?.stops?.length
    ? `<defs>
        <linearGradient id="shapeGradient" x1="56" y1="256" x2="${Math.max(112, layoutWidth - 56)}" y2="256" gradientUnits="userSpaceOnUse">
          ${gradient.stops.map((stopColor, index) => {
            const offset = gradient.stops.length === 1 ? 0 : Math.round((index / (gradient.stops.length - 1)) * 100);
            return `<stop offset="${offset}%" stop-color="${stopColor}" />`;
          }).join("")}
        </linearGradient>
      </defs>`
    : "";

  let bodyMarkup = "";
  let decorationMarkup = "";
  const leftMargin = 50;
  const rightMargin = 50;
  const rightTipX = layoutWidth - rightMargin;
  const leftTipX = leftMargin;
  const metrics = getLineDecorationMetrics(thickness);

  switch (shape.key) {
    case "line-arrow-right":
      bodyMarkup = buildLineBodyMarkup({ x1: leftMargin, y1: 256, x2: rightTipX - metrics.arrowLength, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<polygon points="${formatShapeNumber(rightTipX - metrics.arrowLength)},${formatShapeNumber(256 - metrics.arrowHalfHeight)} ${rightTipX},256 ${formatShapeNumber(rightTipX - metrics.arrowLength)},${formatShapeNumber(256 + metrics.arrowHalfHeight)}" fill="${paint}" />`;
      break;
    case "line-chevron-right":
      bodyMarkup = buildLineBodyMarkup({ x1: 48, y1: 256, x2: rightTipX - metrics.chevronLength, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<polyline points="${formatShapeNumber(rightTipX - metrics.chevronLength)},${formatShapeNumber(256 - metrics.chevronHalfHeight)} ${rightTipX},256 ${formatShapeNumber(rightTipX - metrics.chevronLength)},${formatShapeNumber(256 + metrics.chevronHalfHeight)}" fill="none" stroke="${paint}" stroke-width="${metrics.chevronStrokeWidth}" stroke-linecap="square" stroke-linejoin="miter" />`;
      break;
    case "line-arrow-double":
      bodyMarkup = buildLineBodyMarkup({ x1: leftTipX + metrics.doubleArrowLength, y1: 256, x2: rightTipX - metrics.doubleArrowLength, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<polygon points="${formatShapeNumber(leftTipX + metrics.doubleArrowLength)},${formatShapeNumber(256 - metrics.doubleArrowHalfHeight)} ${leftTipX},256 ${formatShapeNumber(leftTipX + metrics.doubleArrowLength)},${formatShapeNumber(256 + metrics.doubleArrowHalfHeight)}" fill="${paint}" /><polygon points="${formatShapeNumber(rightTipX - metrics.doubleArrowLength)},${formatShapeNumber(256 - metrics.doubleArrowHalfHeight)} ${rightTipX},256 ${formatShapeNumber(rightTipX - metrics.doubleArrowLength)},${formatShapeNumber(256 + metrics.doubleArrowHalfHeight)}" fill="${paint}" />`;
      break;
    case "line-bars":
      bodyMarkup = buildLineBodyMarkup({ x1: leftMargin + metrics.barWidth + Math.max(10, thickness * 0.3), y1: 256, x2: rightTipX - metrics.barWidth - Math.max(10, thickness * 0.3), y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<rect x="${formatShapeNumber(leftMargin - 4)}" y="${formatShapeNumber(256 - (metrics.barHeight / 2))}" width="${formatShapeNumber(metrics.barWidth)}" height="${formatShapeNumber(metrics.barHeight)}" fill="${paint}" /><rect x="${formatShapeNumber(rightTipX - metrics.barWidth + 4)}" y="${formatShapeNumber(256 - (metrics.barHeight / 2))}" width="${formatShapeNumber(metrics.barWidth)}" height="${formatShapeNumber(metrics.barHeight)}" fill="${paint}" />`;
      break;
    case "line-squares":
      bodyMarkup = buildLineBodyMarkup({ x1: leftMargin + metrics.squareSize + 2, y1: 256, x2: rightTipX - metrics.squareSize - 2, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<rect x="${leftMargin}" y="${formatShapeNumber(256 - (metrics.squareSize / 2))}" width="${formatShapeNumber(metrics.squareSize)}" height="${formatShapeNumber(metrics.squareSize)}" rx="${formatShapeNumber(metrics.squareRadius)}" fill="${paint}" /><rect x="${formatShapeNumber(rightTipX - metrics.squareSize)}" y="${formatShapeNumber(256 - (metrics.squareSize / 2))}" width="${formatShapeNumber(metrics.squareSize)}" height="${formatShapeNumber(metrics.squareSize)}" rx="${formatShapeNumber(metrics.squareRadius)}" fill="${paint}" />`;
      break;
    case "line-circles":
      bodyMarkup = buildLineBodyMarkup({ x1: leftMargin + (metrics.circleRadius * 2) + 2, y1: 256, x2: rightTipX - (metrics.circleRadius * 2) - 2, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<circle cx="${formatShapeNumber(leftMargin + metrics.circleRadius)}" cy="256" r="${formatShapeNumber(metrics.circleRadius)}" fill="${paint}" /><circle cx="${formatShapeNumber(rightTipX - metrics.circleRadius)}" cy="256" r="${formatShapeNumber(metrics.circleRadius)}" fill="${paint}" />`;
      break;
    case "line-diamonds":
      bodyMarkup = buildLineBodyMarkup({ x1: leftMargin + (metrics.diamondHalfWidth * 2) + 2, y1: 256, x2: rightTipX - (metrics.diamondHalfWidth * 2) - 2, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      decorationMarkup = `<polygon points="${formatShapeNumber(leftMargin + metrics.diamondHalfWidth)},${formatShapeNumber(256 - metrics.diamondHalfHeight)} ${formatShapeNumber(leftMargin + (metrics.diamondHalfWidth * 2))},256 ${formatShapeNumber(leftMargin + metrics.diamondHalfWidth)},${formatShapeNumber(256 + metrics.diamondHalfHeight)} ${leftMargin},256" fill="${paint}" /><polygon points="${formatShapeNumber(rightTipX - metrics.diamondHalfWidth)},${formatShapeNumber(256 - metrics.diamondHalfHeight)} ${rightTipX},256 ${formatShapeNumber(rightTipX - metrics.diamondHalfWidth)},${formatShapeNumber(256 + metrics.diamondHalfHeight)} ${formatShapeNumber(rightTipX - (metrics.diamondHalfWidth * 2))},256" fill="${paint}" />`;
      break;
    default:
      bodyMarkup = buildLineBodyMarkup({ x1: 48, y1: 256, x2: layoutWidth - 48, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" style="display:block;overflow:visible" fill="none" preserveAspectRatio="${preserveAspectRatio}">
      ${defs}
      ${bodyMarkup}
      ${decorationMarkup || buildLineDecorationMarkup(shape.key, paint, thickness)}
    </svg>
  `;
}

export const CONSTRUCTOR_SHAPE_CATEGORIES = [
  { key: "basic-shapes", label: "Основные фигуры" },
  { key: "lines", label: "Линии" },
  { key: "polygons", label: "Многоугольники" },
  { key: "stars", label: "Звезды" },
  { key: "arrows", label: "Стрелки" },
  { key: "flowchart", label: "Фигуры блок-схемы" },
  { key: "speech-bubbles", label: "Облака с текстом" },
  { key: "clouds", label: "Облака" },
  { key: "hearts", label: "Сердца" },
  { key: "banners", label: "Баннеры" },
];

export const CONSTRUCTOR_SHAPES = [
  {
    key: "basic-square",
    label: "Квадрат",
    category: "basic-shapes",
    markup: buildShapeRectPart({ x: 88, y: 88, width: 336, height: 336 }),
  },
  {
    key: "basic-rounded-square",
    label: "Скруглённый квадрат",
    category: "basic-shapes",
    markup: buildShapeRectPart({ x: 88, y: 88, width: 336, height: 336, rx: 48 }),
  },
  {
    key: "basic-circle",
    label: "Круг",
    category: "basic-shapes",
    markup: buildShapeCirclePart({ r: 166 }),
  },
  {
    key: "basic-triangle-up",
    label: "Треугольник вверх",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[256, 82], [424, 404], [88, 404]]),
  },
  {
    key: "basic-triangle-down",
    label: "Треугольник вниз",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[88, 108], [424, 108], [256, 430]]),
  },
  {
    key: "basic-plus",
    label: "Плюс",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[170, 54], [342, 54], [342, 170], [458, 170], [458, 342], [342, 342], [342, 458], [170, 458], [170, 342], [54, 342], [54, 170], [170, 170]]),
  },
  {
    key: "basic-wide-pentagon",
    label: "Широкий шестиугольник",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[102, 138], [256, 106], [410, 138], [410, 378], [256, 410], [102, 378]]),
  },
  {
    key: "basic-ticket-square",
    label: "Фигурный квадрат",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 134 54 L 378 54 A 58 58 0 0 0 436 112 L 458 112 L 458 400 L 436 400 A 58 58 0 0 0 378 458 L 134 458 A 58 58 0 0 0 76 400 L 54 400 L 54 112 L 76 112 A 58 58 0 0 0 134 54 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "basic-parallelogram-right",
    label: "Параллелограмм вправо",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[130, 84], [438, 84], [358, 428], [50, 428]]),
  },
  {
    key: "basic-parallelogram-left",
    label: "Параллелограмм влево",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[74, 84], [382, 84], [462, 428], [154, 428]]),
  },
  {
    key: "basic-trapezoid",
    label: "Трапеция",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[126, 84], [386, 84], [458, 428], [54, 428]]),
  },
  {
    key: "basic-trapezoid-inverted",
    label: "Перевёрнутая трапеция",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[54, 84], [458, 84], [386, 428], [126, 428]]),
  },
  {
    key: "basic-shield-round-bottom",
    label: "Щит",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 150 70 L 362 70 L 362 290 A 106 106 0 0 1 150 290 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "basic-arch",
    label: "Арка",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 104 458 L 104 222 A 152 152 0 0 1 408 222 L 408 458 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "basic-right-triangle",
    label: "Прямоугольный треугольник",
    category: "basic-shapes",
    markup: buildShapePolygonMarkup([[62, 72], [62, 430], [420, 430]]),
  },
  {
    key: "basic-semicircle",
    label: "Полукруг",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 76 422 A 180 180 0 0 1 436 422 L 76 422 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "basic-quarter-circle",
    label: "Четверть круга",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 72 430 L 72 78 A 352 352 0 0 1 424 430 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "basic-corner-arc",
    label: "Угловая дуга",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 74 450 L 74 262 A 188 188 0 0 1 262 74 L 430 74 L 430 182 L 316 182 A 80 80 0 0 0 182 316 L 182 450 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "basic-arch-arc",
    label: "Дуга",
    category: "basic-shapes",
    markup: buildShapePathPart({
      d: "M 92 422 A 164 164 0 0 1 420 422 L 332 422 A 76 76 0 0 0 180 422 Z",
      lineJoin: "round",
    }),
  },
  {
    key: "line-solid",
    label: "Прямая линия",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeRectPart({ x: 44, y: 240, width: 424, height: 30 }),
  },
  {
    key: "line-dashed",
    label: "Пунктирная линия",
    category: "lines",
    defaultLineStyle: "dashed",
    markup: buildShapeCompositeMarkup(Array.from({ length: 7 }, (_, index) => buildShapeRectPart({ x: 40 + index * 62, y: 242, width: 42, height: 26 }))),
  },
  {
    key: "line-dotted",
    label: "Точечная линия",
    category: "lines",
    defaultLineStyle: "dotted",
    markup: buildShapeCompositeMarkup(Array.from({ length: 18 }, (_, index) => buildShapeRectPart({ x: 36 + index * 24, y: 248, width: 12, height: 12 }))),
  },
  {
    key: "line-arrow-right",
    label: "Линия со стрелкой",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 52, y: 244, width: 276, height: 22 }),
      buildShapePolygonMarkup([[326, 196], [460, 255], [326, 314]]),
    ]),
  },
  {
    key: "line-chevron-right",
    label: "Линия с контурной стрелкой",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 48, y: 246, width: 300, height: 18 }),
      buildShapePolygonMarkup([[336, 188], [452, 255], [336, 322], [336, 286], [394, 255], [336, 224]]),
    ]),
  },
  {
    key: "line-arrow-double",
    label: "Двойная стрелка",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 120, y: 244, width: 272, height: 22 }),
      buildShapePolygonMarkup([[120, 184], [34, 255], [120, 326]]),
      buildShapePolygonMarkup([[392, 184], [478, 255], [392, 326]]),
    ]),
  },
  {
    key: "line-bars",
    label: "Линия с засечками",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 74, y: 246, width: 364, height: 18 }),
      buildShapeRectPart({ x: 52, y: 212, width: 16, height: 88 }),
      buildShapeRectPart({ x: 444, y: 212, width: 16, height: 88 }),
    ]),
  },
  {
    key: "line-squares",
    label: "Линия с квадратами",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 96, y: 248, width: 320, height: 14 }),
      buildShapeRectPart({ x: 52, y: 226, width: 44, height: 44, rx: 6 }),
      buildShapeRectPart({ x: 416, y: 226, width: 44, height: 44, rx: 6 }),
    ]),
  },
  {
    key: "line-circles",
    label: "Линия с кругами",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 98, y: 248, width: 316, height: 14 }),
      buildShapeCirclePart({ cx: 78, cy: 255, r: 26 }),
      buildShapeCirclePart({ cx: 434, cy: 255, r: 26 }),
    ]),
  },
  {
    key: "line-diamonds",
    label: "Линия с ромбами",
    category: "lines",
    defaultLineStyle: "single",
    markup: buildShapeCompositeMarkup([
      buildShapeRectPart({ x: 98, y: 248, width: 316, height: 14 }),
      buildShapePolygonMarkup([[78, 218], [110, 255], [78, 292], [46, 255]]),
      buildShapePolygonMarkup([[434, 218], [466, 255], [434, 292], [402, 255]]),
    ]),
  },
  {
    key: "polygon-pentagon",
    label: "Пятиугольник",
    category: "polygons",
    markup: buildShapeRegularPolygonMarkup(5, { radius: 176 }),
  },
  {
    key: "polygon-hexagon",
    label: "Шестиугольник",
    category: "polygons",
    markup: buildShapeRegularPolygonMarkup(6, { radius: 174 }),
  },
  {
    key: "polygon-heptagon",
    label: "Семиугольник",
    category: "polygons",
    markup: buildShapeRegularPolygonMarkup(7, { radius: 176 }),
  },
  {
    key: "polygon-octagon",
    label: "Восьмиугольник",
    category: "polygons",
    markup: buildShapeRegularPolygonMarkup(8, { radius: 176 }),
  },
  {
    key: "polygon-decagon",
    label: "Десятиугольник",
    category: "polygons",
    markup: buildShapeRegularPolygonMarkup(10, { radius: 176 }),
  },
  {
    key: "polygon-dodecagon",
    label: "Двенадцатиугольник",
    category: "polygons",
    markup: buildShapeRegularPolygonMarkup(12, { radius: 176 }),
  },
  {
    key: "star-4",
    label: "Четырёхконечная звезда",
    category: "stars",
    markup: buildShapeStarMarkup(4, { outerRadius: 178, innerRadius: 78, rotation: -90 }),
  },
  {
    key: "star-5",
    label: "Пятиконечная звезда",
    category: "stars",
    markup: buildShapeStarMarkup(5, { outerRadius: 178, innerRadius: 74, rotation: -90 }),
  },
  {
    key: "star-6",
    label: "Шестиконечная звезда",
    category: "stars",
    markup: buildShapeStarMarkup(6, { outerRadius: 178, innerRadius: 102, rotation: -90 }),
  },
  {
    key: "star-8",
    label: "Восьмиконечная звезда",
    category: "stars",
    markup: buildShapeStarMarkup(8, { outerRadius: 176, innerRadius: 112, rotation: -90 }),
  },
  {
    key: "star-10",
    label: "Десятиконечная звезда",
    category: "stars",
    markup: buildShapeStarMarkup(10, { outerRadius: 178, innerRadius: 118, rotation: -90 }),
  },
  {
    key: "star-12",
    label: "Двенадцатиконечная звезда",
    category: "stars",
    markup: buildShapeStarMarkup(12, { outerRadius: 178, innerRadius: 122, rotation: -90 }),
  },
  {
    key: "burst-16",
    label: "Солнечный взрыв 16",
    category: "stars",
    markup: buildShapeStarMarkup(16, { outerRadius: 180, innerRadius: 134, rotation: -90 }),
  },
  {
    key: "burst-20",
    label: "Солнечный взрыв 20",
    category: "stars",
    markup: buildShapeStarMarkup(20, { outerRadius: 180, innerRadius: 140, rotation: -90 }),
  },
  {
    key: "burst-24",
    label: "Солнечный взрыв 24",
    category: "stars",
    markup: buildShapeStarMarkup(24, { outerRadius: 180, innerRadius: 144, rotation: -90 }),
  },
  {
    key: "star-sharp-8",
    label: "Острая звезда 8",
    category: "stars",
    markup: buildShapeStarMarkup(8, { outerRadius: 184, innerRadius: 58, rotation: -90 }),
  },
  {
    key: "star-sharp-12",
    label: "Острая звезда 12",
    category: "stars",
    markup: buildShapeStarMarkup(12, { outerRadius: 184, innerRadius: 52, rotation: -90 }),
  },
  {
    key: "arrow-right",
    label: "Стрелка вправо",
    category: "arrows",
    markup: buildShapePolygonMarkup([[40, 164], [254, 164], [254, 84], [472, 256], [254, 428], [254, 348], [40, 348]]),
  },
  {
    key: "arrow-left",
    label: "Стрелка влево",
    category: "arrows",
    markup: buildShapePolygonMarkup([[472, 164], [258, 164], [258, 84], [40, 256], [258, 428], [258, 348], [472, 348]]),
  },
  {
    key: "arrow-up",
    label: "Стрелка вверх",
    category: "arrows",
    markup: buildShapePolygonMarkup([[164, 472], [164, 258], [84, 258], [256, 40], [428, 258], [348, 258], [348, 472]]),
  },
  {
    key: "arrow-down",
    label: "Стрелка вниз",
    category: "arrows",
    markup: buildShapePolygonMarkup([[164, 40], [164, 254], [84, 254], [256, 472], [428, 254], [348, 254], [348, 40]]),
  },
  {
    key: "arrow-horizontal-double",
    label: "Стрелка в две стороны",
    category: "arrows",
    markup: buildShapePolygonMarkup([[122, 120], [40, 256], [122, 392], [122, 316], [390, 316], [390, 392], [472, 256], [390, 120], [390, 196], [122, 196]]),
  },
  {
    key: "arrow-vertical-double",
    label: "Вертикальная стрелка в две стороны",
    category: "arrows",
    markup: buildShapePolygonMarkup([[196, 122], [256, 40], [316, 122], [316, 196], [390, 196], [390, 256], [316, 256], [316, 390], [390, 390], [256, 472], [122, 390], [196, 390], [196, 256], [122, 256], [122, 196], [196, 196]]),
  },
  {
    key: "arrow-right-notch",
    label: "Стрелка с выемкой",
    category: "arrows",
    markup: buildShapePolygonMarkup([[44, 152], [312, 152], [312, 92], [468, 256], [312, 420], [312, 360], [44, 360], [118, 256]]),
  },
  {
    key: "arrow-right-chevron",
    label: "Шеврон вправо",
    category: "arrows",
    markup: buildShapePolygonMarkup([[42, 152], [260, 152], [442, 256], [260, 360], [42, 360], [148, 256]]),
  },
  {
    key: "arrow-left-spike",
    label: "Острая стрелка влево",
    category: "arrows",
    markup: buildShapePolygonMarkup([[472, 174], [244, 174], [244, 104], [40, 256], [244, 408], [244, 338], [472, 338], [368, 256]]),
  },
  {
    key: "flow-hexagon",
    label: "Подготовка",
    category: "flowchart",
    markup: buildShapePolygonMarkup([[92, 256], [164, 140], [348, 140], [420, 256], [348, 372], [164, 372]]),
  },
  {
    key: "flow-terminator",
    label: "Терминатор",
    category: "flowchart",
    markup: buildShapeRectPart({ x: 64, y: 148, width: 384, height: 216, rx: 108 }),
  },
  {
    key: "flow-process",
    label: "Процесс",
    category: "flowchart",
    markup: buildShapeRectPart({ x: 58, y: 132, width: 396, height: 248, rx: 22 }),
  },
  {
    key: "flow-decision",
    label: "Решение",
    category: "flowchart",
    markup: buildShapePolygonMarkup([[256, 52], [446, 256], [256, 460], [66, 256]]),
  },
  {
    key: "flow-document",
    label: "Документ",
    category: "flowchart",
    markup: buildShapePathPart({ d: "M84 108H428V386C384 340 334 340 256 386C194 423 138 421 84 388V108Z" }),
  },
  {
    key: "flow-parallelogram",
    label: "Данные",
    category: "flowchart",
    markup: buildShapePolygonMarkup([[132, 112], [462, 112], [380, 400], [50, 400]]),
  },
  {
    key: "flow-trapezoid",
    label: "Трапеция",
    category: "flowchart",
    markup: buildShapePolygonMarkup([[112, 112], [400, 112], [462, 400], [50, 400]]),
  },
  {
    key: "flow-display",
    label: "Отображение",
    category: "flowchart",
    markup: buildShapePathPart({ d: "M88 118H330C400 118 444 178 444 256S400 394 330 394H88L156 256 88 118Z" }),
  },
  {
    key: "flow-home-plate",
    label: "Домик",
    category: "flowchart",
    markup: buildShapePolygonMarkup([[88, 110], [424, 110], [424, 330], [256, 446], [88, 330]]),
  },
  {
    key: "flow-triangle-down",
    label: "Сортировка",
    category: "flowchart",
    markup: buildShapePolygonMarkup([[84, 120], [428, 120], [256, 438]]),
  },
  {
    key: "bubble-rect",
    label: "Прямоугольное облако",
    category: "speech-bubbles",
    markup: buildShapePathPart({ d: "M44 68H424V304H208L104 378L136 304H44Z" }),
  },
  {
    key: "bubble-oval",
    label: "Овальное облако",
    category: "speech-bubbles",
    markup: buildShapePathPart({ d: "M254 64C352 64 432 120 432 188C432 256 352 312 254 312H216L154 356L170 292C112 274 76 235 76 188C76 120 156 64 254 64Z" }),
  },
  {
    key: "bubble-cloud",
    label: "Облако с хвостом",
    category: "speech-bubbles",
    markup: buildShapePathPart({ d: "M130 286C94 286 68 260 68 226C68 194 90 170 122 166C132 124 168 96 214 96C240 96 264 106 282 124C298 102 326 88 358 88C412 88 456 128 456 178C456 200 448 220 434 236C410 268 374 288 332 288H254L186 352L202 286H130Z" }),
  },
  {
    key: "bubble-rounded-rect",
    label: "Скруглённое облако",
    category: "speech-bubbles",
    markup: buildShapePathPart({ d: "M96 76H372Q414 76 414 118V252Q414 294 372 294H192L122 372L126 294H96Q54 294 54 252V118Q54 76 96 76Z" }),
  },
  {
    key: "bubble-drop",
    label: "Каплевидное облако",
    category: "speech-bubbles",
    markup: buildShapePathPart({ d: "M148 72H324C398 72 452 126 452 202C452 278 398 332 324 332H240L156 402L168 332H148C86 332 40 286 40 224V180C40 118 86 72 148 72Z" }),
  },
  {
    key: "cloud-puffy",
    label: "Пушистое облако",
    category: "clouds",
    markup: buildShapePathPart({ d: "M118 332C80 332 50 304 50 268C50 234 76 208 110 204C118 154 160 116 212 116C242 116 270 128 290 148C308 122 338 106 374 106C432 106 478 148 478 200C478 232 462 258 436 276C434 308 404 332 366 332H118Z" }),
  },
  {
    key: "cloud-scallop",
    label: "Кудрявое облако",
    category: "clouds",
    markup: buildShapePathPart({ d: "M132 326C98 326 72 302 72 272C72 244 94 222 122 218C132 176 168 146 212 146C238 146 262 156 280 174C296 156 320 146 346 146C390 146 426 178 426 218C452 222 472 244 472 272C472 304 444 326 408 326H132Z" }),
  },
  {
    key: "cloud-wide",
    label: "Широкое облако",
    category: "clouds",
    markup: buildShapePathPart({ d: "M126 328C92 328 66 304 66 274C66 246 88 224 116 220C130 154 188 116 258 116C326 116 382 154 396 220C428 222 454 246 454 276C454 306 428 328 394 328H126Z" }),
  },
  {
    key: "cloud-left",
    label: "Облако с акцентом слева",
    category: "clouds",
    markup: buildShapePathPart({ d: "M116 332C76 332 46 302 46 264C46 228 74 200 110 198C122 144 174 108 236 108C296 108 346 140 362 188C396 190 424 214 432 246C438 290 406 332 356 332H116Z" }),
  },
  {
    key: "cloud-center",
    label: "Облако с акцентом по центру",
    category: "clouds",
    markup: buildShapePathPart({ d: "M128 332C92 332 64 304 64 270C64 238 88 212 120 208C138 148 190 112 256 112C322 112 374 148 392 208C424 212 448 238 448 270C448 304 420 332 384 332H128Z" }),
  },
  {
    key: "heart-classic",
    label: "Классическое сердце",
    category: "hearts",
    markup: buildShapePathPart({ d: "M256 424C240 412 220 396 202 380C132 320 78 270 78 196C78 136 124 92 182 92C216 92 248 108 268 136C288 108 320 92 354 92C412 92 458 136 458 196C458 270 404 320 334 380C316 396 296 412 280 424H256Z" }),
  },
  {
    key: "heart-wide",
    label: "Широкое сердце",
    category: "hearts",
    markup: buildShapePathPart({ d: "M256 410C220 386 196 368 166 340C114 292 86 246 86 198C86 136 132 94 188 94C220 94 246 108 268 136C290 108 316 94 348 94C404 94 450 136 450 198C450 246 422 292 370 340C340 368 316 386 280 410H256Z" }),
  },
  {
    key: "heart-soft",
    label: "Мягкое сердце",
    category: "hearts",
    markup: buildShapePathPart({ d: "M256 410C232 394 214 380 194 362C136 310 98 264 98 206C98 148 142 108 196 108C228 108 252 122 270 148C288 122 312 108 344 108C398 108 442 148 442 206C442 264 404 310 346 362C326 380 308 394 284 410H256Z" }),
  },
  {
    key: "heart-drop",
    label: "Каплевидное сердце",
    category: "hearts",
    markup: buildShapePathPart({ d: "M256 432C236 418 214 402 192 382C134 330 102 286 102 210C102 146 148 104 202 104C232 104 254 118 272 146C290 118 312 104 342 104C396 104 442 146 442 210C442 286 410 330 352 382C330 402 308 418 288 432H256Z" }),
  },
  {
    key: "heart-rounded",
    label: "Скруглённое сердце",
    category: "hearts",
    markup: buildShapePathPart({ d: "M256 412C228 394 206 378 182 356C128 306 96 266 96 206C96 150 140 112 192 112C224 112 248 126 268 152C288 126 312 112 344 112C396 112 440 150 440 206C440 266 408 306 354 356C330 378 308 394 280 412H256Z" }),
  },
  {
    key: "banner-ribbon",
    label: "Лента",
    category: "banners",
    markup: buildShapePolygonMarkup([[42, 152], [470, 152], [418, 256], [470, 360], [42, 360], [92, 256]]),
  },
  {
    key: "banner-pennant",
    label: "Вымпел",
    category: "banners",
    markup: buildShapePolygonMarkup([[96, 86], [414, 86], [414, 340], [256, 422], [96, 340]]),
  },
  {
    key: "banner-fishtail",
    label: "Флажок",
    category: "banners",
    markup: buildShapePolygonMarkup([[78, 86], [434, 86], [434, 396], [290, 334], [78, 396]]),
  },
  {
    key: "banner-rounded-pennant",
    label: "Скруглённый вымпел",
    category: "banners",
    markup: buildShapePathPart({ d: "M142 86H370Q414 86 414 130V288L256 422L98 288V130Q98 86 142 86Z" }),
  },
  {
    key: "banner-rounded-fishtail",
    label: "Скруглённый флажок",
    category: "banners",
    markup: buildShapePolygonMarkup([[108, 86], [404, 86], [404, 400], [256, 314], [108, 400]]),
  },
];

export function getConstructorTextFont(fontKey) {
  return CONSTRUCTOR_TEXT_FONTS.find((font) => font.key === fontKey) || CONSTRUCTOR_TEXT_FONTS[0];
}

export function getConstructorTextGradient(gradientKey) {
  return CONSTRUCTOR_TEXT_GRADIENTS.find((gradient) => gradient.key === gradientKey) || CONSTRUCTOR_TEXT_GRADIENTS[0];
}

export function getConstructorShape(shapeKey) {
  return CONSTRUCTOR_SHAPES.find((shape) => shape.key === shapeKey) || CONSTRUCTOR_SHAPES[0];
}

export function buildConstructorShapeSvg({
  shape,
  fillMode = "solid",
  color = "#ffffff",
  gradient = null,
  strokeStyle = "none",
  strokeColor = "transparent",
  strokeWidth = 0,
  cornerRoundness = 0,
  preserveAspectRatio = "xMidYMid meet",
  lineAspectRatio = null,
}) {
  const resolvedShape = shape || CONSTRUCTOR_SHAPES[0];

  if (resolvedShape.category === "lines") {
    return buildLineShapeSvg({
      shape: resolvedShape,
      fillMode,
      color,
      gradient,
      strokeStyle,
      strokeWidth,
      preserveAspectRatio,
      lineAspectRatio,
    });
  }

  const resolvedStrokeWidth = Math.max(0, Number(strokeWidth) || 0);
  const fill = fillMode === "gradient" && gradient?.stops?.length ? "url(#shapeGradient)" : color;
  const viewBox = buildShapeViewBox(resolvedShape);
  const shapeMarkup = buildShapeMarkupWithCornerRoundness(resolvedShape, cornerRoundness);
  const dashedDashArray = `${Math.max(34, Math.round(resolvedStrokeWidth * 4.8))} ${Math.max(16, Math.round(resolvedStrokeWidth * 2.9))}`;
  const dottedDashArray = `${Math.max(4, Math.round(resolvedStrokeWidth * 0.52))} ${Math.max(20, Math.round(resolvedStrokeWidth * 3.1))}`;
  const defsParts = [];

  if (fillMode === "gradient" && gradient?.stops?.length) {
    defsParts.push(`
      <linearGradient id="shapeGradient" x1="80" y1="80" x2="432" y2="432" gradientUnits="userSpaceOnUse">
        ${gradient.stops.map((stopColor, index) => {
          const offset = gradient.stops.length === 1 ? 0 : Math.round((index / (gradient.stops.length - 1)) * 100);
          return `<stop offset="${offset}%" stop-color="${stopColor}" />`;
        }).join("")}
      </linearGradient>
    `);
  }

  if (strokeStyle !== "none" && resolvedStrokeWidth > 0) {
    defsParts.push(`<clipPath id="shapeClip">${shapeMarkup.replaceAll("{{fill}}", "#ffffff").replaceAll("{{stroke}}", "transparent").replaceAll("{{strokeWidth}}", "0")}</clipPath>`);
  }

  const defs = defsParts.length ? `<defs>${defsParts.join("")}</defs>` : "";
  const buildMarkup = ({ fillValue, strokeValue, strokeWidthValue, scaleValue = 1, dashArray = "", lineCap = "round", lineJoin = "round" }) => {
    const baseMarkup = shapeMarkup
      .replaceAll("{{fill}}", fillValue)
      .replaceAll("{{stroke}}", strokeValue)
      .replaceAll("{{strokeWidth}}", String(strokeWidthValue))
      .replaceAll('stroke-linejoin="round"', `stroke-linejoin="${lineJoin}"`);

    const withStrokeMeta = baseMarkup
      .replaceAll(" />", `${dashArray && strokeValue !== "transparent" ? ` stroke-dasharray="${dashArray}"` : ""}${strokeValue !== "transparent" && !baseMarkup.includes("stroke-linecap") ? ` stroke-linecap="${lineCap}"` : ""}${strokeValue !== "transparent" && !baseMarkup.includes("stroke-linejoin") ? ` stroke-linejoin="${lineJoin}"` : ""} />`);

    if (scaleValue === 1) return withStrokeMeta;

    return `<g transform="translate(256 256) scale(${scaleValue}) translate(-256 -256)">${withStrokeMeta}</g>`;
  };

  const strokeLayers = [];

  const fillLayer = buildMarkup({ fillValue: fill, strokeValue: "transparent", strokeWidthValue: 0 });
  const seamStrokeWidth = Math.max(1, Math.min(2, resolvedStrokeWidth * 0.4));

  if (strokeStyle === "single" && resolvedStrokeWidth > 0) {
    strokeLayers.push(buildMarkup({ fillValue: "transparent", strokeValue: strokeColor, strokeWidthValue: seamStrokeWidth, lineCap: "square", lineJoin: "miter" }));
    strokeLayers.push(`<g clip-path="url(#shapeClip)">${buildMarkup({ fillValue: "transparent", strokeValue: strokeColor, strokeWidthValue: resolvedStrokeWidth * 2, lineCap: "square", lineJoin: "miter" })}</g>`);
  }

  if (strokeStyle === "dashed" && resolvedStrokeWidth > 0) {
    strokeLayers.push(`<g clip-path="url(#shapeClip)">${buildMarkup({ fillValue: "transparent", strokeValue: strokeColor, strokeWidthValue: resolvedStrokeWidth * 2, dashArray: dashedDashArray, lineCap: "square", lineJoin: "miter" })}</g>`);
  }

  if (strokeStyle === "dotted" && resolvedStrokeWidth > 0) {
    strokeLayers.push(`<g clip-path="url(#shapeClip)">${buildMarkup({ fillValue: "transparent", strokeValue: strokeColor, strokeWidthValue: resolvedStrokeWidth * 2, dashArray: dottedDashArray, lineCap: "square", lineJoin: "miter" })}</g>`);
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" style="display:block;overflow:visible" fill="none" preserveAspectRatio="${preserveAspectRatio}">
      ${defs}
      ${fillLayer}
      ${strokeLayers.join("")}
    </svg>
  `;
}

export function buildConstructorProducts({ tshirtItems, getTshirtSizes, parseColorOptions, parsePriceValue, normalizeVariantLabel }) {
  return tshirtItems.flatMap((item) => {
    const baseName = item.galleryModel === "classic" ? "Футболка базовая" : item.name;
    const sizes = getTshirtSizes(item);
    const printAreas = CONSTRUCTOR_PRINT_AREAS[item.galleryModel || "classic"] || CONSTRUCTOR_PRINT_AREAS.classic;

    if (!item?.variants?.length) {
      return [{
        key: `${item.galleryModel || "classic"}-${normalizeVariantLabel(item.name)}`,
        name: baseName,
        displayName: baseName,
        model: item.galleryModel || "classic",
        material: item.material || "",
        densityLabel: "",
        price: parsePriceValue(item.price || "0 ₽"),
        priceLabel: item.price || "0 ₽",
        description: item.desc || "",
        colors: parseColorOptions(item.colors || ""),
        sizes,
        printAreas,
      }];
    }

    return item.variants.map((variant) => ({
      key: `${item.galleryModel || "classic"}-${normalizeVariantLabel(variant.label || item.name)}`,
      name: baseName,
      displayName: `${baseName}${variant.label ? ` ${variant.label}` : ""}`,
      model: item.galleryModel || "classic",
      material: variant.material || item.material || "",
      densityLabel: variant.label || "",
      price: parsePriceValue(variant.price || item.price || "0 ₽"),
      priceLabel: variant.price || item.price || "0 ₽",
      description: variant.desc || item.desc || "",
      colors: parseColorOptions(variant.colors || item.colors || ""),
      sizes,
      printAreas,
    }));
  });
}

export function buildConstructorTelegramLink(lines) {
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
        line.printFormatName ? `печать ${line.printFormatName}` : null,
        line.printSizeLabel ? `занимаемая область ${line.printSizeLabel}` : null,
        Number.isFinite(line.printPrice) ? `печать ${line.printPrice.toLocaleString("ru-RU")} ₽/шт` : null,
        ...(line.layerSummary?.length ? line.layerSummary : [
          line.uploadName ? `макет ${line.uploadName}` : null,
          line.text ? `текст «${line.text}»` : null,
        ].filter(Boolean)),
        `предварительно ${line.total.toLocaleString("ru-RU")} ₽`,
      ].filter(Boolean);
      return details.join(", ");
    }),
  ].join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(message)}`;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function readImageSize(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  });
}

export function readImageContentBounds(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = Math.max(1, image.naturalWidth || 1);
      const height = Math.max(1, image.naturalHeight || 1);

      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          resolve(getFullImageRenderFrame(width, height));
          return;
        }

        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const { data } = context.getImageData(0, 0, width, height);

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const alpha = data[((y * width) + x) * 4 + 3];
            if (alpha <= 8) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve(getFullImageRenderFrame(width, height));
          return;
        }

        resolve(buildImageRenderFrame({
          width,
          height,
          bounds: {
            minX,
            minY,
            maxX: maxX + 1,
            maxY: maxY + 1,
          },
        }));
      } catch {
        resolve(getFullImageRenderFrame(width, height));
      }
    };

    image.onerror = () => resolve(getFullImageRenderFrame(1, 1));
    image.src = src;
  });
}

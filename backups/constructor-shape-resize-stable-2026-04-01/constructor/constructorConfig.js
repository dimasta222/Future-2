const PUBLIC_BASE_URL = import.meta.env.BASE_URL || "/";

function resolvePublicAssetPath(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${PUBLIC_BASE_URL}${normalizedPath}`;
}

export const CONSTRUCTOR_PRINT_AREAS = {
  classic: {
    front: { left: 50, top: 48, width: 28, height: 31, physicalWidthCm: 40, physicalHeightCm: 50 },
    back: { left: 50, top: 44, width: 30, height: 34, physicalWidthCm: 40, physicalHeightCm: 50 },
  },
  oversize: {
    front: {
      left: 49.6,
      top: 50.6,
      width: 48.4,
      height: 68.2,
      physicalWidthCm: 40,
      physicalHeightCm: 50,
      mockupSrc: resolvePublicAssetPath("mockups/oversize-black-front.png"),
      guideSrc: resolvePublicAssetPath("mockups/oversize-black-front-guide.png"),
      mockupSizes: ["XS", "S"],
    },
    back: {
      left: 49.5,
      top: 49.0,
      width: 49.0,
      height: 69.0,
      physicalWidthCm: 40,
      physicalHeightCm: 50,
      mockupSrc: resolvePublicAssetPath("mockups/oversize-black-back.png"),
      guideSrc: resolvePublicAssetPath("mockups/oversize-black-back-guide.png"),
      mockupSizes: ["XS", "S"],
    },
  },
};

export const CONSTRUCTOR_TABS = [
  { key: "textile", label: "Текстиль" },
  { key: "layers", label: "Слои" },
  { key: "upload", label: "Загрузить" },
  { key: "text", label: "Текст" },
  { key: "prints", label: "Готовые принты" },
  { key: "shapes", label: "Фигуры" },
];

export const CONSTRUCTOR_TEXT_FONTS = [
  { key: "outfit", label: "Outfit", family: "'Outfit', sans-serif", group: "sans", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 800 },
  { key: "inter", label: "Inter", family: "'Inter', sans-serif", group: "sans", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 800 },
  { key: "bebas", label: "Bebas Neue", family: "'Bebas Neue', sans-serif", group: "display", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "unbounded", label: "Unbounded", family: "'Unbounded', sans-serif", group: "display", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 700 },
  { key: "script", label: "Marck Script", family: "'Marck Script', cursive", group: "script", supportsBold: false, supportsItalic: false, regularWeight: 400, boldWeight: 400 },
  { key: "mono", label: "IBM Plex Mono", family: "'IBM Plex Mono', monospace", group: "mono", supportsBold: true, supportsItalic: false, regularWeight: 500, boldWeight: 700 },
];

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

function buildLineDecorationMarkup(shapeKey, paint, thickness) {
  switch (shapeKey) {
    case "line-arrow-right":
      return `<polygon points="330,196 462,256 330,316" fill="${paint}" />`;
    case "line-chevron-right":
      return `<polyline points="338,194 450,256 338,318" fill="none" stroke="${paint}" stroke-width="${Math.max(18, Math.round(thickness * 1.15))}" stroke-linecap="square" stroke-linejoin="miter" />`;
    case "line-arrow-double":
      return `<polygon points="120,186 34,256 120,326" fill="${paint}" /><polygon points="392,186 478,256 392,326" fill="${paint}" />`;
    case "line-bars":
      return `<rect x="46" y="208" width="18" height="96" fill="${paint}" /><rect x="448" y="208" width="18" height="96" fill="${paint}" />`;
    case "line-squares":
      return `<rect x="46" y="226" width="46" height="46" rx="6" fill="${paint}" /><rect x="420" y="226" width="46" height="46" rx="6" fill="${paint}" />`;
    case "line-circles":
      return `<circle cx="76" cy="256" r="26" fill="${paint}" /><circle cx="436" cy="256" r="26" fill="${paint}" />`;
    case "line-diamonds":
      return `<polygon points="76,218 110,256 76,294 42,256" fill="${paint}" /><polygon points="436,218 470,256 436,294 402,256" fill="${paint}" />`;
    default:
      return "";
  }
}

function buildLineShapeSvg({ shape, fillMode, color, gradient, strokeStyle, strokeWidth }) {
  const paint = fillMode === "gradient" && gradient?.stops?.length ? "url(#shapeGradient)" : color;
  const thickness = Math.max(6, Number(strokeWidth) || 14);
  const viewBox = buildShapeViewBox(shape);
  const effectiveLineStyle = strokeStyle !== "none"
    ? strokeStyle
    : (shape.defaultLineStyle || "single");
  const defs = fillMode === "gradient" && gradient?.stops?.length
    ? `<defs>
        <linearGradient id="shapeGradient" x1="56" y1="256" x2="456" y2="256" gradientUnits="userSpaceOnUse">
          ${gradient.stops.map((stopColor, index) => {
            const offset = gradient.stops.length === 1 ? 0 : Math.round((index / (gradient.stops.length - 1)) * 100);
            return `<stop offset="${offset}%" stop-color="${stopColor}" />`;
          }).join("")}
        </linearGradient>
      </defs>`
    : "";

  let bodyMarkup = "";

  switch (shape.key) {
    case "line-arrow-right":
      bodyMarkup = buildLineBodyMarkup({ x1: 50, y1: 256, x2: 330, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    case "line-chevron-right":
      bodyMarkup = buildLineBodyMarkup({ x1: 48, y1: 256, x2: 334, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    case "line-arrow-double":
      bodyMarkup = buildLineBodyMarkup({ x1: 116, y1: 256, x2: 396, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    case "line-bars":
      bodyMarkup = buildLineBodyMarkup({ x1: 74, y1: 256, x2: 438, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    case "line-squares":
      bodyMarkup = buildLineBodyMarkup({ x1: 98, y1: 256, x2: 414, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    case "line-circles":
      bodyMarkup = buildLineBodyMarkup({ x1: 102, y1: 256, x2: 410, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    case "line-diamonds":
      bodyMarkup = buildLineBodyMarkup({ x1: 102, y1: 256, x2: 410, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
    default:
      bodyMarkup = buildLineBodyMarkup({ x1: 48, y1: 256, x2: 464, y2: 256, paint, thickness, lineStyle: effectiveLineStyle });
      break;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" style="display:block;overflow:visible" fill="none">
      ${defs}
      ${bodyMarkup}
      ${buildLineDecorationMarkup(shape.key, paint, thickness)}
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
  preserveAspectRatio = "xMidYMid meet",
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
    });
  }

  const resolvedStrokeWidth = Math.max(0, Number(strokeWidth) || 0);
  const fill = fillMode === "gradient" && gradient?.stops?.length ? "url(#shapeGradient)" : color;
  const viewBox = buildShapeViewBox(resolvedShape);
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
    defsParts.push(`<clipPath id="shapeClip">${resolvedShape.markup.replaceAll("{{fill}}", "#ffffff").replaceAll("{{stroke}}", "transparent").replaceAll("{{strokeWidth}}", "0")}</clipPath>`);
  }

  const defs = defsParts.length ? `<defs>${defsParts.join("")}</defs>` : "";
  const buildMarkup = ({ fillValue, strokeValue, strokeWidthValue, scaleValue = 1, dashArray = "", lineCap = "round", lineJoin = "round" }) => {
    const baseMarkup = resolvedShape.markup
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

  if (strokeStyle === "single" && resolvedStrokeWidth > 0) {
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

export function createConstructorPresetPrints(svgToDataUri) {
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

  return [
    { key: "future", label: "Future Badge", src: svgToDataUri(presets.future) },
    { key: "lightning", label: "Lightning", src: svgToDataUri(presets.lightning) },
    { key: "smile", label: "Smile", src: svgToDataUri(presets.smile) },
    { key: "circle", label: "Future DTF", src: svgToDataUri(presets.circle) },
  ];
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
        ...(line.layerSummary?.length ? line.layerSummary : [
          line.uploadName ? `макет ${line.uploadName}` : null,
          line.text ? `текст «${line.text}»` : null,
          line.presetLabel ? `принт ${line.presetLabel}` : null,
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

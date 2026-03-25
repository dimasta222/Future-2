const TSHIRT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

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

export function parseColorOptions(colorsValue) {
  if (!colorsValue) return [];
  return colorsValue.split(",").map((color) => color.trim()).filter(Boolean);
}

export function normalizeColorName(colorName = "") {
  return colorName.toLowerCase().replace(/ё/g, "е").trim();
}

export function getDefaultTshirtColor(options) {
  if (!options?.length) return "";
  return options.find((option) => normalizeColorName(option) === "черный") || "";
}

export function resolveColorSwatch(colorName) {
  return COLOR_SWATCHES[normalizeColorName(colorName)] || {
    background: "linear-gradient(135deg,#6c5ce7,#e84393)",
    border: "rgba(255,255,255,.14)",
    labelColor: "#f0eef5",
  };
}

export function normalizeVariantLabel(variantLabel = "") {
  const match = String(variantLabel).match(/\d+/);
  return match ? match[0] : "";
}

export function getTshirtSizes(item) {
  return item?.sizes === "XS – 3XL" ? TSHIRT_SIZE_OPTIONS : [];
}

export function parsePriceValue(price) {
  if (!price) return 0;
  const digits = String(price).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
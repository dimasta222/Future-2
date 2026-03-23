export const CONSTRUCTOR_PRINT_AREAS = {
  classic: {
    front: { left: 50, top: 48, width: 28, height: 31 },
    back: { left: 50, top: 44, width: 30, height: 34 },
  },
  oversize: {
    front: { left: 50, top: 47, width: 30, height: 33 },
    back: { left: 50, top: 43, width: 32, height: 36 },
  },
};

export const CONSTRUCTOR_TABS = [
  { key: "textile", label: "Текстиль" },
  { key: "upload", label: "Загрузить" },
  { key: "text", label: "Текст" },
  { key: "prints", label: "Готовые принты" },
];

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
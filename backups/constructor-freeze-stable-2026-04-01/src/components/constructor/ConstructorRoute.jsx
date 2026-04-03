import ConstructorPage from "./ConstructorPage.jsx";
import { buildConstructorProducts, createConstructorPresetPrints } from "./constructorConfig.js";
import { getTshirtSizes, normalizeVariantLabel, parseColorOptions, parsePriceValue } from "../../shared/textileHelpers.js";
import { svgToDataUri } from "../../shared/textilePreviewHelpers.js";

const CONSTRUCTOR_PRODUCTS = buildConstructorProducts({
  tshirtItems: [
    {
      name: "Футболка оверсайз",
      galleryModel: "oversize",
      sizes: "XS – 3XL",
      variants: [
        { label: "180 г/м²", material: "100% хлопок", colors: "Чёрный, Белый, Розовый, Тёмно-серый, Меланж", price: "800 ₽", desc: "Средней плотности футболка свободного кроя. Идеальна для ярких принтов. Не садится после стирки." },
        { label: "240 г/м²", material: "100% хлопок", colors: "Чёрный, Белый, Бежевый, Розовый", price: "1 000 ₽", desc: "Плотная футболка свободного кроя. Идеальна для ярких принтов. Не садится после стирки." },
      ],
    },
    {
      name: "Футболка классика",
      galleryModel: "classic",
      sizes: "XS – 3XL",
      variants: [
        { label: "180 г/м²", material: "100% хлопок", colors: "Чёрный, Белый", price: "650 ₽", desc: "Классический крой, мягкий хлопок. Отлично подходит для корпоративных тиражей и мерча." },
      ],
    },
  ],
  getTshirtSizes,
  parseColorOptions,
  parsePriceValue,
  normalizeVariantLabel,
});

const CONSTRUCTOR_PRESET_PRINTS = createConstructorPresetPrints(svgToDataUri);

export default function ConstructorRoute({ onBack }) {
  return <ConstructorPage onBack={onBack} products={CONSTRUCTOR_PRODUCTS} presetPrints={CONSTRUCTOR_PRESET_PRINTS} />;
}
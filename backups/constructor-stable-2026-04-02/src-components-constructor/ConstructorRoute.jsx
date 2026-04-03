import { Component, useEffect, useState } from "react";
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

class ConstructorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[constructor] runtime crash", error, errorInfo);
  }

  render() {
    const { error, errorInfo } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div style={{ minHeight: "100vh", background: "#08080c", color: "#f0eef5", fontFamily: "'Outfit',sans-serif", padding: "32px 16px 48px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(240,238,245,.42)", marginBottom: 8 }}>
              Constructor Runtime Error
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(28px,4vw,42px)", lineHeight: 1.05, fontWeight: 600 }}>
              Конструктор поймал runtime-ошибку
            </h1>
          </div>

          <div style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(232,67,147,.24)", background: "rgba(232,67,147,.08)" }}>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "#ffd7e7" }}>
              {error.message || "Unknown constructor error"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ width: "fit-content", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#f0eef5", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
            >
              Перезагрузить страницу
            </button>

            <pre style={{ margin: 0, padding: 16, borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "rgba(240,238,245,.84)", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {String(error.stack || error)}
              {errorInfo?.componentStack ? `\n\nComponent stack:${errorInfo.componentStack}` : ""}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}

function ConstructorGlobalErrorScreen({ error, onReset }) {
  return (
    <div style={{ minHeight: "100vh", background: "#08080c", color: "#f0eef5", fontFamily: "'Outfit',sans-serif", padding: "32px 16px 48px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(240,238,245,.42)", marginBottom: 8 }}>
            Constructor Global Error
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(28px,4vw,42px)", lineHeight: 1.05, fontWeight: 600 }}>
            Конструктор поймал глобальную ошибку
          </h1>
        </div>

        <div style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(232,67,147,.24)", background: "rgba(232,67,147,.08)" }}>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: "#ffd7e7" }}>
            {error?.message || "Unknown constructor error"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onReset}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#f0eef5", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
          >
            Сбросить ошибку
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#f0eef5", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}
          >
            Перезагрузить страницу
          </button>
        </div>

        <pre style={{ margin: 0, padding: 16, borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "rgba(240,238,245,.84)", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {String(error?.stack || error?.reason?.stack || error?.reason || error)}
        </pre>
      </div>
    </div>
  );
}

function ConstructorRuntimeGuard({ children }) {
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    const handleWindowError = (event) => {
      const nextError = event?.error || new Error(event?.message || "Unknown window error");
      console.error("[constructor] global window error", nextError);
      setGlobalError(nextError);
    };

    const handleUnhandledRejection = (event) => {
      const reason = event?.reason;
      const nextError = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : "Unhandled promise rejection");
      nextError.reason = reason;
      console.error("[constructor] unhandled rejection", reason);
      setGlobalError(nextError);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  if (globalError) {
    return <ConstructorGlobalErrorScreen error={globalError} onReset={() => setGlobalError(null)} />;
  }

  return children;
}

export default function ConstructorRoute({ onBack }) {
  return (
    <ConstructorRuntimeGuard>
      <ConstructorErrorBoundary>
        <ConstructorPage onBack={onBack} products={CONSTRUCTOR_PRODUCTS} presetPrints={CONSTRUCTOR_PRESET_PRINTS} />
      </ConstructorErrorBoundary>
    </ConstructorRuntimeGuard>
  );
}
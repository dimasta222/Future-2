import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "calc-onboarding-done";

const STEPS = [
  {
    target: '[data-calc-onboarding="add-size"]',
    title: "Добавьте размер принта",
    text: "Создайте новую строку с шириной, высотой и тиражом. Можно добавить несколько разных размеров — они уложатся на одно полотно автоматически.",
  },
  {
    target: '[data-calc-onboarding="upload"]',
    title: "Загрузите файлы принтов",
    text: "Перетащите или выберите PNG, JPG, SVG, PDF, TIFF. Размеры подставятся автоматически из файла, а превью появится в раскладке.",
  },
  {
    target: '[data-calc-onboarding="with-apply"]',
    title: "С нанесением",
    text: "Цена включает печать DTF + нанесение на изделие. Подходит, если вам нужна готовая продукция.",
  },
  {
    target: '[data-calc-onboarding="print-only"]',
    title: "Только печать",
    text: "Цена за полотно DTF без нанесения. Подходит, если вы переносите принты сами или у вас есть свой подрядчик.",
  },
  {
    target: '[data-calc-onboarding="reset"]',
    title: "Сброс",
    text: "Очищает все добавленные размеры и файлы, чтобы начать расчёт заново.",
  },
];

const PAD = 6;

function getAbsoluteRect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY - PAD,
    left: r.left + window.scrollX - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function scrollToShowTooltip(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const TOOLTIP_SPACE = 240;
  const HEADER_PAD = 24;
  const viewportH = window.innerHeight;
  const spaceBelow = viewportH - r.bottom;
  const spaceAbove = r.top;
  // If neither side fits, scroll element to upper third so tooltip below fits.
  if (spaceBelow < TOOLTIP_SPACE && spaceAbove < TOOLTIP_SPACE) {
    const targetY = window.scrollY + r.top - HEADER_PAD;
    document.body.style.overflow = "";
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    setTimeout(() => { document.body.style.overflow = "hidden"; }, 250);
    return true;
  }
  // Element off-screen at top
  if (r.top < HEADER_PAD) {
    const targetY = window.scrollY + r.top - HEADER_PAD;
    document.body.style.overflow = "";
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    setTimeout(() => { document.body.style.overflow = "hidden"; }, 250);
    return true;
  }
  return false;
}

export default function CalcOnboarding() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("calc-onboarding")) {
        localStorage.removeItem(STORAGE_KEY);
      }
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* private mode */
    }
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    scrollYRef.current = scrollY;
    document.body.style.overflow = "hidden";
    window.scrollTo(scrollX, scrollY);
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const el = document.querySelector(STEPS[step]?.target);
    if (!el) return undefined;

    const rafId = requestAnimationFrame(() => {
      setRect(getAbsoluteRect(el));
      scrollToShowTooltip(el);
    });

    const handleResize = () => {
      setRect(getAbsoluteRect(el));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, [visible, step]);

  useEffect(() => {
    if (!visible) return undefined;
    const el = document.querySelector(STEPS[0]?.target);
    const rafId = requestAnimationFrame(() => {
      setRect(getAbsoluteRect(el));
    });
    return () => cancelAnimationFrame(rafId);
  }, [visible]);

  const finish = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }, [step, finish]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  if (!visible || !rect) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = viewportW <= 600;
  const sidePad = isMobile ? 12 : 16;
  const maxTooltipW = Math.min(340, viewportW - sidePad * 2);
  const minTooltipW = Math.min(280, viewportW - sidePad * 2);
  const tooltipWidth = Math.min(Math.max(rect.width, minTooltipW), maxTooltipW);
  const maxLeft = window.scrollX + viewportW - tooltipWidth - sidePad;
  const minLeft = window.scrollX + sidePad;
  // Estimate tooltip height (varies by step text length); 220 covers worst case.
  const estTooltipH = 220;
  const spotBottomViewport = rect.top - window.scrollY + rect.height;
  const spaceBelow = viewportH - spotBottomViewport;
  const placeAbove = spaceBelow < estTooltipH + 24 && rect.top - window.scrollY > estTooltipH + 24;
  const tooltipTop = placeAbove
    ? rect.top - estTooltipH - 12
    : rect.top + rect.height + 12;
  const tooltipLeft = Math.min(Math.max(rect.left, minLeft), maxLeft);

  return (
    <div
      style={{ position: "absolute", top: 0, left: 0, width: "100%", minHeight: "100%", height: document.documentElement.scrollHeight, zIndex: 9999, pointerEvents: "none" }}
    >
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          <mask id="calc-onboarding-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx="14"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(6,6,10,0.72)"
          mask="url(#calc-onboarding-mask)"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          border: "2px solid rgba(232,67,147,.5)",
          boxShadow: "0 0 24px rgba(232,67,147,.25), inset 0 0 24px rgba(232,67,147,.08)",
          pointerEvents: "none",
          transition: "all .35s cubic-bezier(.4,0,.2,1)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
          maxWidth: 340,
          background: "linear-gradient(135deg, rgba(30,28,42,.97), rgba(22,20,34,.97))",
          border: "1px solid rgba(232,67,147,.25)",
          borderRadius: 16,
          padding: isMobile ? "14px 16px" : "18px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,.5)",
          backdropFilter: "blur(16px)",
          transition: "all .35s cubic-bezier(.4,0,.2,1)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "linear-gradient(90deg,#e84393,#6c5ce7)" : "rgba(255,255,255,.12)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#f0eef5",
            marginBottom: 6,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {current.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(240,238,245,.6)",
            lineHeight: 1.55,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          {current.text}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 ? (
              <button
                type="button"
                onClick={prev}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.1)",
                  background: "rgba(255,255,255,.04)",
                  color: "rgba(240,238,245,.6)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                Назад
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              style={{
                padding: "7px 18px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#e84393,#6c5ce7)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {isLast ? "Готово!" : "Далее"}
            </button>
          </div>
          {!isLast ? (
            <button
              type="button"
              onClick={finish}
              style={{
                padding: "7px 10px",
                border: "none",
                background: "none",
                color: "rgba(240,238,245,.35)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              Пропустить
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "constructor-onboarding-done";

const STEPS = [
  {
    target: '[data-onboarding="textile"]',
    title: "Выберите тип футболки",
    text: "Начните с выбора модели: Классик или Oversize. У каждой — свои материалы и цены.",
  },
  {
    target: '[data-onboarding="size"]',
    title: "Укажите размер",
    text: "Выберите нужный размер. Если сомневаетесь — загляните в размерную сетку.",
  },
  {
    target: '[data-onboarding="color"]',
    title: "Выберите цвет",
    text: "Выберите цвет футболки — превью обновится автоматически.",
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
  const TOOLTIP_SPACE = 220;
  const neededBottom = r.bottom + TOOLTIP_SPACE;
  if (r.top < 40 || neededBottom > window.innerHeight) {
    const targetY = window.scrollY + r.top - 40;
    document.body.style.overflow = "";
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    setTimeout(() => { document.body.style.overflow = "hidden"; }, 250);
    return true;
  }
  return false;
}

export default function ConstructorOnboarding() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("onboarding")) {
        localStorage.removeItem(STORAGE_KEY);
      }
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* private mode */
    }
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  /* Block page scroll while onboarding is visible */
  useEffect(() => {
    if (!visible) return undefined;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    scrollYRef.current = scrollY;
    document.body.style.overflow = "hidden";
    // keep scroll position
    window.scrollTo(scrollX, scrollY);
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  /* Compute absolute rect & scroll to element on step change */
  useEffect(() => {
    if (!visible) return undefined;
    const el = document.querySelector(STEPS[step]?.target);
    if (!el) return undefined;

    setRect(getAbsoluteRect(el));
    scrollToShowTooltip(el);

    const handleResize = () => {
      setRect(getAbsoluteRect(el));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [visible, step]);

  /* Initial measurement for step 0 (no scroll needed) */
  useEffect(() => {
    if (!visible) return;
    const el = document.querySelector(STEPS[0]?.target);
    setRect(getAbsoluteRect(el));
  }, [visible]);

  const finish = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const tooltipTop = rect.top + rect.height + 12;
  const tooltipLeft = rect.left;

  return (
    <div
      style={{ position: "absolute", top: 0, left: 0, width: "100%", minHeight: "100%", height: document.documentElement.scrollHeight, zIndex: 9999, pointerEvents: "none" }}
    >
      {/* Overlay with spotlight cutout */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <defs>
          <mask id="onboarding-mask">
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
          mask="url(#onboarding-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
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

      {/* Tooltip */}
      <div
        style={{
          position: "absolute",
          top: tooltipTop,
          left: tooltipLeft,
          width: Math.max(rect.width, 260),
          maxWidth: 320,
          background: "linear-gradient(135deg, rgba(30,28,42,.97), rgba(22,20,34,.97))",
          border: "1px solid rgba(232,67,147,.25)",
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,.5)",
          backdropFilter: "blur(16px)",
          transition: "all .35s cubic-bezier(.4,0,.2,1)",
          pointerEvents: "auto",
        }}
      >
        {/* Step counter */}
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

        {/* Buttons */}
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

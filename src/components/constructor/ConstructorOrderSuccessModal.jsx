import { useEffect, useMemo } from "react";

// Модальное окно успешной отправки заказа: анимированная галочка, номер
// заказа и кнопка скачать PDF-сводку (тот же файл, что улетает в Telegram).
export default function ConstructorOrderSuccessModal({
  orderNumber,
  summaryBlob,
  isLocalFallback = false,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const summaryUrl = useMemo(() => (summaryBlob ? URL.createObjectURL(summaryBlob) : null), [summaryBlob]);
  useEffect(() => () => { if (summaryUrl) URL.revokeObjectURL(summaryUrl); }, [summaryUrl]);

  const downloadName = orderNumber ? `Заказ ${orderNumber}.pdf` : "Заказ FUTURE.pdf";

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1200, background: "rgba(8,7,16,.78)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      animation: "fsOrderSuccessFadeIn .25s ease-out both",
    }}>
      <style>{`
        @keyframes fsOrderSuccessFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fsOrderSuccessPop { 0% { transform: scale(.85); opacity: 0 } 60% { transform: scale(1.04); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fsCheckCircle { from { stroke-dashoffset: 320 } to { stroke-dashoffset: 0 } }
        @keyframes fsCheckMark { from { stroke-dashoffset: 80 } to { stroke-dashoffset: 0 } }
        @keyframes fsCheckGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(232, 67, 147, .55), 0 18px 60px -18px rgba(108, 92, 231, .55) } 50% { box-shadow: 0 0 0 18px rgba(232, 67, 147, 0), 0 18px 60px -18px rgba(108, 92, 231, .85) } }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(440px, 100%)",
        background: "linear-gradient(180deg, rgba(28,24,46,.96), rgba(18,16,32,.96))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 24,
        padding: "36px 28px 28px",
        textAlign: "center",
        color: "#f5f3fb",
        fontFamily: "'Outfit', sans-serif",
        boxShadow: "0 40px 120px -30px rgba(0,0,0,.7)",
        animation: "fsOrderSuccessPop .45s cubic-bezier(.18,.89,.32,1.28) both",
      }}>
        <div style={{
          width: 96, height: 96, margin: "0 auto 22px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #e84393 0%, #6c5ce7 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fsCheckGlow 2.4s ease-in-out infinite",
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="25" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" fill="none"
              strokeDasharray="160" strokeDashoffset="0"
              style={{ animation: "fsCheckCircle .6s ease-out .1s both", transformOrigin: "center" }} />
            <path d="M16 28.5 L25 37 L41 19" stroke="#fff" strokeWidth="4.5" fill="none"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="80" strokeDashoffset="80"
              style={{ animation: "fsCheckMark .45s cubic-bezier(.65,.05,.36,1) .6s both" }} />
          </svg>
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 700, letterSpacing: -.3 }}>
          {isLocalFallback ? "Заказ отправлен" : "Заказ успешно отправлен"}
        </h2>

        {orderNumber && (
          <div style={{ margin: "0 0 16px", fontSize: 14, color: "rgba(245,243,251,.55)" }}>
            Номер заказа
            <div style={{
              marginTop: 6, fontSize: 22, fontWeight: 600, color: "#f5f3fb",
              letterSpacing: .5,
            }}>{orderNumber}</div>
          </div>
        )}

        <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.55, color: "rgba(245,243,251,.72)" }}>
          {isLocalFallback
            ? "Бэкенд сейчас недоступен — мы сохранили файлы заказа на ваш компьютер. Свяжитесь с нами в Telegram для оформления."
            : "Мы получили вашу заявку и свяжемся с вами в ближайшее время для подтверждения деталей."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {summaryUrl && (
            <a
              href={summaryUrl}
              download={downloadName}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 20px", borderRadius: 12,
                background: "linear-gradient(135deg, #e84393 0%, #6c5ce7 100%)",
                color: "#fff", fontWeight: 600, fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 8px 24px -8px rgba(232, 67, 147, .55)",
                transition: "transform .15s ease",
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Скачать PDF заказа
            </a>
          )}
          <button type="button" onClick={onClose} style={{
            padding: "11px 20px", borderRadius: 12,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.1)",
            color: "#f5f3fb", fontWeight: 500, fontSize: 14,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

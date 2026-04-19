import { useEffect, useRef, useState } from "react";
import TG from "./TG.jsx";
import MAX from "./MAX.jsx";

const TELEGRAM_URL = "https://t.me/FUTURE_178";
const MAX_URL = "https://max.ru/u/f9LHodD0cOL0pTqxSNqIn22flD78BhADnB7BLdrGb3yZbXHeBKclVTh-b2I";

export default function MessengerPicker({ label, className, style, icon, iconSize = 18 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onClickOutside);
    return () => document.removeEventListener("pointerdown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "flex" }}>
      <button type="button" className={className} style={{ flex: 1, ...style }} onClick={() => setOpen((v) => !v)}>
        {icon}{label}
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 10, padding: "12px 16px", borderRadius: 16,
          background: "rgba(20,18,28,.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 12px 40px rgba(0,0,0,.4)",
          zIndex: 100, whiteSpace: "nowrap", animation: "fadeUp 0.2s forwards",
        }}>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12,
              background: "linear-gradient(135deg,rgba(0,136,204,.15),rgba(108,92,231,.15))",
              border: "1px solid rgba(0,136,204,.25)", color: "#f0eef5", textDecoration: "none",
              fontSize: 14, fontWeight: 500, fontFamily: "'Outfit',sans-serif", transition: "transform .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <span style={{ width: iconSize, height: iconSize, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><TG /></span>
            Telegram
          </a>
          <a
            href={MAX_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12,
              background: "linear-gradient(135deg,rgba(68,204,255,.12),rgba(85,51,238,.12))",
              border: "1px solid rgba(68,204,255,.2)", color: "#f0eef5", textDecoration: "none",
              fontSize: 14, fontWeight: 500, fontFamily: "'Outfit',sans-serif", transition: "transform .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <span style={{ width: iconSize, height: iconSize, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, overflow: "hidden" }}><MAX /></span>
            MAX
          </a>
        </div>
      )}
    </div>
  );
}

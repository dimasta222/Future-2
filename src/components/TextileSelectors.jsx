import FieldRow from "./FieldRow.jsx";
import { resolveColorSwatch } from "../shared/textileHelpers.js";

export function SizeSelector({ options, value, onChange }) {
  if (!options.length) return null;

  return (
    <FieldRow label="Размер" minHeight={102}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", minHeight: 68 }}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? "" : option)}
              style={{
                minWidth: 46,
                padding: "8px 12px",
                borderRadius: 10,
                border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
                background: active ? "linear-gradient(135deg,rgba(232,67,147,.16),rgba(108,92,231,.16))" : "rgba(255,255,255,.03)",
                color: active ? "#f0eef5" : "rgba(240,238,245,.56)",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                transition: "all .25s",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </FieldRow>
  );
}

export function ColorSelector({ options, value, onChange }) {
  if (!options.length) return null;

  return (
    <FieldRow label="Цвет" minHeight={102}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", minHeight: 68 }}>
        {options.map((option) => {
          const active = option === value;
          const swatch = resolveColorSwatch(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? "" : option)}
              aria-label={`Выбрать цвет ${option}`}
              title={option}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px 7px 7px",
                borderRadius: 999,
                border: active ? "1px solid rgba(232,67,147,.35)" : "1px solid rgba(255,255,255,.08)",
                background: active ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)",
                cursor: "pointer",
                transition: "all .25s",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: swatch.background, border: `1px solid ${swatch.border}` }} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#f0eef5" : "rgba(240,238,245,.56)" }}>{option}</span>
            </button>
          );
        })}
      </div>
    </FieldRow>
  );
}

export function QtySelector({ value, onChange }) {
  return (
    <FieldRow label="Количество">
      <div className="qty-inline" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {[
          { label: "−", next: Math.max(1, value - 1) },
          { label: "+", next: value + 1 },
        ].map((control) => (
          <button
            key={control.label}
            type="button"
            onClick={() => onChange(control.next)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.03)",
              color: "#f0eef5",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {control.label}
          </button>
        ))}
        <input
          type="number"
          min="1"
          value={value}
          onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
          className="inf"
          style={{ width: 88, padding: "8px 12px", textAlign: "center", fontSize: 16, fontWeight: 600 }}
        />
        <span style={{ fontSize: 13, color: "rgba(240,238,245,.45)" }}>шт</span>
      </div>
    </FieldRow>
  );
}
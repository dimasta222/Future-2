import { useState } from "react";

const INPUT_STYLE = {
  width: "100%",
  padding: "12px 16px",
  background: "rgba(255,255,255,.04)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 12,
  color: "#f0eef5",
  fontSize: 14,
  fontFamily: "'Outfit', sans-serif",
  outline: "none",
  transition: "border-color .3s",
};

const LABEL_STYLE = {
  fontSize: 12,
  fontWeight: 500,
  color: "rgba(240,238,245,.5)",
  letterSpacing: 1,
  marginBottom: 4,
};

export default function ConstructorOrderModal({ orderMeta, currentTotal, onClose, onSubmit, isSubmitting }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Введите имя";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) e.phone = "Введите номер телефона";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (evt) => {
    evt.preventDefault();
    if (!validate()) return;
    onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto",
          background: "#141418", borderRadius: 24,
          border: "1px solid rgba(255,255,255,.08)",
          padding: "32px 28px 28px",
          display: "flex", flexDirection: "column", gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#f0eef5" }}>Оформление заказа</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,238,245,.4)", fontSize: 24, lineHeight: 1, padding: 4 }}>&times;</button>
        </div>

        <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.03)", display: "flex", flexDirection: "column", gap: 0 }}>
          {orderMeta.map(([label, value], i) => {
            if (label === "---") return <div key={`sep-${i}`} style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "8px 0" }} />;
            if (label === "hint") return <div key={`h-${i}`} style={{ fontSize: 12, color: "rgba(240,238,245,.35)", padding: "4px 0" }}>{value}</div>;
            const isTotal = label === "Итого за 1 шт";
            return (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0" }}>
                <span style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>{label}</span>
                <span style={{ fontSize: isTotal ? 16 : 14, fontWeight: isTotal ? 700 : 500, color: "#f0eef5" }}>{value}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(232,67,147,.1),rgba(108,92,231,.1))", border: "1px solid rgba(232,67,147,.2)" }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: "#f0eef5" }}>Итого</span>
          <span style={{ fontSize: 26, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {currentTotal.toLocaleString("ru-RU")} ₽
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 2, color: "#e84393", textTransform: "uppercase" }}>Контактные данные</div>
          <div>
            <div style={LABEL_STYLE}>Имя *</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              style={{ ...INPUT_STYLE, borderColor: errors.name ? "rgba(255,80,80,.5)" : "rgba(255,255,255,.1)" }}
              onFocus={(e) => { e.target.style.borderColor = "#e84393"; }}
              onBlur={(e) => { e.target.style.borderColor = errors.name ? "rgba(255,80,80,.5)" : "rgba(255,255,255,.1)"; }}
            />
            {errors.name && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 4 }}>{errors.name}</div>}
          </div>
          <div>
            <div style={LABEL_STYLE}>Телефон *</div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (___) ___-__-__"
              style={{ ...INPUT_STYLE, borderColor: errors.phone ? "rgba(255,80,80,.5)" : "rgba(255,255,255,.1)" }}
              onFocus={(e) => { e.target.style.borderColor = "#e84393"; }}
              onBlur={(e) => { e.target.style.borderColor = errors.phone ? "rgba(255,80,80,.5)" : "rgba(255,255,255,.1)"; }}
            />
            {errors.phone && <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 4 }}>{errors.phone}</div>}
          </div>
          <div>
            <div style={LABEL_STYLE}>Email <span style={{ color: "rgba(240,238,245,.25)" }}>(необязательно)</span></div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              style={INPUT_STYLE}
              onFocus={(e) => { e.target.style.borderColor = "#e84393"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,.1)"; }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%", padding: "16px 32px", borderRadius: 50,
            background: isSubmitting ? "rgba(232,67,147,.3)" : "linear-gradient(135deg,#e84393,#6c5ce7)",
            border: "none", cursor: isSubmitting ? "wait" : "pointer",
            color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
            transition: "all .3s",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Отправка заказа..." : "Отправить заказ"}
        </button>

        <div style={{ fontSize: 11, color: "rgba(240,238,245,.25)", textAlign: "center", lineHeight: 1.5 }}>
          Нажимая «Отправить заказ», вы соглашаетесь на обработку контактных данных для связи по вашему заказу.
        </div>
      </form>
    </div>
  );
}

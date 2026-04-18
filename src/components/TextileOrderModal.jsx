import { useState } from "react";
import { parsePriceValue } from "../shared/textileHelpers.js";
import { buildTelegramBasketLink } from "../shared/textileOrderLinks.js";

export default function TextileOrderModal({ order, onUpdateQty, onRemove, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const totalQty = order.reduce((s, l) => s + l.qty, 0);
  const totalPrice = order.reduce((s, l) => s + parsePriceValue(l.price) * l.qty, 0);

  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 6 && order.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const url = buildTelegramBasketLink(order, { customerName: name.trim(), customerPhone: phone.trim() });
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.assign(url);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" }} />
      <div onClick={(e) => e.stopPropagation()} style={{
        position: "relative", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        background: "#111118", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20,
        padding: "clamp(20px, 4vw, 32px)", color: "#f0eef5", fontFamily: "'Outfit',sans-serif",
      }}>
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(240,238,245,.5)", cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>

        <h3 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 6px" }}>Оформление заказа</h3>
        <p style={{ fontSize: 13, color: "rgba(240,238,245,.4)", margin: "0 0 20px" }}>{totalQty} {totalQty === 1 ? "позиция" : totalQty < 5 ? "позиции" : "позиций"} • {totalPrice.toLocaleString("ru-RU")} ₽</p>

        {/* Order lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {order.map((line) => (
            <div key={line.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.03)", borderRadius: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{line.itemName}</div>
                <div style={{ fontSize: 12, color: "rgba(240,238,245,.4)", marginTop: 2 }}>
                  {[line.variantLabel, line.size, line.color].filter(Boolean).join(" • ")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,.04)", borderRadius: 8, padding: 2 }}>
                  <button type="button" onClick={() => onUpdateQty(line.id, line.qty - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: "#f0eef5", cursor: "pointer", fontSize: 16, fontFamily: "'Outfit',sans-serif" }}>−</button>
                  <span style={{ minWidth: 24, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{line.qty}</span>
                  <button type="button" onClick={() => onUpdateQty(line.id, line.qty + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: "#f0eef5", cursor: "pointer", fontSize: 16, fontFamily: "'Outfit',sans-serif" }}>+</button>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60, textAlign: "right" }}>{(parsePriceValue(line.price) * line.qty).toLocaleString("ru-RU")} ₽</span>
                <button type="button" onClick={() => onRemove(line.id)} style={{ background: "none", border: "none", color: "rgba(240,238,245,.3)", cursor: "pointer", fontSize: 18, padding: "0 4px" }}>×</button>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.4)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Ваше имя</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className="inf" style={{ width: "100%", padding: "12px 16px", fontSize: 15, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.4)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Телефон</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" className="inf" style={{ width: "100%", padding: "12px 16px", fontSize: 15, boxSizing: "border-box" }} />
          </div>
        </div>

        {/* Total + submit */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "rgba(240,238,245,.4)" }}>Итого</div>
            <div style={{ fontSize: 26, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{totalPrice.toLocaleString("ru-RU")} ₽</div>
          </div>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} style={{
            padding: "14px 32px", borderRadius: 14, border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
            background: canSubmit ? "linear-gradient(135deg,#e84393,#6c5ce7)" : "rgba(255,255,255,.06)",
            color: canSubmit ? "#fff" : "rgba(240,238,245,.3)",
            fontSize: 15, fontWeight: 600, fontFamily: "'Outfit',sans-serif",
            opacity: canSubmit ? 1 : 0.5,
            transition: "all .25s",
          }}>Отправить в Telegram</button>
        </div>
      </div>
    </div>
  );
}

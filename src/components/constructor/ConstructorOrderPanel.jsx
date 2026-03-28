export default function ConstructorOrderPanel({ currentTotal, orderMeta, canSubmitOrder, telegramLink }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 28, minWidth: 0, justifySelf: "end", width: "100%" }}>
      <div className="cs constructor-panel" style={{ padding: 22, border: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>Заказ</div>
          </div>
          <div style={{ flexShrink: 0, fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg,#f08ac0,#9c8bff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{currentTotal.toLocaleString("ru-RU")} ₽</div>
        </div>

        <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)", minWidth: 0 }}>
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            {orderMeta.map(([label, value]) => (
              <div key={label} className="constructor-order-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "4px 12px", minWidth: 0 }}>
                <span className="constructor-order-label" style={{ minWidth: 0, flex: "0 1 auto", fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase", color: "rgba(240,238,245,.36)", whiteSpace: "normal", overflowWrap: "break-word", wordBreak: "normal" }}>{label}</span>
                <span className="constructor-order-value" style={{ minWidth: 0, flex: "1 1 132px", fontSize: 14, lineHeight: 1.45, fontWeight: 500, color: "#f0eef5", textAlign: "right", overflowWrap: "break-word", wordBreak: "normal" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <a href={canSubmitOrder ? telegramLink : undefined} target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", pointerEvents: canSubmitOrder ? "auto" : "none", opacity: canSubmitOrder ? 1 : 0.45, filter: canSubmitOrder ? "none" : "grayscale(.18)", textDecoration: "none" }}>Оформить заказ</a>
        <div style={{ minWidth: 0, fontSize: 12, lineHeight: 1.6, color: "rgba(240,238,245,.42)", overflowWrap: "anywhere" }}>{canSubmitOrder ? "Заявка откроется в Telegram с текущей конфигурацией футболки и перечислением всех слоёв." : "Чтобы оформить заказ, выберите размер и добавьте хотя бы один слой: файл, текст или готовый принт."}</div>
      </div>
    </div>
  );
}

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
          <div style={{ display: "grid", gap: 0, minWidth: 0 }}>
            {orderMeta.map(([label, value], index) => {
              if (label === "---") {
                return <div key={`sep-${index}`} style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "10px 0" }} />;
              }

              if (label === "hint") {
                return (
                  <div key={`hint-${index}`} style={{ padding: "6px 0 2px", fontSize: 12, lineHeight: 1.5, fontWeight: 400, background: "linear-gradient(135deg, rgba(240,138,192,.55), rgba(156,139,255,.55))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</div>
                );
              }

              const isTotal = label === "Итого за 1 шт";

              return (
                <div key={label} className="constructor-order-row" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "4px 12px", minWidth: 0, padding: isTotal ? "10px 0 0" : "5px 0" }}>
                  <span className="constructor-order-label" style={{ minWidth: 0, flex: "1 1 0%", fontSize: isTotal ? 13 : 13, lineHeight: 1.45, color: isTotal ? "rgba(240,238,245,.52)" : "rgba(240,238,245,.55)", whiteSpace: "normal", overflowWrap: "break-word", wordBreak: "normal", fontWeight: isTotal ? 600 : 400 }}>{label}</span>
                  <span className="constructor-order-value" style={{ minWidth: 0, flexShrink: 0, fontSize: isTotal ? 16 : 14, lineHeight: 1.45, fontWeight: isTotal ? 700 : 500, color: isTotal ? "#f0eef5" : "rgba(240,238,245,.88)", textAlign: "right", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <a href={canSubmitOrder ? telegramLink : undefined} target="_blank" rel="noopener noreferrer" className="btg" style={{ width: "100%", justifyContent: "center", pointerEvents: canSubmitOrder ? "auto" : "none", opacity: canSubmitOrder ? 1 : 0.45, filter: canSubmitOrder ? "none" : "grayscale(.18)", textDecoration: "none" }}>Оформить заказ</a>
        {!canSubmitOrder && <div style={{ minWidth: 0, fontSize: 12, lineHeight: 1.6, color: "rgba(240,238,245,.42)", overflowWrap: "anywhere" }}>Чтобы оформить заказ, добавьте хотя бы один слой: файл, текст или фигуру.</div>}
      </div>
    </div>
  );
}

import CalcIcon from "./CalcIcon.jsx";

export default function PricingSection({ Reveal: _Reveal, pricingTab, setPricingTab, formatPrices, meterPrices, pricingNotes, onOpenCalculator }) {
  return (
    <section id="pricing" className="section-shell" style={{ padding: "100px 5%" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <_Reveal className="text-center mb-12"><span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#e84393", textTransform: "uppercase" }}>Стоимость</span><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Наши <span style={{ fontWeight: 600 }}>цены</span></h2></_Reveal>
        <_Reveal delay={0.1}><div className="scroll-tabs" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          <button className={`tb ${pricingTab === "format" ? "ta" : "ti"}`} onClick={() => setPricingTab("format")}>DTF печать с переносом</button>
          <button className={`tb ${pricingTab === "meter" ? "ta" : "ti"}`} onClick={() => setPricingTab("meter")}>Погонные метры</button>
        </div></_Reveal>
        {pricingTab === "format" && <_Reveal delay={0.15}>
          <div className="cg pricing-table desktop-pricing-table" style={{ padding: 8, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.1))" }}>
              <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.7)", textTransform: "uppercase" }}>Формат</th>
              <th style={{ padding: "16px 24px", textAlign: "center", fontSize: 13, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.7)", textTransform: "uppercase" }}>Цена</th>
              <th style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 500, letterSpacing: 1.5, color: "rgba(240,238,245,.7)", textTransform: "uppercase" }}>Условие</th>
            </tr></thead>
            <tbody>{formatPrices.map((price, index) => <tr key={index} style={{ borderTop: "1px solid rgba(255,255,255,.04)" }} onMouseEnter={(event) => { event.currentTarget.style.background = "rgba(232,67,147,.04)"; }} onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}>
              <td style={{ padding: "16px 24px", fontSize: 15 }}>{price.f}</td>
              <td style={{ padding: "16px 24px", textAlign: "center", fontSize: 18, fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{price.p} ₽<div className="mobile-pricing-note">{price.n ? `при заказе ${price.n}` : "без условия"}</div></td>
              <td style={{ padding: "16px 24px", textAlign: "right", fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)" }}>{price.n ? `при заказе ${price.n}` : "—"}</td>
            </tr>)}</tbody>
          </table></div>
          <div className="mobile-pricing-list">
            {formatPrices.map((price) => (
              <div key={price.f} className="mobile-pricing-row">
                <div className="mobile-pricing-meta">
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", lineHeight: 1.35 }}>{price.f}</div>
                </div>
                <div className="mobile-pricing-price">
                  <div style={{ fontSize: 19, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{price.p} ₽</div>
                  {price.n ? <div className="mobile-pricing-note">{`при заказе ${price.n}`}</div> : null}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
            {pricingNotes.map((note) => (
              <div
                key={note.text}
                style={note.highlight
                  ? { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: "rgba(232,67,147,.08)", border: "1px solid rgba(232,67,147,.18)", color: "#f0eef5", fontSize: 13, fontWeight: 500 }
                  : { display: "flex", gap: 10, fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.4)" }}
              >
                <span style={{ color: note.highlight ? "#fff" : "#e84393", fontSize: note.highlight ? 12 : 10, marginTop: 2 }}>●</span>
                <span>{note.text}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28 }}><button className="bcalc" onClick={onOpenCalculator}><CalcIcon />Рассчитать оптовый заказ</button></div>
        </_Reveal>}
        {pricingTab === "meter" && <_Reveal delay={0.15}>
          <div className="cg pricing-table desktop-pricing-table" style={{ padding: 8, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "linear-gradient(135deg,rgba(108,92,231,.15),rgba(232,67,147,.1))" }}>{meterPrices.map((meterPrice, index) => <th key={index} style={{ padding: "16px 12px", textAlign: "center", fontSize: 14, fontWeight: 500, color: "rgba(240,238,245,.7)" }}>{meterPrice.r}</th>)}</tr></thead>
            <tbody><tr style={{ borderTop: "1px solid rgba(255,255,255,.04)" }}>{meterPrices.map((meterPrice, index) => <td key={index} style={{ padding: "20px 12px", textAlign: "center", fontSize: 18, fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{meterPrice.p}</td>)}</tr></tbody>
          </table></div>
          <div className="mobile-pricing-list">
            {meterPrices.map((meterPrice) => (
              <div key={meterPrice.r} className="mobile-pricing-row">
                <div className="mobile-pricing-meta">
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#f0eef5", lineHeight: 1.35 }}>{meterPrice.r}</div>
                </div>
                <div className="mobile-pricing-price">
                  <div style={{ fontSize: 19, fontWeight: 700, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{meterPrice.p}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)", padding: "0 8px", display: "flex", gap: 10 }}><span style={{ color: "#6c5ce7", fontSize: 10 }}>●</span>Ширина — 58 см. Без переноса.</div>
          <div style={{ textAlign: "center", marginTop: 28 }}><button className="bcalc" onClick={onOpenCalculator}><CalcIcon />Рассчитать оптовый заказ</button></div>
        </_Reveal>}
      </div>
    </section>
  );
}
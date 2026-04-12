export default function HomeTshirtsSection({ Reveal: _Reveal, items, CardComponent: _CardComponent, onOpenCatalog, onOpenConstructor }) {
  return (
    <section className="section-shell" style={{ padding: "100px 5%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <_Reveal className="text-center mb-16">
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Собственное производство</span>
          <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Наши <span style={{ fontWeight: 600 }}>футболки</span></h2>
          <p style={{ color: "rgba(240,238,245,.4)", fontWeight: 300, marginTop: 10, fontSize: 15, maxWidth: 600, margin: "10px auto 0" }}>Создаём напрямую на фабрике по собственным лекалам. От кроя и посадки до выбора ткани — всё продумано до мелочей.</p>
        </_Reveal>
        <div className="main-tshirt-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", justifyContent: "center", gap: 20, maxWidth: 1060, margin: "0 auto" }}>
          {items.map((item, index) => (
            <_Reveal key={index} delay={index * 0.1}>
              <_CardComponent item={item} onOpen={onOpenCatalog} />
            </_Reveal>
          ))}
        </div>
        <_Reveal delay={0.3} className="text-center mt-10">
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="bcalc" onClick={onOpenCatalog}>
              Весь каталог текстиля →
            </button>
            <button className="bo" onClick={onOpenConstructor}>
              Открыть конструктор
            </button>
          </div>
        </_Reveal>
      </div>
    </section>
  );
}
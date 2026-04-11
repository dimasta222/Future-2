import CalcIcon from "./CalcIcon.jsx";
import LogoFullAsset from "./LogoFull.jsx";
import Stars from "./Stars.jsx";
import TG from "./TG.jsx";

export default function HeroSection({ Reveal: _Reveal, onOpenConstructor, onOpenCalculator, reviewData }) {
  return (
    <section id="hero" className="hero-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 5% 80px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(232,67,147,.12) 0%,transparent 70%)", top: -100, left: -150, animation: "float 8s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(108,92,231,.1) 0%,transparent 70%)", bottom: -50, right: -100, animation: "float 10s ease-in-out infinite 2s", pointerEvents: "none" }} />
      <_Reveal><LogoFullAsset /></_Reveal>
      <_Reveal delay={0.15}><h1 className="hero-title" style={{ fontSize: "clamp(28px,5vw,56px)", fontWeight: 200, letterSpacing: 2, marginTop: 24, lineHeight: 1.3 }}>DTF-печать <span style={{ background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 500 }}>нового поколения</span></h1></_Reveal>
      <_Reveal delay={0.3}><p className="hero-subtitle" style={{ fontSize: "clamp(15px,2vw,18px)", fontWeight: 300, color: "rgba(240,238,245,.5)", maxWidth: 820, margin: "20px auto 0", lineHeight: 1.7 }}>Собственное современное производство в Санкт-Петербурге.<br />Яркие, стойкие принты на любых тканях — от 1 штуки до крупных тиражей.</p></_Reveal>

      <_Reveal delay={0.4}><div className="hero-rating" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, background: "rgba(255,255,255,.04)", padding: "8px 20px", borderRadius: 50, border: "1px solid rgba(255,255,255,.06)" }}><Stars /><span style={{ fontSize: 14, fontWeight: 500 }}>{reviewData.rating.toFixed(1)}</span><span style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.4)" }}>• {reviewData.ratingCount} оценок</span></div></_Reveal>
      <_Reveal delay={0.5} className="flex gap-4 mt-10 flex-wrap justify-center hero-actions">
        <button className="bp hero-primary" onClick={onOpenConstructor}>Собрать свою футболку</button>
        <button className="bcalc hero-tertiary" onClick={onOpenCalculator}><CalcIcon /> Оптовый калькулятор</button>
        <a className="btg hero-support" href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer"><TG /> Задать вопрос</a>
      </_Reveal>
      <_Reveal delay={0.65} className="flex gap-12 mt-20 flex-wrap justify-center hero-stats">
        {[ ["3 000+", "Заказов"], ["от 1 шт", "Печатаем"], ["от 30мин", "Срочно"] ].map(([value, label]) => (
          <div key={label} className="hero-stat" style={{ textAlign: "center" }}>
            <div className="hero-stat-value" style={{ fontSize: "clamp(24px,3.5vw,36px)", fontWeight: 600, background: "linear-gradient(135deg,#e84393,#6c5ce7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</div>
            <div className="hero-stat-label" style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.4)", letterSpacing: 1, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </_Reveal>
    </section>
  );
}
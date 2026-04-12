import TG from "./TG.jsx";

export default function ContactSection({ Reveal: _Reveal, formData, setFormData, onSubmit }) {
  return (
    <section id="contact" className="section-shell" style={{ padding: "100px 5% 60px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <_Reveal className="text-center mb-12"><span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Свяжитесь с нами</span><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Оставить <span style={{ fontWeight: 600 }}>заявку</span></h2></_Reveal>
        <div className="contact-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 32 }}>
          <_Reveal delay={0.1}>
            <form className="cg contact-card" style={{ padding: "clamp(20px, 4vw, 36px) clamp(18px, 3vw, 32px)" }} onSubmit={onSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input className="inf" placeholder="Ваше имя" value={formData.n} onChange={(event) => setFormData({ ...formData, n: event.target.value })} required />
                <input className="inf" placeholder="Телефон" value={formData.p} onChange={(event) => setFormData({ ...formData, p: event.target.value })} required />
                <textarea className="inf" placeholder="Опишите заказ..." rows={4} style={{ resize: "vertical", minHeight: 100 }} value={formData.m} onChange={(event) => setFormData({ ...formData, m: event.target.value })} />
                <button type="submit" className="bp" style={{ width: "100%", marginTop: 4 }}>Отправить в Telegram</button>
              </div>
            </form>
          </_Reveal>
          <_Reveal delay={0.2}><div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="cg contact-card" style={{ padding: 24, overflow: "hidden" }}><div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "#e84393", textTransform: "uppercase", marginBottom: 12 }}>Адрес</div><div style={{ fontSize: 16 }}>Санкт-Петербург</div><div style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.6)" }}>пр. Авиаконструкторов, 5к2, эт. 2</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.35)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#6c5ce7" strokeWidth="10"/><path d="M22 65 C22 35, 35 25, 50 58 C65 25, 78 35, 78 65" fill="none" stroke="#6c5ce7" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/></svg>Комендантский проспект</div><div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)" }}><iframe src="https://yandex.ru/map-widget/v1/?pt=30.246977,60.011073,pm2rdm&z=16&l=map" width="100%" height="180" frameBorder="0" style={{ display: "block", filter: "invert(0.9) hue-rotate(180deg) brightness(1.1) contrast(0.9)" }} allowFullScreen /></div></div>
            <div className="cg contact-card" style={{ padding: 24 }}><div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2, color: "#e84393", textTransform: "uppercase", marginBottom: 12 }}>Телефон</div><a href="tel:+79500003464" style={{ fontSize: 20, fontWeight: 500, color: "#f0eef5", textDecoration: "none" }}>+7 (950) 000-34-64</a></div>
            <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" className="cg contact-card" style={{ padding: 24, textDecoration: "none", color: "#f0eef5", display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#0088cc,#6c5ce7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><TG /></div><div><div style={{ fontSize: 15, fontWeight: 500 }}>Telegram</div><div style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>@FUTURE_178</div></div></a>
            <a href="mailto:future178@yandex.ru" className="cg contact-card" style={{ padding: 24, textDecoration: "none", color: "#f0eef5", display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#e84393,#6c5ce7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg></div><div><div style={{ fontSize: 15, fontWeight: 500 }}>Почта</div><div style={{ fontSize: 13, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>future178@yandex.ru</div></div></a>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{["Оплата картой", "СБП", "Безнал", "Наличными"].map((item) => <span key={item} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.5)" }}>{item}</span>)}</div>
          </div></_Reveal>
        </div>
      </div>
    </section>
  );
}
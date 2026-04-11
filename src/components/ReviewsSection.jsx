import Stars from "./Stars.jsx";

export default function ReviewsSection({ Reveal: _Reveal, reviews, reviewData }) {
  return (
    <section id="reviews" className="section-shell" style={{ padding: "100px 5%" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <_Reveal className="text-center mb-16"><span style={{ fontSize: 12, fontWeight: 500, letterSpacing: 4, color: "#6c5ce7", textTransform: "uppercase" }}>Нам доверяют</span><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 200, marginTop: 12 }}>Отзывы <span style={{ fontWeight: 600 }}>клиентов</span></h2><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}><Stars /><span style={{ fontSize: 15, fontWeight: 500 }}>{reviewData.rating.toFixed(1)}</span><span style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.4)" }}>Яндекс Карты</span></div></_Reveal>
        <div className="reviews-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
          {reviews.map((review, index) => <_Reveal key={index} delay={index * 0.1}><div className="cg review-card" style={{ padding: 32, height: "100%", display: "flex", flexDirection: "column" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><div style={{ fontSize: 16, fontWeight: 500 }}>{review.name}</div><div style={{ fontSize: 12, fontWeight: 300, color: "rgba(240,238,245,.3)", marginTop: 2 }}>{review.date}</div></div><Stars /></div><p style={{ fontSize: 14, fontWeight: 300, color: "rgba(240,238,245,.55)", lineHeight: 1.7, flex: 1 }}>«{review.text}»</p></div></_Reveal>)}
        </div>
        <_Reveal delay={0.35} className="text-center mt-8"><a href="https://yandex.ru/maps/org/future_studio/220314499581/reviews/" target="_blank" rel="noopener noreferrer" style={{ color: "#e84393", fontSize: 14, textDecoration: "none", borderBottom: "1px solid rgba(232,67,147,.3)", paddingBottom: 2 }}>Все {reviewData.reviewCount} отзывов →</a></_Reveal>
      </div>
    </section>
  );
}
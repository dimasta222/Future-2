import LogoMini from "./LogoMini.jsx";
import TG from "./TG.jsx";
import MAX from "./MAX.jsx";

export default function MainNavigation({
  scrollY,
  currentPage,
  activeSection,
  mobileMenuOpen,
  setMobileMenuOpen,
  textileMenuOpen,
  setTextileMenuOpen,
  navigationItems,
  textileMenuItems,
  onNavigate,
  onNavigateTextile,
  onOpenCalculator,
  onOpenConstructor,
}) {
  return (
    <>
      <nav className="nb" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrollY ? "rgba(8,8,12,.85)" : "rgba(8,8,12,0)", boxShadow: scrollY ? "inset 0 -1px 0 rgba(255,255,255,.05)" : "inset 0 -1px 0 rgba(255,255,255,0)", transition: "background-color .35s ease, box-shadow .35s ease", padding: "0 5%", willChange: "background-color, box-shadow" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
          <div className="nav-left">
            <button type="button" onClick={() => onNavigate("Главная")} style={{ background: "none", border: "none", color: "inherit", padding: 0, font: "inherit", cursor: "pointer" }} aria-label="На главную">
              <LogoMini />
            </button>
            <button onClick={onOpenCalculator} className="nav-calc-btn nav-desktop-calc" style={{ background: "linear-gradient(135deg,#e84393,#6c5ce7)", border: "none", color: "#fff", padding: "8px 20px", borderRadius: 50, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>Оптовый калькулятор</button>
          </div>
          <div style={{ gap: 28, alignItems: "center" }} className="nav-main nav-desktop-main">
            {navigationItems.map((item) => item === "Текстиль" ? (
              <div
                key={item}
                style={{ position: "relative" }}
                onMouseEnter={() => setTextileMenuOpen(true)}
                onMouseLeave={() => setTextileMenuOpen(false)}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setTextileMenuOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={textileMenuOpen}
                  onClick={() => setTextileMenuOpen((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setTextileMenuOpen(true);
                    }
                    if (event.key === "Escape") {
                      setTextileMenuOpen(false);
                    }
                  }}
                  style={{ cursor: "pointer", fontSize: 14, fontWeight: 300, letterSpacing: 1.5, color: textileMenuOpen || currentPage.startsWith("textile_") ? "#e84393" : "rgba(240,238,245,.6)", transition: "color .3s", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, fontFamily: "inherit" }}
                >
                  {item}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform .3s", transform: textileMenuOpen ? "rotate(180deg)" : "rotate(0)" }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {textileMenuOpen && (
                  <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", paddingTop: 8, zIndex: 110 }}>
                    <div role="menu" aria-label="Разделы текстиля" style={{ background: "rgba(16,16,24,.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "8px 0", minWidth: 160, boxShadow: "0 16px 48px rgba(0,0,0,.5)" }}>
                      {textileMenuItems.map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => { setTextileMenuOpen(false); onNavigateTextile(key); }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 20px", fontSize: 14, fontWeight: 300, color: currentPage === "textile_" + key ? "#e84393" : "rgba(240,238,245,.6)", cursor: "pointer", transition: "all .2s", letterSpacing: 0.5, background: "none", border: "none", fontFamily: "inherit" }}
                          onMouseEnter={(event) => { event.currentTarget.style.color = "#e84393"; event.currentTarget.style.background = "rgba(232,67,147,.06)"; }}
                          onMouseLeave={(event) => { event.currentTarget.style.color = currentPage === "textile_" + key ? "#e84393" : "rgba(240,238,245,.6)"; event.currentTarget.style.background = "transparent"; }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" key={item} onClick={() => onNavigate(item)} style={{ cursor: "pointer", fontSize: 14, fontWeight: 300, letterSpacing: 1.5, color: activeSection === item ? "#e84393" : "rgba(240,238,245,.6)", transition: "color .3s", textTransform: "uppercase", background: "none", border: "none", padding: 0, fontFamily: "inherit" }} onMouseEnter={(event) => { event.currentTarget.style.color = "#e84393"; }} onMouseLeave={(event) => { if (activeSection !== item) event.currentTarget.style.color = "rgba(240,238,245,.6)"; }}>{item}</button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="nav-contacts">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }} className="nav-contacts-stack">
                <a href="tel:+79500003464" style={{ color: "#f0eef5", textDecoration: "none", fontSize: 14, fontWeight: 500, letterSpacing: 0.4, whiteSpace: "nowrap", transition: "color .3s" }} onMouseEnter={(event) => { event.currentTarget.style.color = "#e84393"; }} onMouseLeave={(event) => { event.currentTarget.style.color = "#f0eef5"; }}>+7 (950) 000-34-64</a>
                <a href="mailto:future178@yandex.ru" style={{ color: "rgba(240,238,245,.58)", textDecoration: "none", fontSize: 12, fontWeight: 300, letterSpacing: 0.3, whiteSpace: "nowrap", transition: "color .3s" }} onMouseEnter={(event) => { event.currentTarget.style.color = "#e84393"; }} onMouseLeave={(event) => { event.currentTarget.style.color = "rgba(240,238,245,.58)"; }}>future178@yandex.ru</a>
              </div>
              <div className="nav-socials">
                <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="nav-social-btn" style={{ width: 44, height: 44, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "linear-gradient(135deg,#0088cc,#6c5ce7)", boxShadow: "0 8px 24px rgba(0,136,204,.2)" }}>
                  <TG />
                </a>
                <a href="https://max.ru/u/f9LHodD0cOL0pTqxSNqIn22flD78BhADnB7BLdrGb3yZbXHeBKclVTh-b2I" target="_blank" rel="noopener noreferrer" aria-label="MAX" className="nav-social-btn" style={{ width: 44, height: 44, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "transparent", boxShadow: "none", overflow: "hidden" }}>
                  <MAX />
                </a>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-nav-trigger" aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-nav-head">
              <div>
                <div className="mobile-nav-eyebrow">Навигация</div>
              </div>
              <button type="button" className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)} aria-label="Закрыть меню">×</button>
            </div>

            <div className="mobile-nav-group">
              <div className="mobile-nav-section-title">Основное</div>
              {navigationItems.filter((item) => item !== "Текстиль").map((item) => {
                const isActive = activeSection === item || (item === "Главная" && currentPage === "main") || (item === "Портфолио" && currentPage === "portfolio");
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => onNavigate(item)}
                    className={`mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}
                  >
                    <span>{item}</span>
                    <span style={{ color: isActive ? "#fff" : "rgba(240,238,245,.32)" }}>+</span>
                  </button>
                );
              })}
            </div>

            <div className="mobile-nav-group">
              <div className="mobile-nav-section-title">Текстиль</div>
              <div className="mobile-nav-submenu">
                {textileMenuItems.map(([key, label]) => {
                  const isActive = currentPage === `textile_${key}`;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => onNavigateTextile(key)}
                      className={`mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}
                    >
                      <span>{label}</span>
                      <span style={{ color: isActive ? "#fff" : "rgba(240,238,245,.32)" }}>+</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mobile-nav-actions">
              <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenConstructor(); }} className="bo mobile-nav-action">Конструктор футболок</button>
              <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenCalculator(); }} className="bp mobile-nav-action">Оптовый калькулятор</button>
            </div>

            <div className="mobile-nav-meta">
              <a href="tel:+79500003464" style={{ fontSize: 18, fontWeight: 500, letterSpacing: 0.6, color: "#f0eef5" }}>+7 (950) 000-34-64</a>
              <a href="mailto:future178@yandex.ru" style={{ fontSize: 14, fontWeight: 300, letterSpacing: 0.4, color: "rgba(240,238,245,.6)" }}>future178@yandex.ru</a>
              <div className="mobile-nav-socials">
                <a href="https://t.me/FUTURE_178" target="_blank" rel="noopener noreferrer" aria-label="Telegram" style={{ background: "linear-gradient(135deg,#0088cc,#6c5ce7)" }}>
                  <TG />
                </a>
                <a href="https://max.ru/u/f9LHodD0cOL0pTqxSNqIn22flD78BhADnB7BLdrGb3yZbXHeBKclVTh-b2I" target="_blank" rel="noopener noreferrer" aria-label="MAX" style={{ background: "transparent", overflow: "hidden" }}>
                  <MAX />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
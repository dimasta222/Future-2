function ConstructorTabIcon({ tabKey, active }) {
  const stroke = active ? "#ffffff" : "rgba(240,238,245,.72)";
  const accent = active ? "rgba(255,255,255,.22)" : "rgba(240,238,245,.12)";

  if (tabKey === "textile") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 5.5 10.4 3h3.2L16 5.5l3.4-1.5 1.8 4.3-3.2 2V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9.5l-3.2-2L4.6 4 8 5.5Z" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9.2 6.5c.8.6 1.7.9 2.8.9s2-.3 2.8-.9" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (tabKey === "upload") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 16V7" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="m8.5 10.5 3.5-3.5 3.5 3.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 18.5h14" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke={accent} strokeWidth="1.4" />
      </svg>
    );
  }

  if (tabKey === "text") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6.5h14" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 6.5v11" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 17.5h7" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (tabKey === "shapes") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8L6.7 19.5l1-6L3.4 9.3l6-.9L12 3Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1.4" fill={accent} />
      </svg>
    );
  }

  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" stroke={stroke} strokeWidth="1.7" />
      <circle cx="9" cy="9" r="1.2" fill={accent} />
      <path d="m7.5 15.5 3-3 2.5 2 3.5-4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ConstructorTabsNav({ tabs, activeTab, onTabChange }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1.4, color: "rgba(240,238,245,.35)", textTransform: "uppercase", marginBottom: 8 }}>Инструменты</div>
      <div className="constructor-tabs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button className="constructor-tabs-button" key={tab.key} type="button" onClick={() => onTabChange(tab.key)} style={{ width: "100%", minHeight: 40, minWidth: 0, borderRadius: 12, border: active ? "1px solid rgba(232,67,147,.28)" : "1px solid rgba(255,255,255,.06)", background: active ? "linear-gradient(135deg,rgba(232,67,147,.18),rgba(108,92,231,.18))" : "rgba(255,255,255,.03)", color: "#f0eef5", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "6px 4px", fontFamily: "inherit", transition: "transform .22s ease,border-color .22s ease,background .22s ease", boxShadow: active ? "0 10px 18px rgba(108,92,231,.12)" : "none", textAlign: "center", overflow: "hidden" }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", background: active ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.04)", border: active ? "1px solid rgba(255,255,255,.12)" : "1px solid rgba(255,255,255,.06)" }}><ConstructorTabIcon tabKey={tab.key} active={active} /></span>
              <span className="constructor-tabs-label" style={{ flex: 0, minWidth: 0, fontSize: 10.5, lineHeight: 1.05, fontWeight: active ? 600 : 500, textAlign: "center", maxWidth: "100%", whiteSpace: "normal", overflowWrap: "break-word", wordBreak: "normal" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

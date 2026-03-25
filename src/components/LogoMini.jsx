export default function LogoMini() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, position: "relative" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#d4a0c0,#8a3a6a)", position: "absolute", top: 4, left: 0 }} />
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#e84393,#c0247a)", position: "absolute", top: 2, left: 9 }} />
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#3d2e7c)", position: "absolute", top: 6, left: 20 }} />
      </div>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3 }}>FUTURE</span>
    </div>
  );
}
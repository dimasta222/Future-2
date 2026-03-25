export default function TshirtSizeGuideTable({ title, rows }) {
  return (
    <div className="cs" style={{ padding: 18, border: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 14 }}>{title}</div>
      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
        <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12))" }}>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.75)", textTransform: "uppercase", letterSpacing: 1.2 }}>Размер</th>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.75)", textTransform: "uppercase", letterSpacing: 1.2 }}>Ширина груди</th>
              <th style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "rgba(240,238,245,.75)", textTransform: "uppercase", letterSpacing: 1.2 }}>Длина изделия от плечевого шва</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.size}`} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>{row.size}</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "rgba(240,238,245,.72)" }}>{row.chest} см</td>
                <td style={{ padding: "14px 16px", fontSize: 14, color: "rgba(240,238,245,.72)" }}>{row.length} см</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
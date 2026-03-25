const FIELD_LABEL_STYLE = {
  width: 92,
  minWidth: 92,
  fontSize: 12,
  fontWeight: 400,
  color: "rgba(240,238,245,.35)",
  textTransform: "uppercase",
  letterSpacing: 1,
};

const FIELD_BOX_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 14px",
  background: "rgba(255,255,255,.02)",
  borderRadius: 10,
  minHeight: 56,
};

export default function FieldRow({ label, children, minHeight = 56 }) {
  return (
    <div className="field-row" style={{ ...FIELD_BOX_STYLE, minHeight }}>
      <span className="field-row-label" style={FIELD_LABEL_STYLE}>{label}</span>
      <div className="field-row-content" style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
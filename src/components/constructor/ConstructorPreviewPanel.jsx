export default function ConstructorPreviewPanel({
  side,
  onSideChange,
  previewSrc,
  productName,
  color,
  printAreaRef,
  printArea,
  selectedPreset,
  presetScale,
  uploadDesign,
  handleUploadPointerDown,
  uploadPosition,
  uploadScale,
  isDraggingUpload,
  overlayText,
  textSize,
  textWeight,
  textColor,
}) {
  return (
    <div className="constructor-preview" style={{ position: "sticky", top: 28, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", gap: 8, padding: 6, borderRadius: 999, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
          {[["front", "Спереди"], ["back", "Спина"]].map(([key, label]) => <button key={label} type="button" onClick={() => onSideChange(key)} className={`tb ${side === key ? "ta" : "ti"}`} style={{ padding: "10px 20px", minWidth: 128 }}>{label}</button>)}
        </div>
      </div>

      <div style={{ position: "relative", minHeight: 640 }}>
        <img src={previewSrc} alt={`${productName} — ${color}`} draggable={false} style={{ width: "100%", display: "block", aspectRatio: "1 / 1.08", objectFit: "cover", userSelect: "none", WebkitUserDrag: "none" }} />
        <div ref={printAreaRef} style={{ position: "absolute", left: `${printArea.left}%`, top: `${printArea.top}%`, width: `${printArea.width}%`, height: `${printArea.height}%`, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {selectedPreset ? <img src={selectedPreset.src} alt={selectedPreset.label} draggable={false} style={{ position: "absolute", width: `${presetScale}%`, maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.25))" }} /> : null}
          {uploadDesign ? <div role="presentation" onPointerDown={handleUploadPointerDown} style={{ position: "absolute", left: `${uploadPosition.x}%`, top: `${uploadPosition.y}%`, transform: "translate(-50%, -50%)", width: `${uploadScale}%`, maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto", cursor: isDraggingUpload ? "grabbing" : "grab", touchAction: "none" }}><img src={uploadDesign.src} alt={uploadDesign.name} draggable={false} style={{ width: "100%", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", filter: "drop-shadow(0 12px 24px rgba(0,0,0,.24))", userSelect: "none", WebkitUserDrag: "none" }} /></div> : null}
          {overlayText ? <div style={{ position: "absolute", bottom: "8%", maxWidth: "100%", padding: "0 6%", textAlign: "center", fontSize: `${textSize}px`, lineHeight: 1.05, fontWeight: textWeight, color: textColor, letterSpacing: 1, textShadow: color === "Белый" ? "0 2px 14px rgba(0,0,0,.16)" : "0 2px 14px rgba(0,0,0,.32)" }}>{overlayText}</div> : null}
        </div>
      </div>
    </div>
  );
}
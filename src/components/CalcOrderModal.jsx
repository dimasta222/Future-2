import { useEffect, useMemo, useRef, useState } from "react";
import { generateCalcOrderPdf, buildCalcOrderData, buildOrderMessage } from "../utils/calcOrderPdf.js";

const TELEGRAM_URL = "https://t.me/FUTURE_178";
const EMAIL = "future178@yandex.ru";
const MAX_URL = "https://max.ru/u/f9LHodD0cOL0pTqxSNqIn22flD78BhADnB7BLdrGb3yZbXHeBKclVTh-b2I";

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function getExtension(name) {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

export default function CalcOrderModal({ open, onClose, items, mode, totalQty, lengthCm, metersRound, costLines, total, onAddFiles, onResetCalc }) {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const orderData = useMemo(() => {
    if (!open) return null;
    return buildCalcOrderData({ items, mode, totalQty, lengthCm, metersRound, costLines, total });
  }, [open, items, mode, totalQty, lengthCm, metersRound, costLines, total]);

  const message = useMemo(() => (orderData ? buildOrderMessage(orderData) : ""), [orderData]);
  const hasFiles = items.some((it) => it.originalFile);
  const allHaveFiles = items.length > 0 && items.every((it) => it.originalFile);

  useEffect(() => {
    if (!open || !orderData) return undefined;
    let cancelled = false;
    setBuilding(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null);
    setPdfBlob(null);
    generateCalcOrderPdf(orderData)
      .then((blob) => { if (!cancelled) setPdfBlob(blob); })
      .catch((err) => {
        console.error("[CalcOrderModal] PDF build failed:", err);
        if (!cancelled) setError("Не удалось сформировать PDF");
      })
      .finally(() => { if (!cancelled) setBuilding(false); });
    return () => { cancelled = true; };
  }, [open, orderData]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const downloadPdf = () => {
    if (!pdfBlob) return;
    downloadBlob(pdfBlob, `future-studio-order-${Date.now()}.pdf`);
  };

  const downloadAllAssets = () => {
    if (!pdfBlob) return;
    downloadPdf();
    items.forEach((it, i) => {
      if (!it.originalFile) return;
      const ext = getExtension(it.originalFile.name);
      const name = `Принт ${i + 1} (${it.qty} шт)${ext}`;
      setTimeout(() => downloadBlob(it.originalFile, name), 250 * (i + 1));
    });
  };

  const telegramHref = `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
  const emailHref = `mailto:${EMAIL}?subject=${encodeURIComponent("Заказ DTF-печати")}&body=${encodeURIComponent(message)}`;

  const channelButtons = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
      <a href={telegramHref} target="_blank" rel="noopener noreferrer" style={btnStyle("#0088cc")}>Telegram</a>
      <a href={emailHref} style={btnStyle("#e84393")}>Email</a>
      <a href={MAX_URL} target="_blank" rel="noopener noreferrer" style={btnStyle("#ff8a00")}>MAX</a>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(4px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Outfit',sans-serif"
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto",
        background: "#0f0f15", borderRadius: 18, border: "1px solid rgba(232,67,147,.18)",
        padding: "28px 26px 24px", color: "#f0eef5", boxShadow: "0 20px 60px rgba(0,0,0,.6)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Оформление заказа</h2>
          <button onClick={onClose} aria-label="Закрыть" style={{
            background: "transparent", border: "none", color: "#f0eef5", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1
          }}>×</button>
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,80,80,.1)", color: "#ff8a8a", fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(240,238,245,.4)", marginBottom: 8 }}>Сводка заказа</div>
            <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <Row label="Принтов" value={`${totalQty} шт`} />
              <Row label="Метраж" value={`${metersRound.toFixed(2)} м`} />
              <Row label="Итого" value={`${total.toLocaleString("ru-RU")} ₽`} bold />
            </div>
          </section>

          {hasFiles ? (
            <>
              <section>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(240,238,245,.4)", marginBottom: 8 }}>Файлы</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((it, i) => (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,.03)", borderRadius: 10, fontSize: 13 }}>
                      {it.thumb && <img src={it.thumb} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>Принт {i + 1} ({it.qty} шт)</div>
                        <div style={{ fontSize: 11, color: "rgba(240,238,245,.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.w}×{it.h} см {it.originalFile ? `· ${it.originalFile.name}` : "· файл не приложен"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {!allHaveFiles && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#ffb86b" }}>
                    Не для всех принтов приложены файлы. Можно дозагрузить ниже.
                  </div>
                )}
              </section>

              <button onClick={downloadAllAssets} disabled={building || !pdfBlob} style={{
                ...btnStyle("linear-gradient(135deg,#e84393,#6c5ce7)"),
                width: "100%", border: "none", cursor: building || !pdfBlob ? "wait" : "pointer", opacity: building || !pdfBlob ? 0.6 : 1
              }}>{building ? "Готовим PDF…" : "Скачать PDF и все файлы"}</button>

              <div>
                <div style={{ fontSize: 12, color: "rgba(240,238,245,.55)", marginBottom: 10, lineHeight: 1.5 }}>
                  Затем отправьте всё одним сообщением — текст уже подставится автоматически:
                </div>
                {channelButtons}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: 14, borderRadius: 12, background: "rgba(108,92,231,.08)", border: "1px solid rgba(108,92,231,.25)", fontSize: 13, color: "rgba(240,238,245,.8)", lineHeight: 1.5 }}>
                Файлы для печати ещё не загружены. Добавьте их здесь, либо отправьте напрямую через мессенджер/почту.
              </div>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.tiff,.tif"
                style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.length && onAddFiles) { onAddFiles(e.target.files); } e.target.value = ""; }}
              />
              <button onClick={() => inputRef.current?.click()} style={{
                ...btnStyle("linear-gradient(135deg,#e84393,#6c5ce7)"),
                width: "100%", border: "none", cursor: "pointer"
              }}>Загрузить файлы здесь</button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(240,238,245,.35)", fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
                или отправьте напрямую
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
              </div>

              <button onClick={downloadPdf} disabled={building || !pdfBlob} style={{
                width: "100%", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,.06)",
                color: "#f0eef5", border: "1px solid rgba(255,255,255,.12)", fontSize: 14, fontWeight: 500,
                cursor: building || !pdfBlob ? "wait" : "pointer", opacity: building || !pdfBlob ? 0.6 : 1, fontFamily: "inherit"
              }}>{building ? "Готовим PDF…" : "Скачать PDF со сводкой"}</button>

              {channelButtons}
            </>
          )}

          {onResetCalc && (
            <button onClick={() => { onResetCalc(); onClose(); }} style={{
              background: "transparent", border: "none", color: "rgba(240,238,245,.4)", fontSize: 12, cursor: "pointer", marginTop: 4, padding: 6, fontFamily: "inherit"
            }}>Очистить калькулятор</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "rgba(240,238,245,.55)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: bold ? "#f0eef5" : "#f0eef5" }}>{value}</span>
    </div>
  );
}

function btnStyle(bg) {
  return {
    display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8,
    padding: "12px 18px", borderRadius: 12, background: bg, color: "#fff", fontWeight: 600,
    fontSize: 14, textDecoration: "none", fontFamily: "'Outfit',sans-serif",
  };
}

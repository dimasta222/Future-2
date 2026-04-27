import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { generateCalcOrderPdf, buildCalcOrderData, buildOrderMessage } from "../utils/calcOrderPdf.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { reachGoal } from "../utils/metrika.js";

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

export default function CalcOrderModal({ open, onClose, items, mode, totalQty, lengthCm, metersRound, costLines, total, onGoToPrintFile, onResetCalc }) {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [building, setBuilding] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState(null);

  const orderData = useMemo(() => {
    if (!open) return null;
    const orderNumber = generateOrderNumber("calculator");
    return buildCalcOrderData({ items, mode, totalQty, lengthCm, metersRound, costLines, total, orderNumber });
  }, [open, items, mode, totalQty, lengthCm, metersRound, costLines, total]);

  const message = useMemo(() => (orderData ? buildOrderMessage(orderData) : ""), [orderData]);
  const itemsWithoutFiles = items
    .map((it, i) => ({ id: it.id, num: i + 1, has: !!it.originalFile }))
    .filter((x) => !x.has);
  const hasFiles = items.some((it) => it.originalFile);
  const allHaveFiles = items.length > 0 && items.every((it) => it.originalFile);
  const firstEmptyId = itemsWithoutFiles[0]?.id ?? null;

  useEffect(() => {
    if (!open || !orderData) return undefined;
    let cancelled = false;
    setBuilding(true);
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
    reachGoal("calc_download_pdf");
    const fileName = orderData?.orderNumber ? `Заказ ${orderData.orderNumber}.pdf` : `future-studio-order-${Date.now()}.pdf`;
    downloadBlob(pdfBlob, fileName);
  };

  const downloadAllAssets = async () => {
    if (!pdfBlob || zipping) return;
    reachGoal("calc_download_zip");
    setZipping(true);
    try {
      const zip = new JSZip();
      const pdfName = orderData?.orderNumber ? `Заказ ${orderData.orderNumber}.pdf` : "Заказ FUTURE.pdf";
      zip.file(pdfName, pdfBlob);
      const used = new Set([pdfName]);
      items.forEach((it, i) => {
        if (!it.originalFile) return;
        const ext = getExtension(it.originalFile.name);
        let name = `Принт ${i + 1} (${it.qty} шт)${ext}`;
        let n = 2;
        while (used.has(name)) {
          name = `Принт ${i + 1} (${it.qty} шт) #${n}${ext}`;
          n += 1;
        }
        used.add(name);
        zip.file(name, it.originalFile);
      });
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const zipName = orderData?.orderNumber ? `Заказ ${orderData.orderNumber}.zip` : `future-studio-order-${Date.now()}.zip`;
      downloadBlob(blob, zipName);
    } catch (err) {
      console.error("[CalcOrderModal] ZIP build failed:", err);
      setError("Не удалось собрать ZIP-архив");
    } finally {
      setZipping(false);
    }
  };

  const telegramHref = `${TELEGRAM_URL}?text=${encodeURIComponent(message)}`;
  const emailHref = `mailto:${EMAIL}?subject=${encodeURIComponent("Заказ DTF-печати")}&body=${encodeURIComponent(message)}`;

  const channelButtons = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
      <a href={telegramHref} target="_blank" rel="noopener noreferrer" onClick={() => reachGoal("calc_send_telegram")} style={btnStyle("#0088cc")}>Telegram</a>
      <a href={emailHref} onClick={() => reachGoal("calc_send_email")} style={btnStyle("#e84393")}>Email</a>
      <a href={MAX_URL} target="_blank" rel="noopener noreferrer" onClick={() => reachGoal("calc_send_max")} style={btnStyle("#ff8a00")}>MAX</a>
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

          {hasFiles && (
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
            </section>
          )}

          {/* Status: all files attached */}
          {allHaveFiles && (
            <div style={{ padding: 12, borderRadius: 12, background: "rgba(38,194,129,.08)", border: "1px solid rgba(38,194,129,.25)", fontSize: 13, color: "rgba(240,238,245,.85)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <span>Все файлы прикреплены — можно отправлять заказ.</span>
            </div>
          )}

          {/* Status: partially attached */}
          {hasFiles && !allHaveFiles && onGoToPrintFile && firstEmptyId !== null && (
            <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,184,107,.08)", border: "1px solid rgba(255,184,107,.3)", fontSize: 13, color: "rgba(240,238,245,.85)", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                Без файла: {itemsWithoutFiles.map((x) => `Принт #${x.num}`).join(", ")}.
                Прикрепите файлы к нужным принтам — или отправьте только сводку без файлов.
              </div>
              <button
                type="button"
                onClick={() => onGoToPrintFile(firstEmptyId)}
                style={{ ...btnStyle("rgba(255,184,107,.18)"), color: "#ffb86b", border: "1px solid rgba(255,184,107,.45)", cursor: "pointer", padding: "10px 14px", fontSize: 13 }}
              >
                Перейти к принтам
              </button>
            </div>
          )}

          {/* Status: no files at all */}
          {!hasFiles && (
            <div style={{ padding: 14, borderRadius: 12, background: "rgba(108,92,231,.08)", border: "1px solid rgba(108,92,231,.25)", fontSize: 13, color: "rgba(240,238,245,.85)", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                Файлы для печати ещё не прикреплены. Прикрепите их к нужным принтам на странице калькулятора — или отправьте только сводку через Telegram, почту или MAX и пришлите файлы отдельным сообщением.
              </div>
              {onGoToPrintFile && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => onGoToPrintFile(items[0].id)}
                  style={{ ...btnStyle("linear-gradient(135deg,#e84393,#6c5ce7)"), border: "none", cursor: "pointer", padding: "11px 16px", fontSize: 13 }}
                >
                  Прикрепить файлы к принтам
                </button>
              )}
            </div>
          )}

          {/* Primary action when there's at least one file: bundle download */}
          {hasFiles && (
            <button onClick={downloadAllAssets} disabled={building || zipping || !pdfBlob} style={{
              ...btnStyle("linear-gradient(135deg,#e84393,#6c5ce7)"),
              width: "100%", border: "none", cursor: building || zipping || !pdfBlob ? "wait" : "pointer", opacity: building || zipping || !pdfBlob ? 0.6 : 1
            }}>{building ? "Готовим PDF…" : zipping ? "Упаковываем ZIP…" : "Скачать ZIP (PDF + файлы)"}</button>
          )}

          {/* Always-available: download summary PDF only */}
          <button onClick={downloadPdf} disabled={building || !pdfBlob} style={{
            width: "100%", padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,.06)",
            color: "#f0eef5", border: "1px solid rgba(255,255,255,.12)", fontSize: 14, fontWeight: 500,
            cursor: building || !pdfBlob ? "wait" : "pointer", opacity: building || !pdfBlob ? 0.6 : 1, fontFamily: "inherit"
          }}>{building ? "Готовим PDF…" : "Скачать PDF со сводкой"}</button>

          <div>
            <div style={{ fontSize: 12, color: "rgba(240,238,245,.55)", marginBottom: 10, lineHeight: 1.5 }}>
              Отправьте сводку напрямую — текст уже подставится автоматически:
            </div>
            {channelButtons}
          </div>

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

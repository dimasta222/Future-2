import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { LOGO_FULL_SRC } from "../components/logoFullSrc";

// A4 portrait at 96 DPI baseline.
const PAGE_W_PX = 794;   // 210 mm @ 96dpi
const PAGE_H_PX = 1123;  // 297 mm @ 96dpi

function fmtRub(n) {
  return `${Number(n).toLocaleString("ru-RU")} ₽`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function buildHtml(data) {
  const created = new Date(data.createdAt);
  const dateStr = created.toLocaleString("ru-RU");
  const modeLabel = data.mode === "withApply" ? "Печать + нанесение" : "Только печать";

  const itemsHtml = data.items.map((it, i) => `
    <div class="fs-item">
      <div class="fs-item-num">${i + 1}</div>
      <div class="fs-item-info">
        <div class="fs-item-title">Принт ${i + 1}</div>
        <div class="fs-item-sub">${it.w}×${it.h} см · ${it.qty} шт${it.fileName ? ` · ${escapeHtml(it.fileName)}` : ""}</div>
      </div>
      <div class="fs-item-qty">${it.qty}<span>шт</span></div>
    </div>
  `).join("");

  const costHtml = data.costLines.map((l) => `
    <div class="fs-cost-row">
      <div>
        <div class="fs-cost-label">${escapeHtml(l.label)}</div>
        ${l.sub ? `<div class="fs-cost-sub">${escapeHtml(l.sub)}</div>` : ""}
      </div>
      <div class="fs-cost-amount">${fmtRub(l.amount)}</div>
    </div>
  `).join("");

  return `
    <div class="fs-pdf-root">
      <style>
        .fs-pdf-root {
          width: ${PAGE_W_PX}px;
          min-height: ${PAGE_H_PX}px;
          padding: 56px 56px 48px;
          box-sizing: border-box;
          background: radial-gradient(circle at 0% 0%, rgba(232,67,147,.18), transparent 45%),
                      radial-gradient(circle at 100% 100%, rgba(108,92,231,.18), transparent 50%),
                      #08080c;
          color: #f0eef5;
          font-family: 'Outfit', 'Helvetica', sans-serif;
          font-weight: 300;
          letter-spacing: 0.2px;
          position: relative;
        }
        .fs-pdf-root * { box-sizing: border-box; }

        .fs-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 22px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .fs-brand { display: flex; align-items: center; }
        .fs-logo-img { height: 110px; width: auto; display: block; image-rendering: -webkit-optimize-contrast; }
        .fs-meta { text-align: right; font-size: 12px; color: rgba(240,238,245,.55); line-height: 1.6; }
        .fs-meta b { color: #f0eef5; font-weight: 500; }

        .fs-title { margin: 30px 0 20px; font-size: 22px; font-weight: 200; }
        .fs-title b { font-weight: 600; color: #e84393; }

        .fs-section { margin-top: 22px; }
        .fs-section-label { font-size: 10px; font-weight: 500; letter-spacing: 2.5px; color: rgba(240,238,245,.4); text-transform: uppercase; margin-bottom: 12px; }

        .fs-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .fs-summary-card { padding: 16px 18px; border-radius: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); }
        .fs-summary-key { font-size: 11px; color: rgba(240,238,245,.5); font-weight: 300; letter-spacing: .5px; }
        .fs-summary-val { font-size: 22px; font-weight: 600; margin-top: 6px; color: #f0eef5; }

        .fs-items { display: flex; flex-direction: column; gap: 8px; }
        .fs-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05); border-radius: 12px; }
        .fs-item-num { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg,#e84393,#6c5ce7); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #fff; flex-shrink: 0; }
        .fs-item-info { flex: 1; min-width: 0; }
        .fs-item-title { font-size: 14px; font-weight: 500; }
        .fs-item-sub { font-size: 11px; color: rgba(240,238,245,.45); margin-top: 3px; }
        .fs-item-qty { font-size: 18px; font-weight: 600; color: #e84393; display: flex; align-items: baseline; gap: 4px; }
        .fs-item-qty span { font-size: 10px; color: rgba(232,67,147,.6); font-weight: 400; }

        .fs-cost-list { display: flex; flex-direction: column; gap: 10px; padding: 18px 20px; background: rgba(255,255,255,.03); border-radius: 14px; border: 1px solid rgba(255,255,255,.06); }
        .fs-cost-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .fs-cost-label { font-size: 13px; font-weight: 400; color: #f0eef5; }
        .fs-cost-sub { font-size: 10px; color: rgba(240,238,245,.4); margin-top: 2px; }
        .fs-cost-amount { font-size: 15px; font-weight: 600; color: #f0eef5; white-space: nowrap; }

        .fs-total { margin-top: 22px; padding: 22px 26px; border-radius: 18px; background: linear-gradient(135deg, rgba(232,67,147,.12), rgba(108,92,231,.12)); border: 1px solid rgba(232,67,147,.25); display: flex; justify-content: space-between; align-items: center; }
        .fs-total-label { font-size: 14px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(240,238,245,.7); }
        .fs-total-value { font-size: 36px; font-weight: 700; color: #e84393; }

        .fs-footer { margin-top: 32px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; font-size: 11px; color: rgba(240,238,245,.4); }
        .fs-footer b { color: rgba(240,238,245,.7); font-weight: 500; }
      </style>

      <div class="fs-header">
        <div class="fs-brand">
          <img class="fs-logo-img" src="${LOGO_FULL_SRC}" alt="Future Studio" />
        </div>
        <div class="fs-meta">
          <div>${dateStr}</div>
          <div><b>${modeLabel}</b></div>
        </div>
      </div>

      <div class="fs-title">Расчёт <b>DTF-печати</b></div>

      <div class="fs-section">
        <div class="fs-section-label">Сводка</div>
        <div class="fs-summary-grid">
          <div class="fs-summary-card"><div class="fs-summary-key">Всего принтов</div><div class="fs-summary-val">${data.totalQty} шт</div></div>
          <div class="fs-summary-card"><div class="fs-summary-key">Длина печати</div><div class="fs-summary-val">${data.lengthCm.toFixed(1)} см</div></div>
          <div class="fs-summary-card"><div class="fs-summary-key">Погонных метров</div><div class="fs-summary-val">${data.metersRound.toFixed(2)} м</div></div>
        </div>
      </div>

      <div class="fs-section">
        <div class="fs-section-label">Состав заказа</div>
        <div class="fs-items">${itemsHtml}</div>
      </div>

      <div class="fs-section">
        <div class="fs-section-label">Стоимость</div>
        <div class="fs-cost-list">${costHtml}</div>
      </div>

      <div class="fs-total">
        <div class="fs-total-label">Итого</div>
        <div class="fs-total-value">${fmtRub(data.total)}</div>
      </div>

      <div class="fs-footer">
        <div><b>future-studio.ru</b> · СПб · DTF-печать</div>
        <div>future178@yandex.ru · t.me/FUTURE_178</div>
      </div>
    </div>
  `;
}

export async function generateCalcOrderPdf(data) {
  // Mount off-screen container so html2canvas can render full styling.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.innerHTML = buildHtml(data);
  document.body.appendChild(host);

  await new Promise((r) => requestAnimationFrame(() => r()));
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }

  try {
    const target = host.firstElementChild;
    const canvas = await html2canvas(target, {
      backgroundColor: "#08080c",
      scale: 3,
      useCORS: true,
      logging: false,
      windowWidth: PAGE_W_PX,
    });

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWmm = 210;
    const pageHmm = 297;
    const imgRatio = canvas.height / canvas.width;
    const totalImgHmm = pageWmm * imgRatio;

    if (totalImgHmm <= pageHmm + 1) {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      doc.addImage(dataUrl, "JPEG", 0, 0, pageWmm, totalImgHmm);
    } else {
      const pageSliceHpx = Math.floor((pageHmm / pageWmm) * canvas.width);
      let offsetPx = 0;
      let pageIdx = 0;
      while (offsetPx < canvas.height) {
        const sliceH = Math.min(pageSliceHpx, canvas.height - offsetPx);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext("2d");
        ctx.fillStyle = "#08080c";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, offsetPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const dataUrl = slice.toDataURL("image/jpeg", 0.95);
        const sliceHmm = (sliceH / canvas.width) * pageWmm;
        if (pageIdx > 0) doc.addPage();
        doc.addImage(dataUrl, "JPEG", 0, 0, pageWmm, sliceHmm);
        offsetPx += sliceH;
        pageIdx++;
      }
    }

    return doc.output("blob");
  } finally {
    host.remove();
  }
}

export function buildCalcOrderData({ items, mode, totalQty, lengthCm, metersRound, costLines, total }) {
  return {
    createdAt: new Date().toISOString(),
    mode,
    totalQty,
    lengthCm,
    metersRound,
    items: items.map((it) => ({ w: it.w, h: it.h, qty: it.qty, fileName: it.fileName || null })),
    costLines,
    total,
  };
}

export function buildOrderMessage(data) {
  const lines = [
    "Здравствуйте! Оформляю заказ DTF-печати.",
    "",
    `Режим: ${data.mode === "withApply" ? "Печать + нанесение" : "Только печать"}`,
    `Принтов: ${data.totalQty} шт`,
    `Метраж: ${data.metersRound.toFixed(2)} м (раскладка ${data.lengthCm.toFixed(1)} см)`,
    "",
    "Состав:",
    ...data.items.map((it, i) => `  • Принт ${i + 1}: ${it.w}×${it.h} см × ${it.qty} шт${it.fileName ? ` — ${it.fileName}` : " — файл не приложен"}`),
    "",
    ...data.costLines.map((l) => `${l.label}: ${l.amount.toLocaleString("ru-RU")} ₽${l.sub ? ` (${l.sub})` : ""}`),
    "",
    `ИТОГО: ${data.total.toLocaleString("ru-RU")} ₽`,
    "",
    "Файлы прикладываю отдельно.",
  ];
  return lines.join("\n");
}

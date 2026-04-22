import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { LOGO_FULL_SRC } from "../components/logoFullSrc";

// A4 portrait at 96 DPI baseline.
const PAGE_W_PX = 794;   // 210 mm @ 96dpi
const PAGE_H_PX = 1123;  // 297 mm @ 96dpi

// Outer paddings of the page frame.
const PAD_X = 56;
const PAD_TOP = 40;
const PAD_BOTTOM = 36;

// Reserved space for header and footer rows (rendered on every page).
const HEADER_H = 132;   // logo (110) + bottom border + spacing
const FOOTER_H = 56;    // border-top + footer text
const CONTENT_GAP = 24; // gap between header and content / content and footer
const GAP = 18;         // gap between consecutive content blocks

const CONTENT_AVAIL_H = PAGE_H_PX - PAD_TOP - PAD_BOTTOM - HEADER_H - FOOTER_H - CONTENT_GAP * 2;

function fmtRub(n) {
  return `${Number(n).toLocaleString("ru-RU")} ₽`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function styleBlock() {
  return `
    .fs-pdf-root {
      width: ${PAGE_W_PX}px;
      height: ${PAGE_H_PX}px;
      padding: ${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px;
      box-sizing: border-box;
      background: radial-gradient(circle at 0% 0%, rgba(232,67,147,.18), transparent 45%),
                  radial-gradient(circle at 100% 100%, rgba(108,92,231,.18), transparent 50%),
                  #08080c;
      color: #f0eef5;
      font-family: 'Outfit', 'Helvetica', sans-serif;
      font-weight: 300;
      letter-spacing: 0.2px;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .fs-pdf-root * { box-sizing: border-box; }

    .fs-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 22px; border-bottom: 1px solid rgba(255,255,255,.08); flex-shrink: 0; }
    .fs-brand { display: flex; align-items: center; }
    .fs-logo-img { height: 110px; width: auto; display: block; image-rendering: -webkit-optimize-contrast; }
    .fs-meta { text-align: right; font-size: 12px; color: rgba(240,238,245,.55); line-height: 1.6; }
    .fs-meta b { color: #f0eef5; font-weight: 500; }
    .fs-page-num { margin-top: 6px; font-size: 11px; color: rgba(240,238,245,.4); letter-spacing: 1px; text-transform: uppercase; }

    .fs-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: ${GAP}px; padding: ${CONTENT_GAP}px 0; overflow: hidden; }

    .fs-title { margin: 0; font-size: 22px; font-weight: 200; }
    .fs-title b { font-weight: 600; color: #e84393; }

    .fs-section-label { font-size: 10px; font-weight: 500; letter-spacing: 2.5px; color: rgba(240,238,245,.4); text-transform: uppercase; }

    .fs-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .fs-summary-card { padding: 16px 18px; border-radius: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); }
    .fs-summary-key { font-size: 11px; color: rgba(240,238,245,.5); font-weight: 300; letter-spacing: .5px; }
    .fs-summary-val { font-size: 22px; font-weight: 600; margin-top: 6px; color: #f0eef5; }

    .fs-item { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05); border-radius: 12px; }
    .fs-item-num { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg,#e84393,#6c5ce7); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #fff; flex-shrink: 0; }
    .fs-item-thumb { width: 36px; height: 36px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; }
    .fs-item-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
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

    .fs-total { padding: 22px 26px; border-radius: 18px; background: linear-gradient(135deg, rgba(232,67,147,.12), rgba(108,92,231,.12)); border: 1px solid rgba(232,67,147,.25); display: flex; justify-content: space-between; align-items: center; }
    .fs-total-label { font-size: 14px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(240,238,245,.7); }
    .fs-total-value { font-size: 36px; font-weight: 700; color: #e84393; }

    .fs-footer { padding-top: 18px; border-top: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; font-size: 11px; color: rgba(240,238,245,.4); flex-shrink: 0; }
    .fs-footer b { color: rgba(240,238,245,.7); font-weight: 500; }
  `;
}

function headerHtml(dateStr, modeLabel, pageIdx, pageCount) {
  const pageNum = pageCount > 1
    ? `<div class="fs-page-num">Стр. ${pageIdx + 1} / ${pageCount}</div>`
    : "";
  return `
    <div class="fs-header">
      <div class="fs-brand">
        <img class="fs-logo-img" src="${LOGO_FULL_SRC}" alt="Future Studio" />
      </div>
      <div class="fs-meta">
        <div>${dateStr}</div>
        <div><b>${modeLabel}</b></div>
        ${pageNum}
      </div>
    </div>
  `;
}

function footerHtml() {
  return `
    <div class="fs-footer">
      <div><b>future-studio.ru</b> · СПб · DTF-печать</div>
      <div>future178@yandex.ru · t.me/FUTURE_178</div>
    </div>
  `;
}

// Build atomic content chunks. Each chunk is an indivisible unit; chunks are
// distributed greedily across pages without splitting individual blocks.
function buildChunks(data) {
  const chunks = [];

  chunks.push({
    kind: "title",
    html: `<div class="fs-title">Расчёт <b>DTF-печати</b></div>`,
  });

  chunks.push({
    kind: "summary",
    html: `
      <div class="fs-summary-grid">
        <div class="fs-summary-card"><div class="fs-summary-key">Всего принтов</div><div class="fs-summary-val">${data.totalQty} шт</div></div>
        <div class="fs-summary-card"><div class="fs-summary-key">Длина печати</div><div class="fs-summary-val">${data.lengthCm.toFixed(1)} см</div></div>
        <div class="fs-summary-card"><div class="fs-summary-key">Погонных метров</div><div class="fs-summary-val">${data.metersRound.toFixed(2)} м</div></div>
      </div>
    `,
  });

  chunks.push({
    kind: "section-label",
    keepWithNext: true,
    html: `<div class="fs-section-label">Состав заказа</div>`,
  });

  data.items.forEach((it, i) => {
    chunks.push({
      kind: "item",
      html: `
        <div class="fs-item">
          ${it.thumb
            ? `<div class="fs-item-thumb"><img src="${it.thumb}" alt="" /></div>`
            : `<div class="fs-item-num">${i + 1}</div>`}
          <div class="fs-item-info">
            <div class="fs-item-title">Принт ${i + 1}</div>
            <div class="fs-item-sub">${it.w}×${it.h} см · ${it.qty} шт${it.fileName ? ` · ${escapeHtml(it.fileName)}` : ""}</div>
          </div>
          <div class="fs-item-qty">${it.qty}<span>шт</span></div>
        </div>
      `,
    });
  });

  chunks.push({
    kind: "section-label",
    keepWithNext: true,
    html: `<div class="fs-section-label">Стоимость</div>`,
  });

  chunks.push({
    kind: "cost",
    html: `
      <div class="fs-cost-list">
        ${data.costLines.map((l) => `
          <div class="fs-cost-row">
            <div>
              <div class="fs-cost-label">${escapeHtml(l.label)}</div>
              ${l.sub ? `<div class="fs-cost-sub">${escapeHtml(l.sub)}</div>` : ""}
            </div>
            <div class="fs-cost-amount">${fmtRub(l.amount)}</div>
          </div>
        `).join("")}
      </div>
    `,
  });

  chunks.push({
    kind: "total",
    html: `
      <div class="fs-total">
        <div class="fs-total-label">Итого</div>
        <div class="fs-total-value">${fmtRub(data.total)}</div>
      </div>
    `,
  });

  return chunks;
}

// Renders all chunks once in a hidden probe to measure their natural heights
// at the actual page width.
async function measureChunks(chunks) {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.left = "-99999px";
  probe.style.top = "0";
  probe.style.zIndex = "-1";
  probe.style.width = `${PAGE_W_PX}px`;
  probe.innerHTML = `
    <style>${styleBlock()}</style>
    <div style="width:${PAGE_W_PX - PAD_X * 2}px; font-family:'Outfit','Helvetica',sans-serif;">
      ${chunks.map((c, i) => `<div data-probe="${i}" style="margin-bottom:${GAP}px">${c.html}</div>`).join("")}
    </div>
  `;
  document.body.appendChild(probe);
  await new Promise((r) => requestAnimationFrame(() => r()));
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }
  const imgs = Array.from(probe.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => img.complete
    ? Promise.resolve()
    : new Promise((res) => {
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    })));

  const heights = chunks.map((_, i) => {
    const el = probe.querySelector(`[data-probe="${i}"]`);
    if (!el || !el.firstElementChild) return 0;
    return el.firstElementChild.getBoundingClientRect().height;
  });
  probe.remove();
  return heights;
}

// Greedy packer: distributes chunks into pages within CONTENT_AVAIL_H.
// Honors `keepWithNext` so section labels never get orphaned.
function packPages(chunks, heights) {
  const pages = [];
  let current = [];
  let used = 0;

  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i];
    const h = heights[i];
    const addH = current.length === 0 ? h : h + GAP;

    let needH = addH;
    if (ch.keepWithNext && i + 1 < chunks.length) {
      needH += heights[i + 1] + GAP;
    }

    if (used + needH > CONTENT_AVAIL_H && current.length > 0) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(i);
    used += current.length === 1 ? h : h + GAP;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

function buildPageHtml(chunks, indices, pageIdx, pageCount, dateStr, modeLabel) {
  const body = indices.map((i) => chunks[i].html).join("");
  return `
    <div class="fs-pdf-root">
      <style>${styleBlock()}</style>
      ${headerHtml(dateStr, modeLabel, pageIdx, pageCount)}
      <div class="fs-content">${body}</div>
      ${footerHtml()}
    </div>
  `;
}

async function renderPageToCanvas(html) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    await new Promise((r) => requestAnimationFrame(() => r()));
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }
    const imgs = Array.from(host.querySelectorAll("img"));
    await Promise.all(imgs.map((img) => img.complete
      ? Promise.resolve()
      : new Promise((res) => {
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", res, { once: true });
      })));
    const target = host.firstElementChild;
    return await html2canvas(target, {
      backgroundColor: "#08080c",
      scale: 3,
      useCORS: true,
      logging: false,
      windowWidth: PAGE_W_PX,
    });
  } finally {
    host.remove();
  }
}

export async function generateCalcOrderPdf(data) {
  const created = new Date(data.createdAt);
  const dateStr = created.toLocaleString("ru-RU");
  const modeLabel = data.mode === "withApply" ? "Печать + нанесение" : "Только печать";

  const chunks = buildChunks(data);
  const heights = await measureChunks(chunks);
  const pageGroups = packPages(chunks, heights);
  const pageCount = pageGroups.length;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWmm = 210;
  const pageHmm = 297;

  for (let p = 0; p < pageGroups.length; p++) {
    const html = buildPageHtml(chunks, pageGroups[p], p, pageCount, dateStr, modeLabel);
    // eslint-disable-next-line no-await-in-loop
    const canvas = await renderPageToCanvas(html);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    if (p > 0) doc.addPage();
    doc.addImage(dataUrl, "JPEG", 0, 0, pageWmm, pageHmm);
  }

  return doc.output("blob");
}

export function buildCalcOrderData({ items, mode, totalQty, lengthCm, metersRound, costLines, total }) {
  return {
    createdAt: new Date().toISOString(),
    mode,
    totalQty,
    lengthCm,
    metersRound,
    items: items.map((it) => ({ w: it.w, h: it.h, qty: it.qty, fileName: it.fileName || null, thumb: it.thumb || null })),
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

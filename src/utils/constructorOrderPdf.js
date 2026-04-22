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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function buildHtml(data, previewFrontUrl, previewBackUrl) {
  const created = new Date(data.createdAt);
  const dateStr = created.toLocaleString("ru-RU");

  const product = data.product || {};
  const productTitle = product.name || product.model || "Заказ";
  const productSub = [product.model, product.density].filter(Boolean).join(" · ");

  const summaryCards = [
    { key: "Модель", val: product.model || "—" },
    { key: "Цвет", val: data.color || "—" },
    { key: "Размер", val: data.size || "—" },
    { key: "Количество", val: `${data.qty || 1} шт` },
  ].map((c) => `
    <div class="fs-summary-card">
      <div class="fs-summary-key">${escapeHtml(c.key)}</div>
      <div class="fs-summary-val">${escapeHtml(c.val)}</div>
    </div>
  `).join("");

  const previewsHtml = (previewFrontUrl || previewBackUrl) ? `
    <div class="fs-section fs-section-grow">
      <div class="fs-section-label">Превью макета</div>
      <div class="fs-previews">
        ${previewFrontUrl ? `
          <div class="fs-preview-card">
            <img src="${previewFrontUrl}" alt="Перёд" />
            <div class="fs-preview-cap">Перёд</div>
          </div>
        ` : ""}
        ${previewBackUrl ? `
          <div class="fs-preview-card">
            <img src="${previewBackUrl}" alt="Спина" />
            <div class="fs-preview-cap">Спина</div>
          </div>
        ` : ""}
      </div>
    </div>
  ` : "";

  const metaRowsHtml = (data.orderMeta || []).map(([label, value], i) => {
    if (label === "---") return `<div class="fs-meta-sep"></div>`;
    if (label === "hint") return `<div class="fs-meta-hint">${escapeHtml(value)}</div>`;
    const isTotal = label === "Итого за 1 шт";
    return `
      <div class="fs-meta-row${isTotal ? " is-total" : ""}" data-i="${i}">
        <span class="fs-meta-label">${escapeHtml(label)}</span>
        <span class="fs-meta-value">${escapeHtml(value)}</span>
      </div>
    `;
  }).join("");

  const contactHtml = data.contact && (data.contact.name || data.contact.phone || data.contact.email) ? `
    <div class="fs-section">
      <div class="fs-section-label">Контакты</div>
      <div class="fs-contact">
        ${data.contact.name ? `<div><span>Имя:</span> ${escapeHtml(data.contact.name)}</div>` : ""}
        ${data.contact.phone ? `<div><span>Телефон:</span> ${escapeHtml(data.contact.phone)}</div>` : ""}
        ${data.contact.email ? `<div><span>Email:</span> ${escapeHtml(data.contact.email)}</div>` : ""}
      </div>
    </div>
  ` : "";

  return `
    <div class="fs-pdf-root">
      <style>
        .fs-pdf-root {
          width: ${PAGE_W_PX}px;
          height: ${PAGE_H_PX}px;
          padding: 36px 44px 28px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
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

        .fs-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,.08); flex-shrink: 0; }
        .fs-brand { display: flex; align-items: center; }
        .fs-logo-img { height: 72px; width: auto; display: block; image-rendering: -webkit-optimize-contrast; }
        .fs-meta { text-align: right; font-size: 11px; color: rgba(240,238,245,.55); line-height: 1.5; }
        .fs-meta b { color: #f0eef5; font-weight: 500; }

        .fs-title { margin: 14px 0 2px; font-size: 18px; font-weight: 200; flex-shrink: 0; }
        .fs-title b { font-weight: 600; color: #e84393; }
        .fs-subtitle { font-size: 11px; color: rgba(240,238,245,.5); margin-bottom: 8px; flex-shrink: 0; }

        .fs-section { margin-top: 12px; flex-shrink: 0; }
        .fs-section.fs-section-grow { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
        .fs-section-label { font-size: 9px; font-weight: 500; letter-spacing: 2.2px; color: rgba(240,238,245,.4); text-transform: uppercase; margin-bottom: 8px; }

        .fs-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .fs-summary-card { padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); }
        .fs-summary-key { font-size: 9px; color: rgba(240,238,245,.5); font-weight: 300; letter-spacing: .5px; text-transform: uppercase; }
        .fs-summary-val { font-size: 15px; font-weight: 600; margin-top: 4px; color: #f0eef5; }

        .fs-previews { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1 1 auto; min-height: 0; }
        .fs-preview-card { padding: 8px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 0; }
        .fs-preview-card img { width: 100%; flex: 1 1 auto; min-height: 0; max-height: 100%; object-fit: contain; border-radius: 8px; background: #0c0c12; }
        .fs-preview-cap { font-size: 10px; color: rgba(240,238,245,.5); letter-spacing: 1.4px; text-transform: uppercase; flex-shrink: 0; }

        .fs-meta-list { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; background: rgba(255,255,255,.03); border-radius: 12px; border: 1px solid rgba(255,255,255,.06); }
        .fs-meta-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 2px 0; }
        .fs-meta-label { font-size: 11px; font-weight: 300; color: rgba(240,238,245,.55); }
        .fs-meta-value { font-size: 12px; font-weight: 500; color: #f0eef5; white-space: nowrap; }
        .fs-meta-row.is-total .fs-meta-label { color: #f0eef5; font-weight: 500; }
        .fs-meta-row.is-total .fs-meta-value { font-size: 14px; font-weight: 700; }
        .fs-meta-sep { height: 1px; background: rgba(255,255,255,.08); margin: 4px 0; }
        .fs-meta-hint { font-size: 10px; color: rgba(240,238,245,.35); padding: 1px 0; }

        .fs-total { margin-top: 12px; padding: 14px 20px; border-radius: 14px; background: linear-gradient(135deg, rgba(232,67,147,.12), rgba(108,92,231,.12)); border: 1px solid rgba(232,67,147,.25); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .fs-total-label { font-size: 12px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(240,238,245,.7); }
        .fs-total-value { font-size: 26px; font-weight: 700; color: #e84393; }

        .fs-contact { padding: 10px 14px; background: rgba(255,255,255,.03); border-radius: 12px; border: 1px solid rgba(255,255,255,.06); display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 11px; }
        .fs-contact span { color: rgba(240,238,245,.5); margin-right: 4px; }

        .fs-footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; font-size: 10px; color: rgba(240,238,245,.4); flex-shrink: 0; }
        .fs-footer b { color: rgba(240,238,245,.7); font-weight: 500; }
      </style>

      <div class="fs-header">
        <div class="fs-brand">
          <img class="fs-logo-img" src="${LOGO_FULL_SRC}" alt="Future Studio" />
        </div>
        <div class="fs-meta">
          <div>${dateStr}</div>
          <div><b>Конструктор футболок</b></div>
        </div>
      </div>

      <div class="fs-title">Заказ <b>${escapeHtml(productTitle)}</b></div>
      ${productSub ? `<div class="fs-subtitle">${escapeHtml(productSub)}</div>` : ""}

      <div class="fs-section">
        <div class="fs-section-label">Параметры</div>
        <div class="fs-summary-grid">${summaryCards}</div>
      </div>

      ${previewsHtml}

      <div class="fs-section">
        <div class="fs-section-label">Состав заказа</div>
        <div class="fs-meta-list">${metaRowsHtml}</div>
      </div>

      <div class="fs-total">
        <div class="fs-total-label">Итого</div>
        <div class="fs-total-value">${fmtRub(data.total)}</div>
      </div>

      ${contactHtml}

      <div class="fs-footer">
        <div><b>futurespb.ru</b> · СПб · DTF-печать на футболках</div>
        <div>future178@yandex.ru · t.me/FUTURE_178</div>
      </div>
    </div>
  `;
}

export async function generateConstructorOrderPdf({ data, frontPreviewBlob, backPreviewBlob }) {
  const previewFrontUrl = frontPreviewBlob ? await blobToDataUrl(frontPreviewBlob) : null;
  const previewBackUrl = backPreviewBlob ? await blobToDataUrl(backPreviewBlob) : null;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.innerHTML = buildHtml(data, previewFrontUrl, previewBackUrl);
  document.body.appendChild(host);

  await new Promise((r) => requestAnimationFrame(() => r()));
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }

  // Wait for embedded images to load (logo + previews) before rasterizing.
  const imgs = Array.from(host.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => img.complete
    ? Promise.resolve()
    : new Promise((res) => {
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    })));

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

    // Always fit on a single A4 page: scale down if needed, center horizontally.
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    let drawWmm = pageWmm;
    let drawHmm = totalImgHmm;
    if (drawHmm > pageHmm) {
      const scale = pageHmm / drawHmm;
      drawHmm = pageHmm;
      drawWmm = pageWmm * scale;
    }
    const offsetXmm = (pageWmm - drawWmm) / 2;
    const offsetYmm = (pageHmm - drawHmm) / 2;
    doc.addImage(dataUrl, "JPEG", offsetXmm, offsetYmm, drawWmm, drawHmm);

    return doc.output("blob");
  } finally {
    host.remove();
  }
}

export function buildConstructorOrderData({ product, color, size, qty, orderMeta, currentTotal, contact }) {
  return {
    createdAt: new Date().toISOString(),
    product: {
      name: product?.displayName || product?.name || null,
      model: product?.model || null,
      density: product?.densityLabel || null,
      price: product?.price || null,
    },
    color: color || null,
    size: size || null,
    qty: qty || 1,
    orderMeta: orderMeta || [],
    total: currentTotal || 0,
    contact: contact || null,
  };
}

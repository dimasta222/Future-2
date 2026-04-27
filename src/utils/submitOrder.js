import { exportPrintPdf, collectFontNames, collectOriginalFiles } from "./exportPrintPdf.js";
import { exportPreviewImage } from "./exportPreview.js";
import { generateConstructorOrderPdf, buildConstructorOrderData } from "./constructorOrderPdf.js";
import { generateOrderNumber } from "./orderNumber.js";

const ORDER_API_URL = import.meta.env.VITE_ORDER_API_URL || null;

export async function buildOrderPayload({
  layers,
  uploadedFiles,
  printAreas,
  previewSrcFront,
  previewSrcBack,
  product,
  color,
  size,
  qty,
  orderMeta,
  currentTotal,
  contact,
}) {
  const orderNumber = generateOrderNumber("constructor");
  const frontLayers = layers.filter((l) => (l.side || "front") === "front" && l.visible);
  const backLayers = layers.filter((l) => l.side === "back" && l.visible);
  const hasFront = frontLayers.length > 0;
  const hasBack = backLayers.length > 0;

  const files = {};

  if (hasFront && printAreas.front) {
    try {
      const pdfBuf = await exportPrintPdf({ layers: frontLayers, printArea: printAreas.front });
      files["print-front.pdf"] = new Blob([pdfBuf], { type: "application/pdf" });
    } catch (err) {
      console.error("PDF export front failed:", err);
      files["print-front-error.txt"] = new Blob([`PDF generation failed: ${err?.message || err}`], { type: "text/plain" });
    }

    if (previewSrcFront) {
      try {
        files["preview-front.png"] = await exportPreviewImage({
          previewSrc: previewSrcFront,
          layers: frontLayers,
          printArea: printAreas.front,
        });
      } catch (err) { console.warn("Preview export front failed:", err); }
    }
  }

  if (hasBack && printAreas.back) {
    try {
      const pdfBuf = await exportPrintPdf({ layers: backLayers, printArea: printAreas.back });
      files["print-back.pdf"] = new Blob([pdfBuf], { type: "application/pdf" });
    } catch (err) {
      console.error("PDF export back failed:", err);
      files["print-back-error.txt"] = new Blob([`PDF generation failed: ${err?.message || err}`], { type: "text/plain" });
    }

    if (previewSrcBack) {
      try {
        files["preview-back.png"] = await exportPreviewImage({
          previewSrc: previewSrcBack,
          layers: backLayers,
          printArea: printAreas.back,
        });
      } catch (err) { console.warn("Preview export back failed:", err); }
    }
  }

  const originals = collectOriginalFiles(layers, uploadedFiles);
  for (const orig of originals) {
    files[`originals/${orig.name}`] = orig.data;
  }

  const fontNames = collectFontNames(layers);

  const orderJson = {
    orderNumber,
    product: {
      name: product.displayName || product.name,
      model: product.model,
      density: product.densityLabel || null,
      price: product.price,
    },
    color,
    size,
    qty,
    sides: [hasFront && "front", hasBack && "back"].filter(Boolean),
    fonts: fontNames,
    orderMeta,
    total: currentTotal,
    contact: {
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
    },
    createdAt: new Date().toISOString(),
  };

  // Branded PDF order summary (matches the calculator's design).
  try {
    const summaryData = buildConstructorOrderData({
      product,
      color,
      size,
      qty,
      orderMeta,
      currentTotal,
      contact,
      orderNumber,
    });
    const summaryPdf = await generateConstructorOrderPdf({
      data: summaryData,
      frontPreviewBlob: files["preview-front.png"] || null,
      backPreviewBlob: files["preview-back.png"] || null,
    });
    files[`Заказ ${orderNumber}.pdf`] = summaryPdf;
  } catch (err) {
    console.warn("[buildOrderPayload] summary PDF failed:", err);
  }

  console.log("[buildOrderPayload] files ready:", Object.keys(files).map(k => `${k} (${(files[k].size / 1024).toFixed(1)} KB)`));

  return { files, orderJson };
}

export async function submitOrder(payload) {
  if (!ORDER_API_URL) {
    return { success: false, error: "ORDER_API_URL не настроен. Добавьте VITE_ORDER_API_URL в .env" };
  }

  const formData = new FormData();

  formData.append("order", JSON.stringify(payload.orderJson));

  for (const [name, blob] of Object.entries(payload.files)) {
    formData.append(name, blob, name);
  }

  try {
    const resp = await fetch(ORDER_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, error: `Ошибка сервера: ${resp.status} ${text}` };
    }

    const data = await resp.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: `Ошибка сети: ${err.message}` };
  }
}

export async function downloadOrderLocally(payload) {
  const entries = Object.entries(payload.files);
  for (let i = 0; i < entries.length; i++) {
    const [name, blob] = entries[i];
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.replace(/\//g, "-");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (i < entries.length - 1) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

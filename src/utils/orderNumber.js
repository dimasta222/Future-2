// Генерация номера заказа.
// Формат: FS-NNNNN, где NNNNN — 5 случайных цифр (00000–99999).
// Пример: FS-48201.
//
// Номер генерируется на клиенте при оформлении заказа и пробрасывается:
//   1) в данные PDF (отображается в шапке листа заказа);
//   2) в orderJson, который POST'ится на бэкенд (для темы письма);
//   3) в имя итогового PDF-файла, чтобы менеджер легко находил заказ.

function randomDigits(len = 5) {
  let result = "";
  const cryptoObj = typeof window !== "undefined" ? window.crypto : null;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = new Uint8Array(len);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < len; i += 1) {
      result += String(bytes[i] % 10);
    }
    return result;
  }
  for (let i = 0; i < len; i += 1) {
    result += String(Math.floor(Math.random() * 10));
  }
  return result;
}

/**
 * Генерирует номер заказа вида FS-NNNNN (5 случайных цифр).
 * Параметр `source` оставлен для обратной совместимости, но не влияет на формат.
 * @returns {string}
 */
export function generateOrderNumber() {
  return `FS-${randomDigits(5)}`;
}

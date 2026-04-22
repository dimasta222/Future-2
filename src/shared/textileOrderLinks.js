export function buildTelegramBasketLink(lines, { customerName, customerPhone } = {}) {
  const message = [
    customerName ? `Имя: ${customerName}` : null,
    customerPhone ? `Телефон: ${customerPhone}` : null,
    "",
    "Заказ:",
    "",
    ...lines.map((line, index) => {
      const parts = [
        `${index + 1}. ${line.itemName}`,
        line.variantLabel ? `плотность ${line.variantLabel}` : null,
        line.size ? `размер ${line.size}` : null,
        line.color ? `цвет ${line.color}` : null,
        `кол-во ${line.qty} шт`,
      ].filter(Boolean);
      return parts.join(", ");
    }),
  ].filter((v) => v !== null).join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(message)}`;
}
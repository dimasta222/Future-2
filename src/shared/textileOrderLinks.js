export function buildTelegramOrderLink({ itemName, material, price, size, color }) {
  const details = [
    `Здравствуйте! Хочу заказать ${itemName}.`,
    material ? `Материал: ${material}` : null,
    size ? `Размер: ${size}` : null,
    color ? `Цвет: ${color}` : null,
    price ? `Цена: ${price}` : null,
  ].filter(Boolean).join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(details)}`;
}

export function buildTelegramBasketLink(lines) {
  const message = [
    "Здравствуйте! Хочу заказать футболки:",
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
  ].join("\n");

  return `https://t.me/FUTURE_178?text=${encodeURIComponent(message)}`;
}
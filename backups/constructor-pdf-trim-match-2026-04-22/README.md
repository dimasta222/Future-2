# Constructor — PDF Trim Match (2026-04-22)

Стабильная точка: размер в общем заказе на сайте совпадает с PS Trim PDF на любом размере футболки (XS … 3XL) для текста, фигур и комбинаций.

## Ключевые правки относительно предыдущей стабильной точки

- `src/utils/textPdfBbox.js` — измерение ink-bbox текста полностью повторяет canvas-рендер из `exportPrintPdf.js`. Меряется в baseline (XS) масштабе и умножается на `sizeScale` → стабильно на больших canvas. Порог alpha = 0 (как Photoshop Trim).
- `src/utils/exportPrintPdf.js` — текст рендерится в baseline (XS) масштабе на canvas, в PDF вставляется `× sizeScale`. Порог alpha = 0 для inkCenter.
- `src/utils/constructor/shapeFrame.js` — `getShapeFrameMetricsPx` принимает `effectScale`, `effectDistance` умножается на него.
- `src/hooks/useConstructorState.js` — `getShapeVisualMetricsCm` принимает `sizeScale` и пробрасывает в `effectScale`. `resolveOrderLayerBoundsCm` и `resolveSingleLayerSizeCm` для shape считают `sizeScale = areaWidthCm / baselinePhysicalWidthCm`.
- В `getOrderLayerMetricsPx` (text) приоритетно используется `measureTextPdfInkBboxCm`.
- Хук ждёт `document.fonts.ready` + `document.fonts.load()` на старте, очищает кэш `measureTextPdfInkBboxCm` и форсирует re-render.

## Что покрыто

- Текст: PDF Trim ≈ UI sizeLabel (в пределах округления 0.1 см) на XS и 3XL.
- Фигуры с drop-shadow / distort: PDF Trim ≈ UI sizeLabel на любом размере (учёт `effectDistance × sizeScale`).
- Комбинированные дизайны: тоже.
- Текст на превью не «прыгает» при переключении размера футболки (используется baseline bbox при расчёте translate offset).

# Техническая карта конструктора

Ниже сухая карта текущего устройства конструктора без лишнего описания.

## Уровни

1. Page composition
2. State and business logic
3. Shared textile helpers
4. Constructor config/helpers
5. UI blocks

## Файлы

### src/App.jsx

Назначение:

- подключение страницы конструктора
- подготовка constructor products
- передача constructor-данных в constructor page

Constructor-related элементы:

- CONSTRUCTOR_PRODUCTS
- импорт ConstructorPage.jsx

### src/components/constructor/ConstructorPage.jsx

Назначение:

- page composition для конструктора
- связывание hook и UI-компонентов
- layout страницы конструктора

Зависимости:

- src/hooks/useConstructorState.js
- src/shared/textileHelpers.js
- src/shared/textilePreviewHelpers.js
- src/components/constructor/constructorConfig.js
- src/components/constructor/ConstructorTabsNav.jsx
- src/components/constructor/ConstructorSidebarPanel.jsx
- src/components/constructor/ConstructorPreviewPanel.jsx
- src/components/constructor/ConstructorOrderPanel.jsx

Вход:

- onBack
- products

Зависимости конструктора:

- src/hooks/useConstructorState.js
- src/shared/textileHelpers.js
- src/shared/textilePreviewHelpers.js
- src/components/constructor/constructorConfig.js
- src/components/constructor/ConstructorTabsNav.jsx
- src/components/constructor/ConstructorSidebarPanel.jsx
- src/components/constructor/ConstructorPreviewPanel.jsx
- src/components/constructor/ConstructorOrderPanel.jsx

### src/shared/textileHelpers.js

Назначение:

- shared textile domain helpers
- общий слой между конструктором, текстильными карточками и превью

Экспорты:

- parseColorOptions(...)
- getDefaultTshirtColor(...)
- resolveColorSwatch(...)
- normalizeColorName(...)
- normalizeVariantLabel(...)
- getTshirtSizes(...)
- parsePriceValue(...)

### src/shared/textilePreviewHelpers.js

Назначение:

- shared preview/gallery helper cluster for textile modules

Экспорты:

- svgToDataUri(...)
- buildOrderedGalleryCandidates(...)
- resolveHomepageTshirtPreview(...)
- preloadHomepageTshirtPreview(...)
- loadImageCandidate(...)
- buildTshirtMockupSvg(...)
- buildHomepageTshirtPlaceholderSvg(...)
- buildTshirtFallbackSlides(...)

### src/hooks/useConstructorState.js

Назначение:

- central state container для конструктора
- derived values
- handlers

Вход:

- products
- buildPreviewSrc
- buildTelegramLink
- readFileAsDataUrl
- readImageSize

Выход:

- constructor state
- derived preview/order data
- handlers for UI

Основные зоны ответственности:

- product selection
- color selection
- layer collection state
- active layer selection
- layer ordering, visibility, lock state
- size and quantity
- upload processing
- default positions for new layers, including initial text placement slightly above the print-area center
- default text-layer box width for creation, normalization and derived sidebar state
- default line-shape stroke style derived from selected shape `defaultLineStyle` so the stroke popover highlights the matching mode after add/replace
- size-aware oversize print area resolution: выбранный размер управляет real mockup source, координатами preview print-area и физическими лимитами размеров; если у размера или цвета нет PNG, используется SVG fallback
- size change normalization: при выборе нового размера конструктор пересчитывает physical print-area label и автоматически нормализует upload/shape/line слои под новую максимальную зону, сохраняя их относительный масштаб в превью
- physical size readout for `basic-shapes` derived from intrinsic SVG proportions rather than preview-axis compensation
- active shape factual size separates intrinsic width-derived geometry from manual side deformation for regular shapes: symmetric figures keep symmetric factual dimensions on initial state, while manual vertical stretch still clamps to the selected physical print-area limit
- `cornerRoundness` support for sharp-corner polygon/rect figures across the catalog, with toolbar popover state managed in page-layer and rounded SVG generation in constructorConfig
- persistent uploadedFiles library for the Upload tab with manual add/remove actions before a file becomes a preview layer
- active layer drag-and-drop
- marquee multi-selection in preview for the current side with subsequent group delete through existing Backspace/Delete flow
- text layer state
- shape layer state
- empty initial text value for newly created text layers with preview placeholder
- text font selection with local search, keyboard-layout tolerance, keyboard navigation, grouped sections, pinned active font, listbox-semantics and auto-scroll to active result
- text color system with solid presets, gradient presets, native picker and HEX input
- text box width with auto-wrap inside a single working container and canva-like preview resize handles
- smart guides/snapping state for drag and resize against print-area and other visible layers
- text line-height, stroke and soft shadow effects
- text alignment and letter spacing
- shape categories, category-browser state для overview/detail-экрана, active shape, основной цвет, stroke state с отдельным style/color workflow и взаимоисключающие shape-эффекты
- order summary data

### src/components/constructor/constructorConfig.js

Назначение:

- constructor config
- constructor-specific data builders
- constructor-specific utility functions
- PDF font registry with pathss to TTF files

Основное содержимое:

- CONSTRUCTOR_PRINT_AREAS — размеры печатных зон (физические см и mockup-пиксели) с mockupAspectRatio для каждого типа для корректного преобразования в PDF
- GOOGLE_FONT_TTF_MAP — реестр шрифтов Google Fonts с путями к TTF-файлам в public/fonts/Google/ для использования в PDF-экспорте
- getTtfPath(...) — вспомогательная функция для поиска TTF-пути шрифта и веса

Экспорты:

- CONSTRUCTOR_PRINT_AREAS — физические размеры зон печати подвывод в PDF и физические граница на превью
- resolveConstructorPrintArea(...) — выбор зоны печати по размеру товара
- resolveConstructorMockupSrc(...) — выбор нужного мокапа (PNG/SVG) по цвету и размеру
- CONSTRUCTOR_TABS
	- current sidebar tab order: «Текстиль» → «Текст» → «Фигуры» → «Загрузить» → «Слои»
- CONSTRUCTOR_SHAPE_CATEGORIES
- CONSTRUCTOR_SHAPES
- CONSTRUCTOR_SHAPE_BASIC_COLORS
- buildConstructorProducts(...) — список товаров
- buildConstructorShapeSvg(...) — генерация SVG фигур
- buildConstructorTelegramLink(...) — сборка ссылки заказа
- readFileAsDataUrl(...) — загрузко файлов
- readImageSize(...) — определение размеров загруженных изображений

### src/components/constructor/ConstructorTabsNav.jsx

Назначение:

- navigation component for constructor tabs

Props:

- tabs
- activeTab
- onTabChange

### src/components/constructor/ConstructorSidebarPanel.jsx

Назначение:

- left control panel

Секции:

- textile
- layers
- upload
- text
- shapes

Тип ответственности:

- presentational
- event forwarding
- upload tab stores a persistent miniature library of uploaded files and exposes manual actions to add a new upload-layer or delete the source file from the list
- компактный менеджер слоёв с single-click выбором, double-click переходом к нужной вкладке редактирования, centered layer-content, live drag-and-drop reorder и постоянными action-кнопками скрытия/удаления справа
- side-aware layer model: front/back хранят независимые наборы слоёв, а manager/preview показывают только слои текущей стороны
- physical print model for oversize black XS/S mockups: front/back PNG plus print-area 40 × 50 см; upload и обычные shape-layer хранят widthCm/heightCm, а line-shape дополнительно хранит lineWidthPx/lineHeightPx в логических px холста и конвертирует factual size в см на лету
- size-aware physical print model for oversize: базовая конфигурация может иметь `sizeOverrides` по каждому размеру, и весь state читает уже резолвленную зону печати, а не статический `printAreas[side]`
- primary CTA для создания текстового слоя, fallback-подпись «Текст N» до ввода, короткие фрагменты текста после ввода, быстрые действия скрытия/удаления text-layer и переключение активного text-layer из боковой панели
- одна активная панель текстовых настроек под списком слоёв для режимов «Шрифт», «Цвет», «Интервалы» и «Эффекты»
- отдельная вкладка фигур для выбора shape-layer
- отдельная вкладка фигур с overview-каталогом категорий, горизонтальными лентами превью и отдельным экраном выбранной категории; по умолчанию каталог добавляет новый shape-layer, замена фигуры текущего слоя идёт через отдельную кнопку «Редактировать», подсветка этой кнопки означает active replace-режим, а single-click по другому слою или по пустому месту превью возвращает каталог в add-режим
- отдельные левые панели для shape color/stroke color/effects, открываемые из sticky shape-toolbar над превью; вне вкладки «Фигуры» эти панели временно подменяют содержимое текущей вкладки и закрываются по крестику или клику в пустое место превью

### src/components/constructor/ConstructorPreviewPanel.jsx

Назначение:

- central preview area

Содержимое:

- preview image
- side switcher под превью
- print area overlay
- render stack of visible layers only for the active side
- upload/regular-shape rendering via layer widthCm/heightCm mapped into physical print-area, while line-shape rendering via lineWidthPx/lineHeightPx maps into ту же print-area как logical canvas pixels
- active layer highlight
- marquee-selection rectangle across the full preview surface and selected-layer highlighting for preview multi-select
- active text box guide overlay for a single working text container
- 8 resize handles for active upload/shape/text layer: for text side handles change container width and wrapping, corner handles scale the text box and font together
- smart guides overlay for drag/resize snapping to print-area and other visible layers
- direct text editing inside the active text layer on preview
- active text factual metrics include visual padding from stroke/shadow/underline and are clamped to the current physical print-area bounds before converting to centimeters for the sidebar
- active text factual metrics cache also includes current physical print-area dimensions, so switching XS/S/M updates centimeter values even when the preview pixel geometry stays unchanged
- upload layers preserve original bitmap aspect ratio on add/resize; preview rendering uses plain contain-fit instead of render-frame stretching, so uploaded files no longer deform on insertion
- upload layer resize is fully aspect-ratio-safe on all handles: corner drag stays uniform and side drag now also rescales the second axis instead of creating a stretched container around a contained image
- solid and gradient text fill rendering
- SVG shape-layer rendering with основной фигурой, внутренней обводкой, падающей тенью и двойным искажением через цветовые offset-копии
- SVG shape-layer rendering with tight SVG bounds and outer frame, учитывающим тень, искажение и обводку, чтобы эффекты не обрезались preview-box'ом
- line-shapes use dynamic SVG geometry tied to the current horizontal ratio, so side resize changes line length from the actual line endpoints while keeping visual thickness and segment density stable; dragging one endpoint may also change the line angle while the opposite endpoint stays fixed, line-shapes clamp to a geometry-based minimum length derived from strokeWidth and endpoint decorations, keep endpoint arrows and decorative caps scaled with the current thickness, hide the left-panel size slider and show only factual dimensions plus left/right resize-handles
- active layer resize handles with proportional corner scaling and one-axis edge stretching for non-text layers, при этом corner-resize для upload/shape остаётся uniform с опорой на противоположный угол, а боковые маркеры фиксируют противоположную сторону; у shape-layer дополнительно меняется базовая геометрия вместе с tight bounds
- для активного text-layer preview измеряет визуальные габариты текста и text-box, переводит их в сантиметры относительно physical print-area и отдаёт в sidebar с учетом stroke/shadow-прибавки
- для активного shape-layer sidebar отдельно получает фактический визуальный размер по внешней frame-рамке, включая drop-shadow/distort и rotation; внутренняя обводка обычной фигуры не расширяет внешний фактический размер, а расчет идет не через screen-px превью, а через логические физические единицы, чтобы пропорции фигур оставались корректными
- пустой text-layer остаётся видимым как рабочий контейнер с placeholder
- у активного слоя есть preview-кнопка удаления
- text effect rendering for line-height, stroke and shadow
- pointer bridge for layer dragging
- deselect/reset bridge for clicks on empty preview space

Тип ответственности:

- presentational
- pointer interaction bridge

### src/components/constructor/ConstructorPage.jsx

Дополнительно отвечает за:

- sticky text-toolbar в отдельном верхнем слоте над превью
- синхронизацию toolbar с активной левой панелью текста
- sticky text-toolbar и sticky shape-toolbar в отдельном верхнем слоте над превью, плюс синхронизацию text/shape toolbar с активными левыми панелями; text-toolbar показывается для активного text-layer вне зависимости от текущей вкладки и временно подменяет левую колонку text-панелью по кнопкам toolbar с закрытием по крестику или клику в пустое место превью; для shape-toolbar также отдельные режимы add/replace каталога фигур, кнопку «Редактировать» с подсветкой только в replace-режиме и переходом на вкладку «Фигуры», показ toolbar для активного shape-layer даже вне вкладки «Фигуры», временную подмену текущей левой вкладки shape-панелью по кнопкам toolbar с закрытием по крестику или клику в пустое место превью, сброс replace-режима по выбору другого слоя или пустого места превью, якорный quick-popover «Обводка» и переключение между панелями «Редактирование», «Цвет», «Цвет обводки» и «Эффекты"
- preview-колонка рендерится в обычном потоке без sticky-позиционирования, чтобы высота активного toolbar не вызывала вертикальный сдвиг мокапа и side-toggle кнопок внутри viewport
- side-aware orchestration: при переключении стороны активный слой и preview/sidebar синхронизируются с независимым front/back набором, а summary заказа считает видимые слои по обеим сторонам отдельно
- order pricing orchestration: `useConstructorState` собирает общий bounding box всех видимых printable-layer на стороне, переводит его в сантиметры текущей print-area, подбирает формат через `getConstructorPrintFormat(...)` и добавляет цену печати front/back к базовой цене футболки
- выбор реального previewSrc: PNG-мокапы для чёрной, белой, розовой, бежевой и серой oversize-модели и SVG fallback для остальных сочетаний размера/модели/цвета

### src/components/constructor/ConstructorOrderPanel.jsx

Назначение:

- order summary panel

Содержимое:

- total price
- order meta rows
- decoration rows
- Telegram CTA

Тип ответственности:

- presentational

## Поток данных

1. App.jsx собирает constructor products
2. App.jsx рендерит ConstructorPage.jsx и передает app-level зависимости
3. ConstructorPage.jsx вызывает useConstructorState(...)
4. useConstructorState(...) возвращает state, derived values, handlers
5. ConstructorPage.jsx прокидывает данные в UI-компоненты
6. UI-компоненты отправляют действия обратно через callbacks

## Границы ответственности

### Где должна жить логика

- в src/hooks/useConstructorState.js
- в src/shared/textileHelpers.js
- в src/shared/textilePreviewHelpers.js
- в src/components/constructor/constructorConfig.js

### Где не должна жить логика

- в ConstructorTabsNav.jsx
- в ConstructorSidebarPanel.jsx
- в ConstructorPreviewPanel.jsx
- в ConstructorOrderPanel.jsx

### Где допустима orchestration-логика

- в src/App.jsx
- в src/components/constructor/ConstructorPage.jsx

## Зависимости по смыслу

### useConstructorState.js зависит от:

- constructor products
- constructor products
- file/image helpers
- preview builder
- telegram link builder
- layer order and active layer mutations

### constructor/page слой зависит от:

- src/components/LogoMini.jsx
- shared textile helpers
- shared textile preview helpers
- shared app styles

### UI зависит от:

- props из App.jsx
- callbacks из useConstructorState.js

### constructorConfig.js не должен зависеть от UI-компонентов

Это однонаправленная зависимость:

- config/helpers -> hook/page -> UI

## Текущее направление для дальнейшего выноса

Потенциальные следующие шаги:

## Шрифты и PDF экспорт

### Архитектура шрифтов

- **Источник:** `public/fonts/Google/` — все TTF-файлы с полной поддержкой Unicode (кириллица + латиница)
- **Загрузка:** `src/generated/localFonts.css` — автогенерируемый файл с @font-face декларациями для всех локальных TTF
- **Причина:** Консолидация из трёх источников (Google Fonts API + @fontsource npm-пакеты) в один локальный TTF-репозиторий; Google Fonts v2 API возвращает TTF с полным Unicode, поэтому отдельные cyrillic/latin варианты не требуются

### PDF экспорт (src/utils/exportPrintPdf.js)

- **Шрифты в PDF:** Canvas-based text rendering с использованием Font Loading API (`document.fonts.load()`) для асинхронной загрузки шрифтов перед рендерингом
- **Текст:** Все текстовые слои рендерятся через canvas с 120 px/cm (305 DPI) для качественного вывода
- **Пропорции:** Зона печати в `OVERSIZE_PRINT_AREA_GEOMETRY` приведена к физическому AR (XS = 41/52 ≈ 0.788) через `width: 54.9, height: 76.3`. PDF-страница строится напрямую по `physW × physH` без Y-растяжки (`effectivePhysH = physH`).
- **Ink-bbox центрирование текста:** Текстовые слои в PDF и preview-PNG позиционируются по реальным пикселям глифов (alpha-scan canvas → ink-center совпадает с `position.x/y`). Утилита: `src/utils/textInkBbox.js` — `measureTextInkBboxPx()`. Это даёт точное соответствие размера в Photoshop (после Trim) и UI summary, особенно для скриптовых шрифтов с росчерками.
- **Превью конструктора:** DOM-узел текстового слоя сдвигается дополнительным `translate(-dxEm, -dyEm)` в CSS-transform, чтобы его ink-центр визуально совпал с `position.x/y`. Это синхронизирует превью, PDF и Photoshop.
- **Изображения:** Передаются напрямую в jsPDF без переконвертации для сохранения оригинальных ICC-профилей (забота о цветовой точности)
- **Поддержка кириллицы:** Работает через @font-face + Font Loading API без необходимости дополнительных конфигураций

- при росте сложности разделить useConstructorState.js на smaller hooks
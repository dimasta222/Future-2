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
- подготовка constructor products и preset prints
- передача constructor-данных в constructor page

Constructor-related элементы:

- CONSTRUCTOR_PRODUCTS
- CONSTRUCTOR_PRESET_PRINTS
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
- presetPrints

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
- presetPrints
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
- active layer drag-and-drop
- text layer state
- shape layer state
- empty initial text value for newly created text layers with preview placeholder
- text font selection with local search, keyboard-layout tolerance, keyboard navigation, grouped sections, pinned active font, listbox-semantics and auto-scroll to active result
- text color system with solid presets, gradient presets, native picker and HEX input
- text box width with auto-wrap inside a single working container and canva-like preview resize handles
- text line-height, stroke and soft shadow effects
- text alignment and letter spacing
- preset layer state
- shape categories, category-browser state для overview/detail-экрана, active shape, основной цвет, stroke state с отдельным style/color workflow и взаимоисключающие shape-эффекты
- order summary data

### src/components/constructor/constructorConfig.js

Назначение:

- constructor config
- constructor-specific data builders
- constructor-specific utility functions

Экспорты:

- CONSTRUCTOR_PRINT_AREAS
- CONSTRUCTOR_TABS
- CONSTRUCTOR_SHAPE_CATEGORIES
- CONSTRUCTOR_SHAPES
- CONSTRUCTOR_SHAPE_BASIC_COLORS
- buildConstructorProducts(...)
- createConstructorPresetPrints(...)
- buildConstructorShapeSvg(...)
- buildConstructorTelegramLink(...)
- readFileAsDataUrl(...)
- readImageSize(...)

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
- preset prints
- shapes

Тип ответственности:

- presentational
- event forwarding
- компактный менеджер слоёв с single-click выбором, double-click переходом к нужной вкладке редактирования, centered layer-content, live drag-and-drop reorder и постоянными action-кнопками скрытия/удаления справа
- side-aware layer model: front/back хранят независимые наборы слоёв, а manager/preview показывают только слои текущей стороны
- physical print model for oversize black XS/S mockups: front/back PNG plus print-area 40 × 50 см; upload, preset и shape-layer хранят widthCm/heightCm вместо абстрактного scale
- primary CTA для создания текстового слоя, fallback-подпись «Текст N» до ввода, короткие фрагменты текста после ввода, быстрые действия скрытия/удаления text-layer и переключение активного text-layer из боковой панели
- одна активная панель текстовых настроек под списком слоёв для режимов «Шрифт», «Цвет», «Интервалы» и «Эффекты»
- отдельная вкладка фигур для выбора shape-layer
- отдельная вкладка фигур с overview-каталогом категорий, горизонтальными лентами превью и отдельным экраном выбранной категории; по умолчанию каталог добавляет новый shape-layer, замена фигуры текущего слоя идёт через отдельную кнопку «Редактировать», подсветка этой кнопки означает active replace-режим, а single-click по другому слою или по пустому месту превью возвращает каталог в add-режим
- отдельные левые панели для shape color/stroke color/effects, открываемые из sticky shape-toolbar над превью

### src/components/constructor/ConstructorPreviewPanel.jsx

Назначение:

- central preview area

Содержимое:

- preview image
- side switcher
- print area overlay
- render stack of visible layers only for the active side
- upload/preset/shape rendering via layer widthCm/heightCm mapped into physical print-area
- active layer highlight
- active text box guide overlay for a single working text container
- 8 resize handles for active upload/preset/shape/text layer: for text side handles change container width and wrapping, corner handles scale the text box and font together
- direct text editing inside the active text layer on preview
- solid and gradient text fill rendering
- SVG shape-layer rendering with основной фигурой, внутренней обводкой, падающей тенью и двойным искажением через цветовые offset-копии
- active layer resize handles with proportional corner scaling and one-axis edge stretching for non-text layers
- для активного text-layer preview измеряет DOM-габариты текста и text-box, переводит их в сантиметры относительно physical print-area и отдаёт в sidebar
- text effect rendering for line-height, stroke and shadow
- pointer bridge for layer dragging
- deselect/reset bridge for clicks on empty preview space

Тип ответственности:

- presentational
- pointer interaction bridge

### src/components/constructor/ConstructorPage.jsx

Дополнительно отвечает за:

- sticky text-toolbar под переключателем стороны
- синхронизацию toolbar с активной левой панелью текста
- sticky text-toolbar и sticky shape-toolbar под переключателем стороны, плюс синхронизацию text/shape toolbar с активными левыми панелями; для shape-toolbar также отдельные режимы add/replace каталога фигур, кнопку «Редактировать» с подсветкой только в replace-режиме и переходом на вкладку «Фигуры», показ toolbar для активного shape-layer даже вне вкладки «Фигуры», сброс replace-режима по выбору другого слоя или пустого места превью, якорный quick-popover «Обводка» и переключение между панелями «Редактирование», «Цвет», «Цвет обводки» и «Эффекты"
- side-aware orchestration: при переключении стороны активный слой и preview/sidebar синхронизируются с независимым front/back набором, а summary заказа считает слои по обеим сторонам отдельно
- выбор реального previewSrc: PNG-мокапы только для чёрной oversize-модели размеров XS/S и SVG fallback для остальных сочетаний размера/модели/цвета

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

1. App.jsx собирает constructor products и preset prints
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
- preset prints
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

- при росте сложности разделить useConstructorState.js на smaller hooks
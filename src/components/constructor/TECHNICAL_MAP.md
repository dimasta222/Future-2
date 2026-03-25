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
- empty initial text value for newly created text layers with preview placeholder
- text font selection with local search, keyboard-layout tolerance, keyboard navigation, grouped sections, pinned active font, listbox-semantics and auto-scroll to active result
- text color system with solid presets, gradient presets, native picker and HEX input
- text box width with default auto-wrap and preview resize handles
- text line-height, stroke and hard/soft shadow effects
- text alignment and letter spacing
- preset layer state
- order summary data

### src/components/constructor/constructorConfig.js

Назначение:

- constructor config
- constructor-specific data builders
- constructor-specific utility functions

Экспорты:

- CONSTRUCTOR_PRINT_AREAS
- CONSTRUCTOR_TABS
- buildConstructorProducts(...)
- createConstructorPresetPrints(...)
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

Тип ответственности:

- presentational
- event forwarding
- primary CTA для создания текстового слоя, fallback-подпись «Текст N» до ввода, короткие фрагменты текста после ввода, быстрые действия скрытия/удаления text-layer и переключение активного text-layer из боковой панели
- одна активная панель текстовых настроек под списком слоёв для режимов «Шрифт», «Цвет», «Интервалы» и «Эффекты»

### src/components/constructor/ConstructorPreviewPanel.jsx

Назначение:

- central preview area

Содержимое:

- preview image
- side switcher
- print area overlay
- render stack of visible layers
- active layer highlight
- active text box guide overlay
- direct text editing inside the active text layer on preview
- solid and gradient text fill rendering
- active text box resize handles
- text effect rendering for line-height, stroke and shadow
- pointer bridge for layer dragging

Тип ответственности:

- presentational
- pointer interaction bridge

### src/components/constructor/ConstructorPage.jsx

Дополнительно отвечает за:

- toolbar быстрых текстовых действий над превью
- синхронизацию toolbar с активной левой панелью текста

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
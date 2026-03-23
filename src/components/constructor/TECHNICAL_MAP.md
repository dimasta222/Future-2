# Техническая карта конструктора

Ниже сухая карта текущего устройства конструктора без лишнего описания.

## Уровни

1. Page composition
2. State and business logic
3. Constructor config/helpers
4. UI blocks

## Файлы

### src/App.jsx

Назначение:

- подключение страницы конструктора
- сборка layout конструктора
- связывание hook и UI-компонентов

Constructor-related элементы:

- CONSTRUCTOR_PRODUCTS
- CONSTRUCTOR_PRESET_PRINTS
- ConstructorPage(...)
- buildPreviewSrc через buildTshirtMockupSvg(...)

Зависимости конструктора:

- src/hooks/useConstructorState.js
- src/components/constructor/constructorConfig.js
- src/components/constructor/ConstructorTabsNav.jsx
- src/components/constructor/ConstructorSidebarPanel.jsx
- src/components/constructor/ConstructorPreviewPanel.jsx
- src/components/constructor/ConstructorOrderPanel.jsx

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
- size and quantity
- upload processing
- upload drag-and-drop
- text overlay state
- preset selection
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
- upload
- text
- preset prints

Тип ответственности:

- presentational
- event forwarding

### src/components/constructor/ConstructorPreviewPanel.jsx

Назначение:

- central preview area

Содержимое:

- preview image
- side switcher
- print area overlay
- preset layer
- uploaded design layer
- text layer

Тип ответственности:

- presentational
- pointer interaction bridge

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

1. App.jsx собирает исходные constructor dependencies
2. App.jsx вызывает useConstructorState(...)
3. useConstructorState(...) возвращает state, derived values, handlers
4. App.jsx прокидывает данные в UI-компоненты
5. UI-компоненты отправляют действия обратно через callbacks

## Границы ответственности

### Где должна жить логика

- в src/hooks/useConstructorState.js
- в src/components/constructor/constructorConfig.js

### Где не должна жить логика

- в ConstructorTabsNav.jsx
- в ConstructorSidebarPanel.jsx
- в ConstructorPreviewPanel.jsx
- в ConstructorOrderPanel.jsx

### Где допустима orchestration-логика

- в src/App.jsx

## Зависимости по смыслу

### useConstructorState.js зависит от:

- constructor products
- preset prints
- file/image helpers
- preview builder
- telegram link builder

### UI зависит от:

- props из App.jsx
- callbacks из useConstructorState.js

### constructorConfig.js не должен зависеть от UI-компонентов

Это однонаправленная зависимость:

- config/helpers -> hook/page -> UI

## Текущее направление для дальнейшего выноса

Потенциальные следующие шаги:

- вынести ConstructorPage из App.jsx в отдельный page file
- вынести shared textile helpers из App.jsx в отдельный shared module
- при росте сложности разделить useConstructorState.js на smaller hooks
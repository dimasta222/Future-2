# Техническая карта shared-слоя

Ниже сухая карта текущего устройства папки shared.

## Назначение слоя

Shared-слой хранит общую доменную и utility-логику, которая используется в нескольких частях приложения и не должна жить внутри page-level файлов.

## Файлы

### src/shared/textileHelpers.js

Назначение:

- shared textile domain helpers

Экспорты:

- parseColorOptions(...)
- normalizeColorName(...)
- getDefaultTshirtColor(...)
- resolveColorSwatch(...)
- normalizeVariantLabel(...)
- getTshirtSizes(...)
- parsePriceValue(...)

### src/shared/textilePreviewHelpers.js

Назначение:

- shared textile preview/gallery helpers

Экспорты:

- svgToDataUri(...)
- buildOrderedGalleryCandidates(...)
- resolveHomepageTshirtPreview(...)
- preloadHomepageTshirtPreview(...)
- loadImageCandidate(...)
- buildTshirtMockupSvg(...)
- buildHomepageTshirtPlaceholderSvg(...)
- buildTshirtFallbackSlides(...)

### src/shared/appStyles.js

Назначение:

- shared app styles module

Экспорт:

- default STYLES

## Зависимости по смыслу

### src/shared/textileHelpers.js не должен зависеть от:

- React-компонентов
- page-level state
- constructor-only UI

### src/shared/textilePreviewHelpers.js не должен зависеть от:

- React-компонентов
- page-level state
- constructor-only UI

### src/shared/textileHelpers.js может использоваться из:

- src/App.jsx
- src/components/constructor/constructorConfig.js
- будущих shared textile/module blocks

### src/shared/textilePreviewHelpers.js может использоваться из:

- src/App.jsx
- constructor preview builder
- future textile preview modules

### src/shared/appStyles.js может использоваться из:

- src/App.jsx
- src/components/constructor/ConstructorPage.jsx
- future page-level modules that inject shared styles

## Границы ответственности

### Что должно жить в shared

- reusable domain helpers
- общие utility-функции
- общие style-модули без UI-зависимостей
- код, который нужен нескольким частям приложения

### Что не должно жить в shared

- orchestration-логика страниц
- локальное состояние компонентов
- constructor-only config
- UI-компоненты

## Поток использования

1. Shared helper экспортируется из src/shared/textileHelpers.js
2. Page/module layer импортирует helper
3. UI получает уже готовые данные через page/module layer

## Текущее направление роста

Если папка shared будет расширяться дальше, в неё логично выносить:

- другие reusable textile helpers
- preview/gallery helper-кластер, если он станет общим для нескольких модулей
- общие pure utility modules без UI-зависимостей
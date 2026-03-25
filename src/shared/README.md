# Shared Modules

Эта папка хранит общие модули, которые переиспользуются в нескольких частях приложения и не должны жить внутри page-level файлов.

## Документация папки

- `src/shared/README.md`
	- общее описание папки и навигация
- `src/shared/EDITING_GUIDE.md`
	- практическая памятка: если нужно править X, идти в такой-то файл
- `src/shared/TECHNICAL_MAP.md`
	- техническая карта shared-слоя

## Назначение папки

- вынос shared helper-функций из крупных экранов и контейнеров
- снижение связности `src/App.jsx`
- повторное использование общей доменной логики между конструктором, текстильными страницами и другими модулями

## Навигация

### textileHelpers.js

Файл: `src/shared/textileHelpers.js`

Отвечает за:

- парсинг цветовых опций
- выбор дефолтного цвета футболки
- нормализацию названий цветов
- swatch-данные для цветов
- нормализацию label вариантов
- размеры футболок
- парсинг цен

Используется, когда нужно:

- менять общую textile-логику без привязки к конкретной странице
- переиспользовать helper-функции в конструкторе и других textile-блоках

Сопутствующая документация:

- `src/shared/EDITING_GUIDE.md`
- `src/shared/TECHNICAL_MAP.md`

### textilePreviewHelpers.js

Файл: `src/shared/textilePreviewHelpers.js`

Отвечает за:

- preview и gallery helper-кластер для футболок
- fallback slides
- загрузку candidate preview/photo sources
- построение mockup SVG
- построение homepage placeholder SVG
- выбор реальных preview assets и gallery paths
- preload preview-изображений

Используется, когда нужно:

- менять превью футболок в текстильных карточках
- менять fallback-галерею
- менять SVG-макет футболки
- менять asset-path mapping для preview/gallery

Сопутствующая документация:

- `src/shared/EDITING_GUIDE.md`
- `src/shared/TECHNICAL_MAP.md`

### appStyles.js

Файл: `src/shared/appStyles.js`

Отвечает за:

- общий CSS string для экранов приложения
- базовые utility-классы и responsive-правила
- общие nav/mobile/layout стили, которые используют разные страницы

Используется, когда нужно:

- менять глобальные inline-styles, которые встраиваются через `<style>`
- убрать style-константы из page-level файлов
- переиспользовать один и тот же набор app styles в нескольких экранах

Сопутствующая документация:

- `src/shared/EDITING_GUIDE.md`
- `src/shared/TECHNICAL_MAP.md`

### fieldUi.js

Файл: `src/shared/fieldUi.js`

Отвечает за:

- общие style-примитивы для field-based UI
- reusable style-константы для строк контролов и компактных form-block паттернов

Используется, когда нужно:

- переиспользовать горизонтальный control-strip между карточками и селекторами
- убрать технические UI-style константы из `src/App.jsx`

Сопутствующая документация:

- `src/shared/README.md`

### textileOrderLinks.js

Файл: `src/shared/textileOrderLinks.js`

Отвечает за:

- генерацию Telegram-ссылок для textile-заказов
- формирование текстов быстрых order-link сценариев
- формирование Telegram-ссылки корзины textile-заказа

Используется, когда нужно:

- менять ссылку заказа товара из textile-каталога
- менять ссылку заказа собранной корзины футболок
- переиспользовать order-link helper вне `src/App.jsx`

Сопутствующая документация:

- `src/shared/README.md`

## Как понимать границы папки

Сюда стоит класть:

- shared domain helpers
- общие utility-модули, которые нужны нескольким экранам или модулям
- общие style-модули без UI-компонентов

Сюда не стоит класть:

- constructor-only config
- page-specific orchestration logic
- UI-компоненты

## Куда идти в зависимости от задачи

- если меняется общая textile-логика: `src/shared/textileHelpers.js`
- если меняются shared style-примитивы для полей и контролов: `src/shared/fieldUi.js`
- если меняются Telegram-ссылки для textile-заказа: `src/shared/textileOrderLinks.js`
- если меняется только конструктор: `src/components/constructor/`
- если меняется только сборка страницы: `src/App.jsx`

## Если папка вырастет

При добавлении новых файлов в `src/shared` обновляй этот README:

- добавляй краткое описание каждого файла
- обновляй навигацию по папке
- фиксируй, что является shared, а что туда класть не нужно

Если в папке появляется несколько смысловых модулей:

- обновляй `src/shared/EDITING_GUIDE.md`
- обновляй `src/shared/TECHNICAL_MAP.md`
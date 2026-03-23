# Памятка по правкам конструктора

Этот файл нужен как быстрый ориентир: если нужно поменять конкретную часть конструктора, сюда можно зайти и сразу понять, в какой файл идти.

## Если нужно поменять вкладки конструктора

Иди в:

- src/components/constructor/constructorConfig.js
  - если нужно изменить состав табов
  - если нужно переименовать вкладку
  - если нужно поменять порядок вкладок

- src/components/constructor/ConstructorTabsNav.jsx
  - если нужно поменять внешний вид табов
  - если нужно поменять кнопки, иконки, активное состояние

## Если нужно поменять левую панель

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять содержимое вкладок
  - если нужно поменять поля выбора товара, размера, цвета, количества
  - если нужно поменять UI загрузки макета
  - если нужно поменять UI текста
  - если нужно поменять UI готовых принтов

Если нужно не только поменять внешний вид, но и изменить поведение:

- src/hooks/useConstructorState.js
  - если логика выбора, сброса или синхронизации состояния должна работать по-другому

## Если нужно поменять центральное превью

Иди в:

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение футболки
  - если нужно поменять переключение стороны печати
  - если нужно поменять отображение зоны печати
  - если нужно поменять наложение текста, принта или загруженного макета

Если нужно поменять сами данные для превью:

- src/hooks/useConstructorState.js
  - если нужно изменить, как собирается preview state

- src/App.jsx
  - если нужно изменить, как строится previewSrc через buildTshirtMockupSvg

## Если нужно поменять правую панель заказа

Иди в:

- src/components/constructor/ConstructorOrderPanel.jsx
  - если нужно поменять внешний вид блока заказа
  - если нужно поменять сетку, выравнивание, подписи, цену, CTA

- src/hooks/useConstructorState.js
  - если нужно поменять, какие данные попадают в заказ
  - если нужно поменять orderMeta
  - если нужно поменять orderDecorItems
  - если нужно поменять условие canSubmitOrder

- src/components/constructor/constructorConfig.js
  - если нужно поменять формирование Telegram-ссылки заказа

## Если нужно поменять список футболок в конструкторе

Иди в:

- src/components/constructor/constructorConfig.js
  - функция buildConstructorProducts(...)
  - здесь собирается список товаров конструктора из каталога

- src/App.jsx
  - если нужно поменять, какие исходные данные передаются в buildConstructorProducts(...)

Если проблема в исходных каталогах текстиля, а не в самом конструкторе:

- src/App.jsx
  - проверь helpers, которые подмешиваются в buildConstructorProducts(...)
  - например parseColorOptions, getTshirtSizes, parsePriceValue, normalizeVariantLabel

## Если нужно поменять зоны печати

Иди в:

- src/components/constructor/constructorConfig.js
  - CONSTRUCTOR_PRINT_AREAS
  - здесь задаются координаты и размеры print area для моделей и сторон

## Если нужно поменять готовые принты

Иди в:

- src/components/constructor/constructorConfig.js
  - createConstructorPresetPrints(...)
  - здесь задаются preset keys, label и SVG-источники

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять только UI карточек пресетов

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение выбранного пресета поверх футболки

## Если нужно поменять текстовый слой

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять UI текста: размер, насыщенность, цвет, uppercase

- src/hooks/useConstructorState.js
  - если нужно поменять логику текста
  - если нужно поменять overlayText
  - если нужно поменять автоподстановку цвета текста при смене цвета футболки

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отрисовку текста на превью

## Если нужно поменять загрузку макета

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять UI загрузки
  - если нужно поменять кнопки удаления, центрирования, масштаба

- src/hooks/useConstructorState.js
  - если нужно поменять обработку файла
  - если нужно поменять drag-and-drop
  - если нужно поменять clamp позиции
  - если нужно поменять поведение масштаба

- src/components/constructor/constructorConfig.js
  - если нужно поменять чтение файла или определение размеров изображения

## Если нужно поменять источник данных для конструктора

Иди в:

- src/App.jsx
  - здесь собирается CONSTRUCTOR_PRODUCTS
  - здесь передаются shared helpers в buildConstructorProducts(...)

- src/components/constructor/constructorConfig.js
  - если нужно менять уже constructor-specific сборку данных

## Если нужно поменять state-flow конструктора

Иди в:

- src/hooks/useConstructorState.js
  - это главный файл бизнес-логики конструктора
  - сюда идти, если нужно менять связи между выбором товара, цвета, размера, текста, макета, пресета и заказа

## Если нужно поменять только компоновку страницы конструктора

Иди в:

- src/App.jsx
  - если нужно поменять порядок блоков страницы
  - если нужно поменять grid-структуру: left panel / preview / order
  - если нужно переставить или заменить компоненты местами

## Если нужно быстро понять, куда идти

Коротко:

- логика и state: src/hooks/useConstructorState.js
- конфиг и constructor helpers: src/components/constructor/constructorConfig.js
- левая панель: src/components/constructor/ConstructorSidebarPanel.jsx
- центральное превью: src/components/constructor/ConstructorPreviewPanel.jsx
- правая панель заказа: src/components/constructor/ConstructorOrderPanel.jsx
- вкладки: src/components/constructor/ConstructorTabsNav.jsx
- страница и сборка всего вместе: src/App.jsx
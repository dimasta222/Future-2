# Памятка по правкам конструктора

Этот файл нужен как быстрый ориентир: если нужно поменять конкретную часть конструктора, сюда можно зайти и сразу понять, в какой файл идти.

## Если нужно поменять вкладки конструктора

Иди в:

- src/components/constructor/constructorConfig.js
  - если нужно изменить состав табов
  - если нужно переименовать вкладку
  - если нужно поменять порядок вкладок
  - если нужно добавить или убрать вкладки «Слои» или «Фигуры»

- src/components/constructor/ConstructorTabsNav.jsx
  - если нужно поменять внешний вид табов
  - если нужно поменять кнопки, иконки и активное состояние

## Если нужно поменять левую панель

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять содержимое вкладок
  - если нужно поменять компактный менеджер слоёв, его centered-карточки, drag-and-drop перестановку, single-click выбор или double-click переход к редактированию
  - если нужно поменять UI текста, готовых принтов, фигур или загрузки макета
  - если нужно поменять поля выбора товара, размера, цвета и количества

Если нужно не только поменять внешний вид, но и изменить поведение:

- src/hooks/useConstructorState.js
  - если логика выбора, сброса, синхронизации состояния, перестановки слоёв или preview-resize должна работать по-другому

## Если нужно поменять центральное превью

Иди в:

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение футболки
  - если нужно поменять переключение стороны печати
  - если нужно поменять отображение зоны печати
  - если нужно поменять рендер текста, принтов, фигур или макетов
  - если нужно поменять рамки слоя, порядок, drag-поведение или resize-handles на превью

Если нужно поменять сами данные для превью:

- src/hooks/useConstructorState.js
  - если нужно изменить preview state или интерактивность слоя

- src/shared/textilePreviewHelpers.js
  - если нужно изменить mockup SVG или общую preview helper-логику

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять, как preview builder и preview props подключаются

## Если нужно поменять правую панель заказа

Иди в:

- src/components/constructor/ConstructorOrderPanel.jsx
  - если нужно поменять сетку, выравнивание, подписи, цену и CTA

- src/hooks/useConstructorState.js
  - если нужно поменять orderMeta
  - если нужно поменять summary по слоям
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

- src/shared/textileHelpers.js
  - проверь общие textile-helper'ы, которые подмешиваются в buildConstructorProducts(...)
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
  - если нужно поменять UI карточек пресетов

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение выбранного пресета поверх футболки

## Если нужно поменять фигуры

Иди в:

- src/components/constructor/constructorConfig.js
  - если нужно поменять категории фигур
  - если нужно добавить или изменить SVG shape-definition
  - если нужно поменять helper сборки SVG для shape-layer
  - если нужно поменять состав каталога категорий, горизонтальных лент, tight-bounds геометрию SVG и логику внутренней обводки

- src/hooks/useConstructorState.js
  - если нужно поменять shape-layer props
  - если нужно поменять создание, дублирование, summary, размеры upload/preset/shape в сантиметрах, aspect-ratio фигуры при добавлении и ширинном resize, выбор активной фигуры, стартовое смещение новых слоёв, привязку слоя к стороне «Спереди/Сзади» или параметры эффектов
  - если нужно поменять поведение каталога фигур по умолчанию на добавление нового слоя или логику замены фигуры в активном shape-layer

- src/utils/constructor/resize/resizeShapeLayer.js
  - если нужно поменять anchored-resize фигуры на превью: uniform scaling за углы, one-axis deformation за средние handles и пересчёт tight frame вместе с shape geometry

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять вкладку «Фигуры», overview-каталог категорий, отдельный экран выбранной категории, режимы add/replace и левые панели цвета/цвета обводки/эффектов

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять sticky shape-toolbar под кнопками стороны, кнопку «Редактировать», визуальный индикатор replace-режима, показ toolbar для активной фигуры вне вкладки «Фигуры», якорение popover «Обводка» и переключение между режимами «Редактирование», «Цвет», «Цвет обводки» и «Эффекты"

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение shape-layer поверх футболки
  - если нужно поменять рендер падающей тени, двойного искажения или внутренней обводки фигуры
  - если нужно поменять внешнюю рамку shape-layer, которая расширяется под effect offsets и остаётся вплотную к реальной фигуре
  - если нужно поменять поведение клика по пустому месту превью для снятия выделения и выхода из replace-режима фигуры
  - если нужно поменять показ слоёв только для активной стороны «Спереди/Сзади"
  - если нужно поменять перевод сантиметровых размеров слоя в экранный размер внутри physical print-area

- src/hooks/useConstructorState.js
  - если нужно поменять, как для активного text-layer считаются и показываются реальные размеры текста/текстового бокса в сантиметрах

- src/components/constructor/ConstructorTabsNav.jsx
  - если нужно поменять кнопку или иконку вкладки «Фигуры»

## Если нужно поменять текстовый слой

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять создание текста, список текстовых слоёв и быстрые действия над ними
  - если нужно поменять панели «Шрифт», «Цвет», «Интервалы» и «Эффекты»

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять sticky toolbar быстрых текстовых действий под переключателем стороны и его связь с левой панелью

- src/hooks/useConstructorState.js
  - если нужно поменять text-layer props и дефолты
  - если нужно поменять шрифты, solid/gradient режим заливки, перенос, межстрочный интервал, обводку, тень, межбуквенный интервал и выравнивание
  - если нужно поменять автоподстановку цвета текста при смене цвета футболки

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отрисовку текстового слоя на превью
  - если нужно поменять прямое редактирование текста внутри слоя
  - если нужно поменять text box модель текста, drag-handles, перенос внутри контейнера, smart guides/snapping, preview delete-button и canva-подобный resize текста

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять удаление активного слоя по Backspace/Delete или состав preview props

- src/components/constructor/constructorConfig.js
  - если нужно поменять список шрифтов, solid colors или gradient presets для текста

## Если нужно поменять загрузку макета

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять UI загрузки
  - если нужно поменять кнопки удаления, центрирования и масштаба

- src/hooks/useConstructorState.js
  - если нужно поменять обработку файла
  - если нужно поменять drag-and-drop слоя
  - если нужно поменять clamp позиции или поведение масштаба upload-layer

- src/components/constructor/constructorConfig.js
  - если нужно поменять чтение файла или определение размеров изображения

## Если нужно поменять source data конструктора

Иди в:

- src/App.jsx
  - здесь собираются constructor products и preset prints

- src/shared/textileHelpers.js
  - здесь лежат базовые textile helper-функции, участвующие в сборке данных

- src/components/constructor/constructorConfig.js
  - если нужно менять constructor-specific сборку данных

## Если нужно поменять state-flow конструктора

Иди в:

- src/hooks/useConstructorState.js
  - это главный файл бизнес-логики конструктора
  - сюда идти, если нужно менять связи между выбором товара, цвета, размера, слоёв, фигур, пресетов и заказа

## Если нужно поменять систему слоёв

Иди в:

- src/hooks/useConstructorState.js
  - если нужно менять структуру слоя
  - если нужно менять active layer
  - если нужно менять порядок, видимость, блокировку, дублирование или удаление

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно менять UI списка слоёв
  - если нужно менять кнопки управления слоями

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно менять визуальный порядок слоёв и интерактивность на превью

## Если нужно поменять только компоновку страницы конструктора

Иди в:

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять порядок блоков страницы
  - если нужно поменять grid-структуру left panel / preview / order
  - если нужно переставить или заменить компоненты местами

- src/App.jsx
  - если нужно поменять app-level вход в страницу конструктора

## Если нужно быстро понять, куда идти

Коротко:

- логика и state: src/hooks/useConstructorState.js
- общие textile helper'ы: src/shared/textileHelpers.js
- общие preview/gallery helper'ы: src/shared/textilePreviewHelpers.js
- конфиг и constructor helpers: src/components/constructor/constructorConfig.js
- левая панель: src/components/constructor/ConstructorSidebarPanel.jsx
- центральное превью: src/components/constructor/ConstructorPreviewPanel.jsx
- правая панель заказа: src/components/constructor/ConstructorOrderPanel.jsx
- вкладки: src/components/constructor/ConstructorTabsNav.jsx
- page-layer и сборка всего вместе: src/components/constructor/ConstructorPage.jsx
- app-level вход в страницу: src/App.jsx
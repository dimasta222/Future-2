# Памятка по правкам конструктора

Этот файл нужен как быстрый ориентир: если нужно поменять конкретную часть конструктора, сюда можно зайти и сразу понять, в какой файл идти.

## Если нужно поменять вкладки конструктора

Иди в:

- src/components/constructor/constructorConfig.js
  - если нужно изменить состав табов
  - если нужно переименовать вкладку
  - если нужно поменять порядок вкладок
  - если нужно добавить или убрать вкладку слоёв

- src/components/constructor/ConstructorTabsNav.jsx
  - если нужно поменять внешний вид табов
  - если нужно поменять кнопки, иконки, активное состояние

## Если нужно поменять левую панель

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять содержимое вкладок
  - если нужно поменять менеджер слоёв
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
  - если нужно поменять рендер слоя, его рамку, порядок или drag-поведение

Если нужно поменять сами данные для превью:

- src/hooks/useConstructorState.js
  - если нужно изменить, как собирается preview state

- src/shared/textilePreviewHelpers.js
  - если нужно изменить, как строится mockup SVG и preview helper-логика

- src/components/constructor/ConstructorPage.jsx
  - если нужно изменить, как preview builder подключается и передается в constructor hook

## Если нужно поменять правую панель заказа

Иди в:

- src/components/constructor/ConstructorOrderPanel.jsx
  - если нужно поменять внешний вид блока заказа
  - если нужно поменять сетку, выравнивание, подписи, цену, CTA

- src/hooks/useConstructorState.js
  - если нужно поменять, какие данные попадают в заказ
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

- src/App.jsx
  - проверь место, где shared helper'ы подключаются и передаются в buildConstructorProducts(...)

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
  - если нужно поменять UI текста: создание слоя, шрифт, цвет, градиенты, межстрочный интервал, обводку, тень, интервал и служебные действия активного текстового слоя
  - если нужно поменять primary CTA-кнопку создания текста, список текстовых слоёв, короткие превью текста у них и быстрые действия скрытия/удаления слоёв при редактировании
  - если нужно поменять пояснения про то, что ввод текста теперь идёт прямо на превью
  - если нужно поменять правило подписи text-layer: fallback «Текст N» до ввода и показ короткого текстового фрагмента после ввода
  - если нужно поменять активную левую панель под текстовыми слоями для режимов «Шрифт», «Цвет», «Интервалы» и «Эффекты»

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять toolbar быстрых текстовых действий над превью, включая palette-кнопку цвета, и его связь с левой панелью текста

- src/hooks/useConstructorState.js
  - если нужно поменять логику текста
  - если нужно поменять текстовые layer props
  - если нужно поменять выбор шрифта и дефолт text-layer
  - если нужно поменять solid/gradient режим заливки текста и переключение между ними
  - если нужно поменять ширину текстового блока и автоперенос
  - если нужно поменять межстрочный интервал, обводку и режимы тени текстового слоя
  - если нужно поменять межбуквенный интервал и выравнивание
  - если нужно поменять автоподстановку цвета текста при смене цвета футболки

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отрисовку текстового слоя на превью
  - если нужно поменять прямое редактирование текста прямо внутри слоя
  - если нужно поменять визуальные границы активного текстового блока
  - если нужно поменять drag-handles для изменения ширины текстового блока
  - если нужно поменять рендер solid/gradient заливки, обводки, тени и межстрочного интервала текста

- src/components/constructor/constructorConfig.js
  - если нужно поменять список предустановленных шрифтов
  - если нужно поменять набор solid colors и дефолтных gradient presets для текста
  - если нужно поменять font family или label для шрифтов
  - если нужно поменять то, как работает поиск, группировка и закрепление активного шрифта в списке

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять сброс поиска после выбора шрифта
  - если нужно поменять подсветку совпадения в найденных шрифтах
  - если нужно поменять поиск с учетом ошибочной раскладки клавиатуры
  - если нужно поменять навигацию по найденным шрифтам стрелками и Enter
  - если нужно поменять scrollable listbox списка шрифтов и автопрокрутку к активному результату
  - если нужно поменять переключение между текстовыми слоями по карточкам внутри вкладки «Текст»

## Если нужно поменять загрузку макета

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять UI загрузки
  - если нужно поменять кнопки удаления, центрирования, масштаба
  - если нужно поменять создание нового upload-слоя

- src/hooks/useConstructorState.js
  - если нужно поменять обработку файла
  - если нужно поменять drag-and-drop слоя
  - если нужно поменять clamp позиции слоя
  - если нужно поменять поведение масштаба upload-слоя

- src/components/constructor/constructorConfig.js
  - если нужно поменять чтение файла или определение размеров изображения

## Если нужно поменять источник данных для конструктора

Иди в:

- src/App.jsx
  - здесь собирается CONSTRUCTOR_PRODUCTS
  - здесь передаются shared helpers в buildConstructorProducts(...)

- src/shared/textileHelpers.js
  - здесь лежат базовые textile helper-функции, которые участвуют в сборке данных

- src/components/constructor/constructorConfig.js
  - если нужно менять уже constructor-specific сборку данных

## Если нужно поменять state-flow конструктора

Иди в:

- src/hooks/useConstructorState.js
  - это главный файл бизнес-логики конструктора
  - сюда идти, если нужно менять связи между выбором товара, цвета, размера, слоёв, пресетов и заказа

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
  - если нужно поменять grid-структуру: left panel / preview / order
  - если нужно переставить или заменить компоненты местами
  - если нужно поменять header страницы конструктора или то, какие общие зависимости она импортирует

- src/App.jsx
  - если нужно поменять только app-level вход в страницу конструктора
  - если нужно поменять, какие constructor-данные передаются в ConstructorPage

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
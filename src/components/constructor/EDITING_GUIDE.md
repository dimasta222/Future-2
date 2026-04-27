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
  - если нужно поменять UI текста, фигур или загрузки макета
  - если нужно поменять поля выбора товара, размера, цвета и количества

Если нужно не только поменять внешний вид, но и изменить поведение:

- src/hooks/useConstructorState.js
  - если логика выбора, сброса, синхронизации состояния, перестановки слоёв или preview-resize должна работать по-другому
  - здесь же меняется логика смены размера текстиля: max print-area label, clamp-лимиты и автоподгонка существующих слоёв под новый размер

## Если нужно поменять центральное превью

Иди в:

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение футболки
  - если нужно поменять переключение стороны печати
  - если нужно поменять отображение зоны печати
  - если нужно поменять рендер текста, фигур или макетов
  - если нужно поменять рамки слоя, порядок, drag-поведение, mouse marquee-selection по пустому месту превью или resize-handles на превью

Если нужно поменять сами данные для превью:

- src/hooks/useConstructorState.js
  - если нужно изменить preview state или интерактивность слоя

- src/shared/textilePreviewHelpers.js
  - если нужно изменить mockup SVG или общую preview helper-логику

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять, как preview builder, marquee-selection callbacks и preview props подключаются

## Если нужно поменять правую панель заказа

Иди в:

- src/components/constructor/ConstructorOrderPanel.jsx
  - если нужно поменять сетку, выравнивание, подписи, цену и CTA

- src/hooks/useConstructorState.js
  - если нужно поменять orderMeta
  - если нужно поменять summary по слоям
  - если нужно поменять расчёт стоимости футболки и печати по front/back
  - если нужно поменять правило определения формата печати по общему bounding box видимых слоёв стороны
  - если нужно поменять условие canSubmitOrder

- src/components/constructor/constructorConfig.js
  - если нужно поменять таблицу форматов печати и цены за формат
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
  - для oversize можно добавлять size-specific override-ы по каждому размеру отдельно, включая `mockupSrc`, координаты и физический размер печатной зоны
  - логика чтения этой конфигурации проходит через `resolveConstructorPrintArea(...)` и `resolveConstructorMockupSrc(...)`; цвет тоже участвует в выборе real mockup, поэтому новые oversize PNG можно подключать по одному размеру и по одному цвету без правок UI и state-flow

## Если нужно поменять фигуры

Иди в:

- src/components/constructor/constructorConfig.js
  - если нужно поменять категории фигур
  - если нужно добавить или изменить SVG shape-definition
  - если нужно поменять helper сборки SVG для shape-layer
  - если нужно поменять, как `cornerRoundness` определяет поддержку по shape-markup и как polygon-based/rect фигуры преобразуются в rounded rect/path
  - если нужно поменять состав каталога категорий, горизонтальных лент, tight-bounds геометрию SVG и логику внутренней обводки

- src/hooks/useConstructorState.js
  - если нужно поменять shape-layer props
  - если нужно поменять создание, дублирование, summary, размеры upload/shape в сантиметрах, библиотеку uploadedFiles, ручное добавление upload-layer из загруженного файла, line-shape размеры в логических px холста и их factual-конвертацию в сантиметры, геометрический minimum length линии от толщины/декора концов, endpoint-based line angle change с фиксацией противоположного конца, aspect-ratio фигуры при добавлении и ширинном resize, показ физического размера фигур из категории «Основные фигуры» по intrinsic-пропорциям SVG, расчет factual size активной фигуры по реальной preview-рамке внутри print-area, `cornerRoundness` и поддержку скругления углов у активной фигуры, выбор активной фигуры, стартовое смещение новых слоёв, привязку слоя к стороне «Спереди/Сзади» или параметры эффектов
  - стартовый активный режим в popover «Обводка» для line-shape тоже задаётся здесь: buildShapeLayer(...) и setShapeKey(...) берут его из `defaultLineStyle` выбранной линии
  - стартовая позиция нового text-layer задаётся в getLayerDefaultPosition(...): по умолчанию текст появляется немного выше центра print-area
  - стартовая ширина нового text-layer задаётся в buildTextLayer(...) и fallback-значениях normalize/derived state; сейчас это 60% ширины print-area
  - если нужно поменять поведение каталога фигур по умолчанию на добавление нового слоя или логику замены фигуры в активном shape-layer

- src/utils/constructor/resize/resizeShapeLayer.js
  - если нужно поменять resize фигуры на превью с опорой на противоположную сторону или угол: пропорциональное масштабирование за углы, деформацию по одной оси за средние маркеры и пересчёт внешней рамки вместе с геометрией фигуры

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять вкладку «Фигуры», overview-каталог категорий, отдельный экран выбранной категории, режимы add/replace и левые панели цвета/цвета обводки/эффектов

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять sticky shape-toolbar в верхнем слоте над превью, кнопку «Редактировать», визуальный индикатор replace-режима, показ toolbar для активной фигуры вне вкладки «Фигуры», временное открытие левой shape-панели поверх текущей вкладки, закрытие такой панели по крестику или клику в пустое место превью, якорение popover «Обводка», popover «Углы», line-shape диапазон толщины 1–100 px и переключение между режимами «Редактирование», «Цвет», «Цвет обводки» и «Эффекты"

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отображение shape-layer поверх футболки
  - если нужно поменять рендер падающей тени, двойного искажения или внутренней обводки фигуры
  - если нужно поменять внешнюю рамку shape-layer, которая расширяется под смещения эффектов и остаётся вплотную к реальной фигуре
  - если нужно поменять special-case для line-shape: скрытие активной контурной рамки, только левый/правый resize-handle и их центровку по линии, а также endpoint-based поворот линии при перетаскивании одного конца с фиксацией другого и маппинг lineWidthPx/lineHeightPx из логического холста в экранный размер превью
  - если нужно поменять поведение клика по пустому месту превью для снятия выделения и выхода из replace-режима фигуры
  - если нужно поменять показ слоёв только для активной стороны «Спереди/Сзади"
  - если нужно поменять перевод сантиметровых размеров слоя в экранный размер внутри physical print-area
  - если нужно поменять, как для активного text-layer считаются и показываются реальные размеры текста/текстового бокса в сантиметрах

- src/components/constructor/ConstructorTabsNav.jsx
  - если нужно поменять кнопку или иконку вкладки «Фигуры»

## Если нужно поменять текстовый слой

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять создание текста, список текстовых слоёв и быстрые действия над ними
  - если нужно поменять панели «Шрифт», «Цвет», «Интервалы» и «Эффекты»
  - если нужно поменять ручной ввод ширины/высоты текста в сантиметрах с зажатыми пропорциями (поля «Ш, см» / «В, см» в панели «Шрифт»)

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять sticky toolbar быстрых текстовых действий в верхнем слоте над превью, его показ вне вкладки «Текст» и временное открытие левой text-панели поверх текущей вкладки с закрытием по крестику или клику в пустое место превью
  - если нужно поменять, должна ли средняя preview-колонка оставаться в обычном потоке страницы или использовать sticky-позиционирование

- src/hooks/useConstructorState.js
  - если нужно поменять text-layer props и дефолты
  - если нужно поменять шрифты, solid/gradient режим заливки, перенос, межстрочный интервал, обводку, тень, межбуквенный интервал и выравнивание
  - если нужно поменять автоподстановку цвета текста при смене цвета футболки
  - если нужно поменять пропорциональное масштабирование текста по введённой ширине/высоте (`scaleActiveTextLayer`)

- src/components/constructor/ConstructorPreviewPanel.jsx
  - если нужно поменять отрисовку текстового слоя на превью
  - если нужно поменять прямое редактирование текста внутри слоя
  - если нужно поменять text box модель текста, drag-handles, перенос внутри контейнера, smart guides/snapping, preview delete-button и canva-подобный resize текста
  - здесь же считается factual size текста с учетом visual padding от эффектов и его clamp к физическим пределам print-area

- src/components/constructor/ConstructorPage.jsx
  - если нужно поменять удаление активного слоя или группы слоёв по Backspace/Delete, а также состав preview props

- src/components/constructor/constructorConfig.js
  - если нужно поменять список шрифтов, solid colors или gradient presets для текста

## Если нужно поменять загрузку макета

Иди в:

- src/components/constructor/ConstructorSidebarPanel.jsx
  - если нужно поменять UI загрузки
  - если нужно поменять список миниатюр «Загруженные файлы»
  - если нужно поменять кнопки «Добавить слой» и «Удалить» у загруженного файла
  - если нужно поменять блок размера активного upload-layer

- src/hooks/useConstructorState.js
  - если нужно поменять обработку файла
  - если нужно поменять persistent-хранение загруженных файлов до ручного удаления
  - если нужно поменять ручное создание upload-layer из уже загруженного файла
  - если нужно поменять drag-and-drop слоя
  - если нужно поменять clamp позиции или поведение масштаба upload-layer

- src/utils/constructor/resize/resizeImageLayer.js
  - если нужно поменять anchored resize upload-layer через угловые и боковые хендлы на превью

- src/components/constructor/constructorConfig.js
  - если нужно поменять чтение файла или определение размеров изображения

## Если нужно поменять source data конструктора

Иди в:

- src/App.jsx
  - здесь собираются constructor products

- src/shared/textileHelpers.js
  - здесь лежат базовые textile helper-функции, участвующие в сборке данных

- src/components/constructor/constructorConfig.js
  - если нужно менять constructor-specific сборку данных

## Если нужно поменять state-flow конструктора

Иди в:

- src/hooks/useConstructorState.js
  - это главный файл бизнес-логики конструктора
  - сюда идти, если нужно менять связи между выбором товара, цвета, размера, слоёв, фигур и заказа

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

## Если нужно добавить или изменить шрифт

Иди в:

- src/components/constructor/constructorConfig.js
  - раздел GOOGLE_FONT_TTF_MAP для добавления пути к новому TTF-файлу
  - если нужно добавить шрифт в PDF-экспорт, добавь запись вида `"FontName-weight": "/fonts/Google/FontName-weight.ttf"`

- public/fonts/Google/
  - сюда скачиваются TTF-файлы скриптом `scripts/download-constructor-fonts.mjs`
  - каждый файл автоматически импортируется в src/generated/localFonts.css

- src/generated/localFonts.css
  - автогенерируемый файл, не редактируй вручную
  - пересоздаётся при сборке скриптом `scripts/scan-fonts.mjs`

## Если нужно поменять экспорт в PDF

Иди в:

- src/utils/exportPrintPdf.js
  - если нужно изменить качество текста (сейчас 120 px/cm = 305 DPI)
  - если нужно изменить обработку шрифтов (Canvas Font Loading API, @font-face)
  - если нужно изменить обработку изображений (прямая передача в jsPDF без переконвертации)
  - если нужно изменить пропорции (используется mockupAspectRatio из constructorConfig)
  - если нужно добавить/убрать padding/margin вокруг текста

- src/components/constructor/constructorConfig.js
  - раздел CONSTRUCTOR_PRINT_AREAS с mockupAspectRatio для каждого типа товара
  - если нужно скорректировать пропорции PDF для конкретного типа товара

- src/utils/submitOrder.js
  - если нужно изменить, как PDF передаётся на сервер или локально скачивается
  - сюда же подключена сборка брендированной сводки `Заказ FUTURE.pdf`
    (см. `src/utils/constructorOrderPdf.js`) — она автоматически добавляется
    в `files` рядом с print-PDF, превью и оригиналами

- src/utils/constructorOrderPdf.js
  - брендированная PDF-сводка заказа (логотип, параметры, превью, состав, итог)
  - аналог `calcOrderPdf.js` для калькулятора, единый визуальный стиль
- app-level вход в страницу: src/App.jsx
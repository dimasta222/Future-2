# Конструктор футболок

Этот файл описывает текущую структуру конструктора и назначение файлов, которые были вынесены из App.jsx.

## Общая схема

Сейчас конструктор разделен на несколько уровней:

- App.jsx
  - подключает страницу конструктора
  - подготавливает products и preset prints
  - передает странице только данные конструктора и navigation callback
- ConstructorPage.jsx
  - page-layer конструктора
  - связывает hook состояния с UI-компонентами
  - собирает layout страницы конструктора
- useConstructorState.js
  - хранит все состояние конструктора
  - собирает derived-данные для превью и блока заказа
  - содержит handlers для выбора товара, цвета, загрузки макета и drag-and-drop
- shared textileHelpers.js
  - хранит общие textile-helper'ы
  - используется конструктором и остальной textile-логикой
- shared textilePreviewHelpers.js
  - хранит preview/gallery helper-кластер для футболок
  - используется конструктором и textile-превью
- constructorConfig.js
  - хранит constructor-specific конфиг и утилиты
  - собирает список товаров конструктора
  - создает готовые принты
  - формирует Telegram-ссылку заказа
- UI-компоненты в папке constructor
  - каждый отвечает только за свой визуальный блок

## Файлы и ответственность

### App.jsx

Роль:

- точка входа страницы конструктора на уровне приложения
- готовит constructor products и preset prints
- передает в ConstructorPage только данные конструктора

Что осталось здесь по конструктору:

- создание CONSTRUCTOR_PRODUCTS
- создание CONSTRUCTOR_PRESET_PRINTS
- подключение ConstructorPage
- передача styles, logo-компонента и navigation callback

### components/constructor/ConstructorPage.jsx

Роль:

- отдельный page-layer для конструктора
- связывает useConstructorState.js с presentational-компонентами
- держит layout страницы вне App.jsx

Что находится здесь:

- вызов useConstructorState(...)
- buildPreviewSrc для mockup-превью
- сборка layout из tabs, sidebar, preview и order panel
- подключение onBack, LogoMini и общих app styles

Идея:

- App.jsx остается orchestration-слоем приложения
- constructor page orchestration живет рядом с constructor UI и сам импортирует свои общие зависимости

### hooks/useConstructorState.js

Роль:

- основной state layer конструктора
- единое место для constructor-state, derived values и handlers

Что хранится внутри:

- активный таб
- выбранный текстиль
- сторона печати
- цвет
- размер
- количество
- массив слоёв
- активный слой
- порядок слоёв
- видимость и блокировка слоёв
- масштаб и позиция активного слоя
- состояние drag-and-drop для активного слоя
- шрифт и семейство для текстового слоя
- ширина текстового блока с автопереносом по умолчанию и изменением через handles в превью
- межстрочный интервал, обводка и режимы тени текстового слоя
- межбуквенный интервал и выравнивание текстового слоя

Что считает внутри:

- текущий product
- print area
- preview source
- текущую цену
- order meta
- telegram link
- сводку по слоям для заказа

Что обрабатывает внутри:

- смену товара
- смену цвета
- создание нового текстового слоя с заметной primary CTA-кнопкой во вкладке текста
- создание нового текстового слоя с пустым содержимым и немедленным показом на превью
- переключение между текстовыми слоями кликом по карточке слоя во вкладке текста или прямо по тексту в превью
- прямое редактирование текста прямо в слое на превью вместо отдельного textarea в левой панели
- быстрое скрытие и повторное отображение отдельных текстовых слоёв прямо во вкладке текста для удобного редактирования перекрывающихся слоёв
- быстрое удаление отдельных текстовых слоёв прямо во вкладке текста
- toolbar быстрых текстовых действий над превью с выбором шрифта, отдельной palette-кнопкой цвета, размером, выравниванием и переключением панелей «Интервалы»/«Эффекты»
- выбор цвета текста через три секции: свободный picker + HEX, готовые сплошные цвета и дефолтные градиенты
- создание нового слоя-принта
- выбор шрифта для текстового слоя с локальным поиском, исправлением ошибочной раскладки, клавиатурной навигацией, очисткой запроса, scrollable listbox-списком, автопрокруткой к активному результату и закреплением активного шрифта сверху
- показ только одной активной панели настроек под текстовыми слоями вместо длинного непрерывного списка
- показ короткого фрагмента текста у текстовых слоёв в менеджере слоёв и в списке текстовых слоёв, а до ввода текста сохранение fallback-подписи вида «Текст N»
- настройку ширины текстового блока и автопереноса через handles в превью
- настройку межстрочного интервала, обводки и мягкой/жёсткой тени текста
- настройку межбуквенного интервала и выравнивания текста
- загрузку файла
- чтение размеров загруженного изображения
- масштабирование активного слоя
- удаление слоя
- дублирование слоя
- смену порядка слоёв
- переключение видимости и блокировки
- pointer drag активного слоя
- возврат активного слоя в центр

Идея:

- UI-компоненты не должны знать внутреннюю механику конструктора
- они получают уже готовые props и вызывают callbacks

### shared/textileHelpers.js

Роль:

- общий доменный модуль текстиля
- место для reusable textile-helper'ов, которые не должны жить внутри App.jsx

Что находится здесь:

- parseColorOptions(...)
- getDefaultTshirtColor(...)
- resolveColorSwatch(...)
- normalizeColorName(...)
- normalizeVariantLabel(...)
- getTshirtSizes(...)
- parsePriceValue(...)

Идея:

- конструктор и textile-страницы используют один общий слой helper-функций
- это снижает связность App.jsx и делает границы ответственности понятнее

### shared/textilePreviewHelpers.js

Роль:

- общий модуль textile preview/gallery helper'ов
- место для SVG preview builder и gallery asset logic, которые не должны жить в App.jsx

Что находится здесь:

- svgToDataUri(...)
- buildOrderedGalleryCandidates(...)
- resolveHomepageTshirtPreview(...)
- preloadHomepageTshirtPreview(...)
- loadImageCandidate(...)
- buildTshirtMockupSvg(...)
- buildHomepageTshirtPlaceholderSvg(...)
- buildTshirtFallbackSlides(...)

Идея:

- preview и gallery helper'ы образуют отдельный shared-кластер
- constructor preview builder теперь зависит от shared preview module, а не от локальных функций в App.jsx

### components/constructor/constructorConfig.js

Роль:

- модуль constructor-specific конфигурации и утилит

Что находится здесь:

- CONSTRUCTOR_PRINT_AREAS
  - зоны печати для разных моделей футболок
- CONSTRUCTOR_TABS
  - список табов левой панели, включая вкладку слоёв
- buildConstructorProducts(...)
  - собирает плоский массив товаров конструктора из каталога текстиля
- createConstructorPresetPrints(...)
  - создает набор готовых принтов
- buildConstructorTelegramLink(...)
  - формирует сообщение и ссылку для Telegram с перечислением всех слоёв
- CONSTRUCTOR_TEXT_FONTS и getConstructorTextFont(...)
  - задают набор предустановленных шрифтов для текстовых слоёв, который используется в поиске, группировке и выборе шрифта
- CONSTRUCTOR_TEXT_SOLID_COLORS, CONSTRUCTOR_TEXT_GRADIENTS и getConstructorTextGradient(...)
  - задают набор solid colors и градиентов для текстового слоя
- readFileAsDataUrl(...)
  - читает загруженный файл как data URL
- readImageSize(...)
  - получает размеры изображения

Идея:

- все, что относится именно к конструктору как к модулю, лучше держать здесь
- это упрощает поддержку отдельного page-layer конструктора

### components/constructor/ConstructorTabsNav.jsx

Роль:

- верхняя навигация по табам конструктора

Что делает:

- показывает список вкладок
- отображает активную вкладку
- вызывает onTabChange при переключении

Что не делает:

- не хранит состояние
- не знает ничего про товар, цену, файл, текст или порядок слоёв

### components/constructor/ConstructorSidebarPanel.jsx

Роль:

- левая панель конструктора

Что делает:

- показывает содержимое активного таба
- рендерит блоки:
  - слои
  - текстиль
  - загрузка макета
  - текст
  - готовые принты

Что получает через props:

- текущий активный таб
- список товаров
- выбранный товар
- размер, цвет, количество
- список слоёв
- активный слой
- состояние активного upload/text/preset слоя
- callbacks для всех действий пользователя
- выбранный font-family для текстового слоя

Что не делает:

- не хранит бизнес-логику
- не вычисляет цену
- не формирует заказ

### components/constructor/ConstructorPreviewPanel.jsx

Роль:

- центральная панель предпросмотра

Что делает:

- показывает превью футболки
- отображает сторону печати
- рисует область печати
- отображает поверх превью все видимые слои в текущем порядке
- применяет font-family активного текстового слоя в рендере
- подсвечивает активный слой
- показывает визуальную рамку активного текстового блока с подписью ширины и переноса
- позволяет менять ширину активного текстового блока мышкой прямо в превью
- рендерит line-height, stroke и shadow для текстового слоя
- прокидывает pointer events для drag-and-drop активного слоя

Что не делает:

- не хранит состояние выбора товара
- не считает заказ

### components/constructor/ConstructorOrderPanel.jsx

Роль:

- правая панель заказа

Что делает:

- показывает итоговую цену
- показывает параметры выбранной конфигурации
- показывает декоративные элементы заказа
- дает ссылку для отправки заказа в Telegram

Что не делает:

- не знает, как формируется заказ внутри
- получает уже готовые orderMeta и telegramLink

## Поток данных

Схема упрощенно выглядит так:

1. App.jsx собирает constructor products и preset prints
2. App.jsx рендерит ConstructorPage.jsx и передает app-level зависимости
3. ConstructorPage.jsx вызывает useConstructorState(...)
4. Hook возвращает:
   - state
   - derived values
   - handlers
5. ConstructorPage.jsx раздает эти данные в:
   - ConstructorTabsNav
   - ConstructorSidebarPanel
   - ConstructorPreviewPanel
   - ConstructorOrderPanel

Идея разделения:

- состояние и логика живут в hook
- конфиг и helper-функции живут в constructorConfig.js
- визуальные части живут в отдельных UI-компонентах
- текст, принты и загруженные макеты собраны в единую модель слоёв

## Зачем это разделение

Что это дает:

- App.jsx становится заметно проще читать
- легче искать хвосты и мертвый код
- проще править отдельные части конструктора без риска сломать весь экран
- проще тестировать constructor page отдельно от корневого App.jsx
- проще понимать границы ответственности каждого файла

## Что еще можно вынести дальше

Следующие естественные шаги, если будем продолжать:

- развивать эффекты и дополнительные пресеты поверх текстовых слоёв
- при необходимости вынести layer helpers в отдельный constructor-модуль

## Короткая карта файлов

- src/App.jsx
  - app-level вход в конструктор
- src/components/constructor/ConstructorPage.jsx
  - page-layer конструктора
- src/hooks/useConstructorState.js
  - состояние и логика конструктора
- src/shared/textileHelpers.js
  - общие textile helper-функции
- src/shared/textilePreviewHelpers.js
  - общие preview/gallery helper-функции
- src/components/constructor/constructorConfig.js
  - constructor config и constructor helpers
- src/components/constructor/ConstructorTabsNav.jsx
  - табы
- src/components/constructor/ConstructorSidebarPanel.jsx
  - левая панель
- src/components/constructor/ConstructorPreviewPanel.jsx
  - центральное превью
- src/components/constructor/ConstructorOrderPanel.jsx
  - правая панель заказа
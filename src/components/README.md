# Components

Эта папка хранит UI-компоненты и page-section блоки, которые были вынесены из App.jsx и других крупных экранов, чтобы снизить связность и упростить поддержку.

## Документация папки

- `src/components/README.md`
	- общее описание папки и навигация
- `src/components/constructor/README.md`
	- отдельная документация конструктора футболок
- `src/components/constructor/EDITING_GUIDE.md`
	- практическая памятка по правкам конструктора
- `src/components/constructor/TECHNICAL_MAP.md`
	- техническая карта конструктора

## Назначение папки

- вынос визуальных и section-level блоков из `src/App.jsx`
- разделение homepage на самостоятельные переиспользуемые компоненты
- отделение UI-компонентов от shared helper-модулей
- сохранение App.jsx как orchestration-слоя приложения

## Навигация

### HeroSection.jsx

Файл: `src/components/HeroSection.jsx`

Отвечает за:

- hero-блок главной страницы
- главный оффер, CTA-кнопки и hero-статистику
- визуальную сборку верхнего экрана

Используется, когда нужно:

- менять первый экран главной страницы
- менять hero CTA или тексты оффера

### PricingSection.jsx

Файл: `src/components/PricingSection.jsx`

Отвечает за:

- секцию цен на главной странице
- табы между форматами и погонными метрами
- отображение pricing-таблиц и pricing-notes

Используется, когда нужно:

- менять секцию стоимости
- менять layout таблиц цен

### ReviewsSection.jsx

Файл: `src/components/ReviewsSection.jsx`

Отвечает за:

- секцию отзывов на главной странице
- карточки отзывов и ссылку на отзывы в Яндекс Картах

Используется, когда нужно:

- менять блок отзывов
- менять оформление review-карточек

### ContactSection.jsx

Файл: `src/components/ContactSection.jsx`

Отвечает за:

- контактную секцию главной страницы
- форму заявки и контактные карточки

Используется, когда нужно:

- менять контактный блок
- менять форму отправки заявки

### HomeTshirtsSection.jsx

Файл: `src/components/HomeTshirtsSection.jsx`

Отвечает за:

- секцию футболок на главной странице
- сетку карточек и CTA для перехода в каталог и конструктор

Используется, когда нужно:

- менять homepage-блок с футболками
- менять логику сборки сетки карточек

### MainTshirtCard.jsx

Файл: `src/components/MainTshirtCard.jsx`

Отвечает за:

- карточку футболки в homepage showcase
- выбор плотности и цвета
- preview изображения и размерный ряд

Используется, когда нужно:

- менять поведение карточки футболки на главной
- менять preview или controls внутри карточки

### ProductCard.jsx

Файл: `src/components/ProductCard.jsx`

Отвечает за:

- карточку товара в textile-каталоге
- выбор варианта, размера, цвета и количества
- переход в Telegram-заказ или добавление футболки в локальный заказ

Используется, когда нужно:

- менять карточки товаров на textile-страницах
- менять UI выбора параметров и CTA внутри catalogue card

### MainNavigation.jsx

Файл: `src/components/MainNavigation.jsx`

Отвечает за:

- верхнюю навигацию сайта
- desktop nav, textile dropdown и mobile menu
- быстрые действия перехода в калькулятор и конструктор

Используется, когда нужно:

- менять шапку сайта
- менять мобильную навигацию
- менять dropdown Текстиль

### FieldRow.jsx

Файл: `src/components/FieldRow.jsx`

Отвечает за:

- единый layout строки поля с label и content-зоной

Используется, когда нужно:

- переиспользовать одинаковую строку поля в карточках и селекторах

### TextileSelectors.jsx

Файл: `src/components/TextileSelectors.jsx`

Отвечает за:

- кластер локальных textile-селекторов
- выбор размера, цвета и количества в карточках текстиля

Используется, когда нужно:

- менять UI-контролы выбора в ProductCard
- переиспользовать size/color/qty selectors вне `src/App.jsx`

### TshirtSizeGuideTable.jsx

Файл: `src/components/TshirtSizeGuideTable.jsx`

Отвечает за:

- таблицу размерной сетки футболок
- visual layout строк и колонок в модалке размеров

Используется, когда нужно:

- менять отображение таблицы размеров
- переиспользовать таблицу размерной сетки вне `src/App.jsx`

### TshirtPhotoGallery.jsx

Файл: `src/components/TshirtPhotoGallery.jsx`

Отвечает за:

- gallery preview футболки в карточке текстиля
- загрузку реальных preview-slides и fallback-слайдов
- открытие gallery modal через callback `onOpen`

Используется, когда нужно:

- менять preview-галерею футболки
- менять fallback-логику слайдов
- менять поведение открытия gallery modal

### TshirtSizeGuideModal.jsx

Файл: `src/components/TshirtSizeGuideModal.jsx`

Отвечает за:

- модалку размерной сетки футболок
- layout окна, фон overlay и рендер секций size guide

Используется, когда нужно:

- менять модалку размеров
- менять layout блока размерной сетки без правок в `TextilePage`

### TshirtSizeGuideTrigger.jsx

Файл: `src/components/TshirtSizeGuideTrigger.jsx`

Отвечает за:

- banner-trigger открытия размерной сетки на textile-странице
- визуальный CTA-блок перед заказом футболок

Используется, когда нужно:

- менять блок открытия размерной сетки
- менять текст и оформление CTA для size guide

### TshirtGalleryModal.jsx

Файл: `src/components/TshirtGalleryModal.jsx`

Отвечает за:

- полноэкранную gallery modal для футболок
- отображение активного слайда и сетки миниатюр
- визуальный слой modal overlay для gallery preview

Используется, когда нужно:

- менять modal просмотра фото изделия
- менять layout миниатюр и fullscreen-просмотра

### TshirtOrderFlyingBadge.jsx

Файл: `src/components/TshirtOrderFlyingBadge.jsx`

Отвечает за:

- flying badge анимацию при добавлении футболки в заказ
- визуальный слой перелёта карточки к summary-блоку корзины

Используется, когда нужно:

- менять анимационный badge добавления в заказ
- менять визуальный вид flying cart feedback

### LogoFull.jsx

Файл: `src/components/LogoFull.jsx`

Отвечает за:

- полный SVG-логотип FUTURE STUDIO

### LogoMini.jsx

Файл: `src/components/LogoMini.jsx`

Отвечает за:

- компактный вариант логотипа для навигации и внутренних страниц

### CalcIcon.jsx

Файл: `src/components/CalcIcon.jsx`

Отвечает за:

- иконку калькулятора для CTA и pricing-кнопок

### Stars.jsx

Файл: `src/components/Stars.jsx`

Отвечает за:

- визуальный блок со звёздами рейтинга

### TG.jsx

Файл: `src/components/TG.jsx`

Отвечает за:

- Telegram-иконку

### WA.jsx

Файл: `src/components/WA.jsx`

Отвечает за:

- WhatsApp-иконку

### constructor/

Папка: `src/components/constructor/`

Отвечает за:

- отдельный модуль конструктора футболок
- constructor page-layer, UI-блоки и документацию по конструктору

Смотри отдельно:

- `src/components/constructor/README.md`
- `src/components/constructor/EDITING_GUIDE.md`
- `src/components/constructor/TECHNICAL_MAP.md`

## Как понимать границы папки

Сюда стоит класть:

- UI-компоненты
- section-компоненты главной страницы
- локальные page-level visual blocks
- иконки и logo components

Сюда не стоит класть:

- shared helper-функции
- domain utility-модули
- page orchestration logic уровня `src/App.jsx`

## Куда идти в зависимости от задачи

- если меняется hero главной: `src/components/HeroSection.jsx`
- если меняется шапка сайта: `src/components/MainNavigation.jsx`
- если меняется homepage showcase футболок: `src/components/HomeTshirtsSection.jsx`
- если меняется карточка футболки: `src/components/MainTshirtCard.jsx`
- если меняется карточка товара textile-каталога: `src/components/ProductCard.jsx`
- если меняется shared field layout: `src/components/FieldRow.jsx`
- если меняются size/color/qty selectors текстиля: `src/components/TextileSelectors.jsx`
- если меняется таблица размерной сетки: `src/components/TshirtSizeGuideTable.jsx`
- если меняется preview-галерея футболки: `src/components/TshirtPhotoGallery.jsx`
- если меняется модалка размерной сетки: `src/components/TshirtSizeGuideModal.jsx`
- если меняется CTA-блок открытия размерной сетки: `src/components/TshirtSizeGuideTrigger.jsx`
- если меняется полноэкранная gallery modal: `src/components/TshirtGalleryModal.jsx`
- если меняется flying badge добавления в заказ: `src/components/TshirtOrderFlyingBadge.jsx`
- если меняется только конструктор: `src/components/constructor/`

## Если папка вырастет

При добавлении новых компонентов в `src/components` обновляй этот README:

- добавляй краткое описание каждого нового файла
- обновляй навигацию по компонентам
- фиксируй, что относится к общему UI, а что к constructor-only слою
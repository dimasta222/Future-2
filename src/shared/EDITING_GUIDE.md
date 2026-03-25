# Памятка по правкам shared-модулей

Этот файл нужен как быстрый ориентир: если нужно поменять конкретную shared-логику, сюда можно зайти и сразу понять, в какой файл идти.

## Если нужно поменять общую textile-логику

Иди в:

- src/shared/textileHelpers.js
  - если нужно поменять парсинг цветов
  - если нужно поменять дефолтный цвет футболки
  - если нужно поменять нормализацию названий цветов
  - если нужно поменять swatch-данные цветов
  - если нужно поменять размеры футболок
  - если нужно поменять парсинг цены
  - если нужно поменять нормализацию label вариантов

## Если нужно поменять превью или gallery helper'ы футболок

Иди в:

- src/shared/textilePreviewHelpers.js
  - если нужно поменять fallback slides
  - если нужно поменять SVG mockup футболки
  - если нужно поменять homepage placeholder SVG
  - если нужно поменять загрузку реальных фото из public
  - если нужно поменять preview asset mapping
  - если нужно поменять preload preview-изображений

## Если нужно поменять общие app styles

Иди в:

- src/shared/appStyles.js
  - если нужно поменять общий CSS string приложения
  - если нужно поменять utility-классы, mobile/nav/layout rules
  - если нужно убрать style-константы из page-level файлов или переиспользовать их в новых экранах

## Если нужно поменять место использования shared textile-helper'ов

Иди в:

- src/App.jsx
  - если нужно поменять, как shared helper'ы подключаются
  - если нужно поменять, куда они передаются
  - если нужно поменять, где shared-модули подключаются на app-level

- src/components/constructor/constructorConfig.js
  - если нужно поменять, как shared helper'ы используются при сборке constructor products

## Если нужно понять, shared ли это вообще

Смотри в:

- src/shared/README.md
  - если нужно понять, подходит ли логика для папки shared

- src/shared/TECHNICAL_MAP.md
  - если нужно быстро проверить границы ответственности и зависимости

## Что стоит класть в src/shared

- domain helper-функции
- utility-модули, которые нужны нескольким частям приложения
- код без привязки к конкретному UI-компоненту

## Что не стоит класть в src/shared

- constructor-only config
- page-specific orchestration logic
- React UI-компоненты
- код, который нужен только одному экрану и больше нигде не переиспользуется

## Если нужно быстро понять, куда идти

Коротко:

- общая textile-логика: src/shared/textileHelpers.js
- preview и gallery helper'ы: src/shared/textilePreviewHelpers.js
- общие app styles: src/shared/appStyles.js
- описание папки: src/shared/README.md
- техническая схема shared-слоя: src/shared/TECHNICAL_MAP.md
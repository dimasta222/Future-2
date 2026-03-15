# Future Studio

Сайт студии DTF-печати на `React + Vite`.

## Запуск

- Установка зависимостей: `npm install`
- Режим разработки: `npm run dev`
- Production build: `npm run build`

## GitHub: первая настройка и автосинхронизация

В проект уже добавлены команды для быстрой выгрузки и загрузки изменений:

- `npm run git:sync -- "ваш комментарий"` — добавить изменения, сделать commit и отправить их в GitHub
- `npm run git:update` — забрать изменения из GitHub через `pull --rebase`
- `npm run git:status` — быстрый статус репозитория

### Первый запуск GitHub-репозитория

1. Создайте пустой репозиторий на GitHub.
2. Инициализируйте локальный git, если он ещё не создан:

	```bash
	git init -b main
	```

3. Подключите GitHub-репозиторий как `origin`:

	```bash
	git remote add origin https://github.com/ВАШ-ЛОГИН/ИМЯ-РЕПОЗИТОРИЯ.git
	```

4. Отправьте проект:

	```bash
	npm run git:sync -- "Первичная загрузка проекта"
	```

После этого для работы обычно достаточно двух команд:

- выгрузка в GitHub: `npm run git:sync -- "описание изменений"`
- загрузка из GitHub: `npm run git:update`

## Фото футболок

Фото футболок теперь хранятся отдельно в `public/tshirts/` и подтягиваются в карточки автоматически.

### Актуальная структура

- `public/tshirts/oversize/180/` — фото оверсайз футболок `180 г/м²`
- `public/tshirts/oversize/240/` — фото оверсайз футболок `240 г/м²`
- `public/tshirts/classic/180/` — фото базовых футболок `180 г/м²`

Примеры цветовых папок:

- `public/tshirts/oversize/180/pink/`
- `public/tshirts/oversize/180/dark-gray/`
- `public/tshirts/oversize/180/melange/`
- `public/tshirts/oversize/240/black/`
- `public/tshirts/oversize/240/white/`
- `public/tshirts/oversize/240/pink/`
- `public/tshirts/oversize/240/beige/`
- `public/tshirts/classic/180/black/`
- `public/tshirts/classic/180/white/`

### Как загружать фото

Фото не привязаны к типу кадра. Галерея берёт их просто по порядку файлов:

- `1.jpg` или `01.jpg`
- `2.jpg` или `02.jpg`
- `3.jpg` или `03.jpg`

И так далее, до `12` изображений в одной папке.

Поддерживаются форматы:

- `jpg`
- `jpeg`
- `png`
- `webp`
- `avif`

Чтобы поменять порядок в карусели, достаточно переименовать файлы.

### Как галерея выбирает фото

- для оверсайз сначала ищутся фото в папке нужной плотности и цвета
- для базовых футболок используются папки `classic/180/<color>/`
- если реальных фото нет, сайт показывает графическую заглушку

## Как устроено портфолио

Портфолио больше не хранится огромным массивом внутри JSX.

- Данные лежат в [src/data/portfolio.js](src/data/portfolio.js)
- Изображения лежат в `public/portfolio/<slug-категории>/...`
- Страница каталога собирается из данных в [src/portfolio/PortfolioCatalogPage.jsx](src/portfolio/PortfolioCatalogPage.jsx)

## Как добавить новую категорию

1. Создайте папку в `public/portfolio/`, например `public/portfolio/hudi/`
2. Добавьте новый объект в массив `PORTFOLIO_SECTIONS` в [src/data/portfolio.js](src/data/portfolio.js)

Пример:

```js
{
	category: "Худи",
	slug: "hudi",
	items: [
		{
			label: "Oversize hoodie",
			image: "/portfolio/hudi/01-oversize-hoodie.jpg"
		}
	]
}
```

## Как добавить новую работу в существующую категорию

1. Положите файл в нужную папку внутри `public/portfolio/`
2. Найдите нужную категорию в [src/data/portfolio.js](src/data/portfolio.js)
3. Добавьте объект в `items`

Пример:

```js
{
	label: "Новый принт",
	image: "/portfolio/futbolki/31-noviy-print.jpg"
}
```

## Если изображения пока нет

Можно показать карточку без фотографии через градиент:

```js
{
	label: "Скоро в портфолио",
	gradient: "linear-gradient(135deg,#e84393,#6c5ce7)"
}
```

## Проверка после изменений

После добавления новых работ достаточно выполнить `npm run build` и убедиться, что сборка проходит без ошибок.

## Подготовка фото для сайта

Если у вас есть исходные фотографии в хорошем качестве, не кладите их в сайт как есть. Сначала подготовьте веб-версии:

- рекомендуемый размер: `1200–1600 px` по длинной стороне
- рекомендуемый вес: примерно `120–350 KB` на фото
- безопасный формат для текущего проекта: `jpg`

В проект добавлен скрипт подготовки изображений:

```bash
npm run portfolio:prepare -- --input ./portfolio-source --output ./public/portfolio
```

Что делает скрипт:

- рекурсивно обходит все картинки в папке-источнике
- сохраняет структуру подпапок
- уменьшает изображения без растягивания
- конвертирует их в нужный формат для сайта

Полезные опции:

```bash
npm run portfolio:prepare -- --input ./portfolio-source --output ./public/portfolio --format jpg --width 1600 --height 1600 --quality 82
```

Предпросмотр без записи файлов:

```bash
npm run portfolio:prepare -- --input ./portfolio-source --dry-run
```

Если хотите просто заменить текущие фото без правок в [src/data/portfolio.js](src/data/portfolio.js), используйте формат `jpg` и те же имена файлов.

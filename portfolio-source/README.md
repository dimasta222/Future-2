# Папка с исходниками портфолио

Сюда кладутся ОРИГИНАЛЫ или большие версии фотографий перед подготовкой для сайта.

Структура папок уже совпадает с категориями сайта:

- `portfolio-source/futbolki/`
- `portfolio-source/shoppery/`
- `portfolio-source/brelki/`
- `portfolio-source/sportivnaya-forma/`

Важно:

- если хотите просто заменить текущие фото без правок в `src/data/portfolio.js`, сохраняйте те же имена файлов;
- лучше использовать большие исходники, а не маленькие превью;
- оптимизированные версии будут записаны в `public/portfolio/`.

Команда подготовки:

```bash
npm run portfolio:prepare -- --input ./portfolio-source --output ./public/portfolio --format jpg --width 1600 --height 1600 --quality 82
```

Предпросмотр без записи файлов:

```bash
npm run portfolio:prepare -- --input ./portfolio-source --dry-run
```

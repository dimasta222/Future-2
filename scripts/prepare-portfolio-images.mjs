#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

for (const stream of [process.stdout, process.stderr]) {
  stream.on("error", (error) => {
    if (error.code === "EPIPE") {
      process.exit(0);
    }
    throw error;
  });
}

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"]);

function printHelp() {
  console.log(`
Подготовка изображений портфолио

Использование:
  npm run portfolio:prepare -- --input ./portfolio-source --output ./public/portfolio

Опции:
  --input <path>         Папка с исходниками (обязательно)
  --output <path>        Куда складывать подготовленные файлы (по умолчанию: ./public/portfolio)
  --format <jpg|webp|png> Формат результата (по умолчанию: jpg)
  --width <number>       Максимальная ширина (по умолчанию: 1600)
  --height <number>      Максимальная высота (по умолчанию: 1600)
  --quality <number>     Качество 1-100 (по умолчанию: 82)
  --skip-existing        Не перезаписывать уже существующие файлы
  --dry-run              Только показать, что будет сделано
  --help                 Показать справку

Рекомендация:
  Для сайта с текущими путями в src/data/portfolio.js оставляйте формат jpg,
  тогда можно просто заменить файлы в public/portfolio без правок кода.
`);
}

function parseArgs(argv) {
  const options = {
    output: "./public/portfolio",
    format: "jpg",
    width: 1600,
    height: 1600,
    quality: 82,
    dryRun: false,
    skipExisting: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-existing") {
      options.skipExisting = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Неизвестный аргумент: ${arg}`);
    }

    const value = argv[index + 1];
    if (value == null || value.startsWith("--")) {
      throw new Error(`Для ${arg} нужно указать значение`);
    }

    index += 1;

    if (arg === "--input") options.input = value;
    else if (arg === "--output") options.output = value;
    else if (arg === "--format") options.format = value.toLowerCase();
    else if (arg === "--width") options.width = Number(value);
    else if (arg === "--height") options.height = Number(value);
    else if (arg === "--quality") options.quality = Number(value);
    else throw new Error(`Неизвестная опция: ${arg}`);
  }

  return options;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectImages(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImages(fullPath));
      continue;
    }

    if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function getOutputExtension(format) {
  if (format === "jpg" || format === "jpeg") return ".jpg";
  if (format === "webp") return ".webp";
  if (format === "png") return ".png";
  throw new Error(`Неподдерживаемый формат: ${format}`);
}

function createTransformer(image, format, quality) {
  if (format === "jpg" || format === "jpeg") {
    return image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true, progressive: true });
  }
  if (format === "webp") {
    return image.webp({ quality, effort: 5 });
  }
  if (format === "png") {
    const pngQuality = Math.min(Math.max(quality, 1), 100);
    return image.png({ compressionLevel: 9, quality: pngQuality });
  }
  throw new Error(`Неподдерживаемый формат: ${format}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.input) {
    throw new Error("Нужно указать --input <path>");
  }

  if (!["jpg", "jpeg", "webp", "png"].includes(options.format)) {
    throw new Error("Формат должен быть jpg, webp или png");
  }

  if (!Number.isFinite(options.width) || options.width <= 0) {
    throw new Error("--width должен быть положительным числом");
  }
  if (!Number.isFinite(options.height) || options.height <= 0) {
    throw new Error("--height должен быть положительным числом");
  }
  if (!Number.isFinite(options.quality) || options.quality < 1 || options.quality > 100) {
    throw new Error("--quality должен быть числом от 1 до 100");
  }

  const inputDir = path.resolve(options.input);
  const outputDir = path.resolve(options.output);

  const inputExists = await fileExists(inputDir);
  if (!inputExists) {
    throw new Error(`Папка с исходниками не найдена: ${inputDir}`);
  }

  const images = await collectImages(inputDir);
  if (!images.length) {
    console.log("Подходящие изображения не найдены.");
    return;
  }

  const outputExtension = getOutputExtension(options.format);

  let processedCount = 0;
  let skippedCount = 0;
  let sourceBytes = 0;
  let resultBytes = 0;

  console.log(`Найдено изображений: ${images.length}`);
  console.log(`Режим: ${options.dryRun ? "dry-run" : "запись файлов"}`);

  for (const sourcePath of images) {
    const relativePath = path.relative(inputDir, sourcePath);
    const targetRelativePath = relativePath.replace(path.extname(relativePath), outputExtension);
    const targetPath = path.join(outputDir, targetRelativePath);

    if (options.skipExisting && await fileExists(targetPath)) {
      skippedCount += 1;
      console.log(`SKIP ${targetRelativePath}`);
      continue;
    }

    const sourceStat = await fs.stat(sourcePath);
    sourceBytes += sourceStat.size;

    const pipeline = sharp(sourcePath)
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        fit: "inside",
        withoutEnlargement: true,
      });

    const transformed = createTransformer(pipeline, options.format, options.quality);

    if (options.dryRun) {
      const metadata = await sharp(sourcePath).metadata();
      console.log(`PLAN ${relativePath} -> ${targetRelativePath} (${metadata.width || "?"}x${metadata.height || "?"})`);
      processedCount += 1;
      continue;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const outputInfo = await transformed.toFile(targetPath);
    resultBytes += outputInfo.size ?? 0;
    processedCount += 1;

    console.log(`OK   ${targetRelativePath} -> ${outputInfo.width}x${outputInfo.height}, ${formatBytes(outputInfo.size ?? 0)}`);
  }

  console.log("\nГотово:");
  console.log(`- Обработано: ${processedCount}`);
  console.log(`- Пропущено: ${skippedCount}`);
  if (!options.dryRun) {
    console.log(`- Исходный объём: ${formatBytes(sourceBytes)}`);
    console.log(`- Результат: ${formatBytes(resultBytes)}`);
  }
}

main().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
});

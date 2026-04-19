/**
 * Конвертирует все JPG/PNG/JPEG в public/portfolio/ → WebP.
 * - Ресайз до макс. 1600px по длинной стороне
 * - WebP quality 82 (хороший баланс размер/качество)
 * - Удаляет оригинал после успешной конвертации
 * - Переименовывает файлы: пробелы → дефис, (1) → убирает, lowercase
 *
 * Запуск:  node scripts/convert-portfolio-webp.mjs
 */

import { readdirSync, statSync, unlinkSync, renameSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_DIR = join(__dirname, "..", "public", "portfolio");
const MAX_SIDE = 1600;
const WEBP_QUALITY = 82;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"]);

function collectImages(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectImages(full));
    } else if (IMAGE_EXTS.has(extname(entry).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

function cleanFilename(name) {
  return name
    .replace(/\s*\(\d+\)\s*/g, "")  // remove (1), (2) etc
    .replace(/\s+/g, "-")
    .toLowerCase();
}

async function convertOne(filePath) {
  const dir = dirname(filePath);
  const rawName = basename(filePath, extname(filePath));
  const cleanName = cleanFilename(rawName);
  const outPath = join(dir, `${cleanName}.webp`);

  const image = sharp(filePath).rotate(); // auto-rotate by EXIF
  const meta = await image.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);

  let pipeline = image;
  if (longest > MAX_SIDE) {
    pipeline = pipeline.resize({
      width: meta.width >= meta.height ? MAX_SIDE : undefined,
      height: meta.height > meta.width ? MAX_SIDE : undefined,
      withoutEnlargement: true,
    });
  }

  await pipeline.webp({ quality: WEBP_QUALITY }).toFile(outPath);

  // Remove original
  unlinkSync(filePath);

  const outStat = statSync(outPath);
  return { outPath, sizeKB: Math.round(outStat.size / 1024) };
}

async function main() {
  const files = collectImages(PORTFOLIO_DIR);
  console.log(`[convert] Found ${files.length} images to convert`);

  let totalSizeKB = 0;
  let done = 0;

  for (const f of files) {
    try {
      const { outPath, sizeKB } = await convertOne(f);
      totalSizeKB += sizeKB;
      done++;
      if (done % 10 === 0) console.log(`  ... ${done}/${files.length}`);
    } catch (err) {
      console.error(`  ERROR: ${f} — ${err.message}`);
    }
  }

  console.log(`[convert] Done: ${done}/${files.length} files → ${(totalSizeKB / 1024).toFixed(1)} MB total`);
}

main();

import sharp from "sharp";
import { readdirSync, statSync, unlinkSync } from "fs";
import { join, parse } from "path";

const TASKS = [
  { dir: "public/tshirts/shopper-canvas/210/black", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/shopper-canvas/210/natural", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/thumbnails/shopper-canvas/210/black", maxSize: 800, quality: 80 },
  { dir: "public/tshirts/thumbnails/shopper-canvas/210/natural", maxSize: 800, quality: 80 },
];

const SRC_EXT = new Set([".png", ".jpg", ".jpeg"]);

async function processDir({ dir, maxSize, quality }) {
  const files = readdirSync(dir);
  for (const file of files) {
    const { name, ext } = parse(file);
    if (!SRC_EXT.has(ext.toLowerCase())) continue;
    const src = join(dir, file);
    const dst = join(dir, `${name}.webp`);
    const before = statSync(src).size;
    await sharp(src)
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toFile(dst);
    const after = statSync(dst).size;
    unlinkSync(src);
    console.log(`${src} → ${dst}  ${(before / 1024).toFixed(0)}K → ${(after / 1024).toFixed(0)}K`);
  }
}

for (const task of TASKS) {
  await processDir(task);
}

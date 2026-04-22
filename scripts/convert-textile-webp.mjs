import sharp from "sharp";
import { readdirSync, statSync, unlinkSync } from "fs";
import { join, parse } from "path";

// Recursively convert all PNG/JPG/JPEG inside listed dirs to WebP and resize.
const TASKS = [
  { dir: "public/tshirts/home img t-shirt", maxSize: 1400, quality: 82 },
  { dir: "public/tshirts/oversize", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/oversize-washed", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/hoodie-fleece", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/hoodie-washed", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/sweatshirt-washed", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/classic", maxSize: 1200, quality: 82 },
  { dir: "public/tshirts/thumbnails", maxSize: 800, quality: 80 },
];

const SRC_EXT = new Set([".png", ".jpg", ".jpeg"]);

async function walk(dir, maxSize, quality) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, maxSize, quality);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === ".DS_Store") { try { unlinkSync(full); } catch { /**/ } continue; }
    const { name, ext } = parse(entry.name);
    if (!SRC_EXT.has(ext.toLowerCase())) continue;
    const dst = join(dir, `${name}.webp`);
    const before = statSync(full).size;
    try {
      await sharp(full)
        .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toFile(dst);
    } catch (err) {
      console.error(`FAIL ${full}: ${err.message}`);
      continue;
    }
    const after = statSync(dst).size;
    unlinkSync(full);
    console.log(`${full} → ${dst}  ${(before / 1024).toFixed(0)}K → ${(after / 1024).toFixed(0)}K`);
  }
}

for (const task of TASKS) {
  console.log(`\n=== ${task.dir} (max ${task.maxSize}, q${task.quality}) ===`);
  await walk(task.dir, task.maxSize, task.quality);
}

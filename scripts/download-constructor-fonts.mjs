/**
 * Downloads all constructor Google Fonts as TTF files into public/fonts/Google/
 * Each TTF includes full Unicode support (Cyrillic + Latin) via Google Fonts v2 API
 * Files: FontName-weight.ttf (e.g., Caveat-400.ttf)
 * Usage: node scripts/download-constructor-fonts.mjs
 */

import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const TARGET_DIR = "public/fonts/Google";

// All Google Fonts from the constructor config
// Format: [fontName, [weights]]
const FONTS = [
  // BUILTIN_TEXT_FONTS
  ["Outfit", [500, 800]],
  ["Inter", [500, 800]],
  ["Bebas Neue", [400]],
  ["Unbounded", [500, 700]],
  ["Marck Script", [400]],
  ["IBM Plex Mono", [500, 700]],

  // RUSSIAN_FONTS (all weight 400)
  ["Great Vibes", [400]],
  ["Alumni Sans", [400]],
  ["Fira Sans Condensed", [400]],
  ["Caveat", [400]],
  ["Comfortaa", [400]],
  ["Lobster", [400]],
  ["Pacifico", [400]],
  ["Roboto Slab", [400]],
  ["Oswald", [400]],
  ["Rubik Mono One", [400]],
  ["Press Start 2P", [400]],
  ["Advent Pro", [400]],
  ["Yanone Kaffeesatz", [400]],
  ["Amatic SC", [400]],
  ["Old Standard TT", [400]],
  ["Dela Gothic One", [400]],
  ["Bad Script", [400]],
  ["Pangolin", [400]],
  ["Neucha", [400]],
  ["Pattaya", [400]],
  ["Rampart One", [400]],
  ["Rubik Wet Paint", [400]],
  ["Reggae One", [400]],
  ["Kelly Slab", [400]],
  ["Ruslan Display", [400]],
  ["Rubik Dirt", [400]],
  ["Rubik Glitch", [400]],
  ["Train One", [400]],
  ["Rubik Doodle Shadow", [400]],
  ["Kablammo", [400]],
  ["Stick", [400]],
  ["Rubik Bubbles", [400]],
  ["Comforter", [400]],
  ["Climate Crisis", [400]],
  ["Tiny5", [400]],
  ["Comforter Brush", [400]],
  ["Stalinist One", [400]],
  ["Oi", [400]],
  ["Rubik Marker Hatch", [400]],
];

mkdirSync(TARGET_DIR, { recursive: true });

let successCount = 0;
let failCount = 0;
let skipCount = 0;

for (const [fontName, weights] of FONTS) {
  for (const weight of weights) {
    const family = fontName.replace(/ /g, "+");
    // Use Google Fonts v2 API with cyrillic+latin subsets to get full Unicode support
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&subset=cyrillic,latin&display=swap`;

    try {
      console.log(`\n📦 ${fontName} ${weight}...`);
      const cssRes = await fetch(cssUrl);

      if (!cssRes.ok) {
        console.error(`  ✗ HTTP ${cssRes.status}`);
        failCount++;
        continue;
      }

      const css = await cssRes.text();

      // Extract the TTF URL from @font-face block
      // Google Fonts v2 returns one TTF per font-weight that includes all subsets
      const ttfUrlMatch = css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+\.ttf)\)/);

      if (!ttfUrlMatch || !ttfUrlMatch[1]) {
        console.error(`  ✗ No TTF URL found in CSS`);
        failCount++;
        continue;
      }

      const ttfUrl = ttfUrlMatch[1];
      const filename = `${fontName.replace(/\s+/g, "")}-${weight}.ttf`;
      const filepath = join(TARGET_DIR, filename);

      if (existsSync(filepath)) {
        console.log(`  ⊘ Already exists`);
        skipCount++;
        continue;
      }

      try {
        const ttfRes = await fetch(ttfUrl);
        if (!ttfRes.ok) {
          console.error(`  ✗ Download failed — HTTP ${ttfRes.status}`);
          failCount++;
          continue;
        }

        const buffer = Buffer.from(await ttfRes.arrayBuffer());
        writeFileSync(filepath, buffer);
        console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
        successCount++;
      } catch (err) {
        console.error(`  ✗ Download — ${err.message}`);
        failCount++;
      }
    } catch (err) {
      console.error(`  ✗ ${fontName} ${weight} — ${err.message}`);
      failCount++;
    }
  }
}

console.log(`\n✅ Done: ${successCount} downloaded, ${skipCount} skipped, ${failCount} failed`);

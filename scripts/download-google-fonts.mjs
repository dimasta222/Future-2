/**
 * Downloads Google Fonts as TTF files into public/fonts/<group>/
 * Usage: node scripts/download-google-fonts.mjs
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const TARGET_DIR = "public/fonts/Кириллица";

const FONTS = [
  "Great Vibes",
  "Alumni Sans",
  "Fira Sans Condensed",
  "Caveat",
  "Comfortaa",
  "Lobster",
  "Pacifico",
  "Roboto Slab",
  "Oswald",
  "Rubik Mono One",
  "Press Start 2P",
  "Advent Pro",
  "Yanone Kaffeesatz",
  "Amatic SC",
  "Old Standard TT",
  "WDXL Lubrifont TC",
  "Dela Gothic One",
  "Bad Script",
  "Pangolin",
  "Marck Script",
  "Neucha",
  "Pattaya",
  "Rampart One",
  "Rubik Wet Paint",
  "Reggae One",
  "Kelly Slab",
  "Ruslan Display",
  "Rubik Dirt",
  "Rubik Glitch",
  "Train One",
  "Rubik Doodle Shadow",
  "Kablammo",
  "Stick",
  "Rubik Bubbles",
  "Comforter",
  "Climate Crisis",
  "Tiny5",
  "Comforter Brush",
  "Monomakh",
  "Stalinist One",
  "Ponomar",
  "Oi",
  "Shafarik",
  "Rubik Marker Hatch",
];

// User-Agent that makes Google Fonts serve TTF format
const TTF_USER_AGENT =
  "Mozilla/5.0 (Linux; U; Android 4.1; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30";

mkdirSync(TARGET_DIR, { recursive: true });

let successCount = 0;
let failCount = 0;

for (const fontName of FONTS) {
  const family = fontName.replace(/ /g, "+");
  const cssUrl = `https://fonts.googleapis.com/css?family=${family}`;

  try {
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": TTF_USER_AGENT },
    });

    if (!cssRes.ok) {
      console.error(`  ✗ ${fontName} — HTTP ${cssRes.status}`);
      failCount++;
      continue;
    }

    const css = await cssRes.text();
    const ttfMatch = css.match(
      /url\((https:\/\/fonts\.gstatic\.com[^)]+\.ttf)\)/,
    );

    if (!ttfMatch) {
      console.error(`  ✗ ${fontName} — no TTF URL in CSS response`);
      failCount++;
      continue;
    }

    const ttfUrl = ttfMatch[1];
    const ttfRes = await fetch(ttfUrl);

    if (!ttfRes.ok) {
      console.error(`  ✗ ${fontName} — TTF download HTTP ${ttfRes.status}`);
      failCount++;
      continue;
    }

    const buffer = Buffer.from(await ttfRes.arrayBuffer());
    const filename = `${fontName.replace(/\s+/g, "")}-Regular.ttf`;
    writeFileSync(join(TARGET_DIR, filename), buffer);
    console.log(
      `  ✓ ${fontName} → ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`,
    );
    successCount++;
  } catch (err) {
    console.error(`  ✗ ${fontName} — ${err.message}`);
    failCount++;
  }
}

console.log(
  `\nDone: ${successCount} downloaded, ${failCount} failed out of ${FONTS.length}`,
);

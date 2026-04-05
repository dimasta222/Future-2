// Detect red boundary lines in guide mockup images using pure Node.js PNG parsing
const fs = require('fs');
const { createCanvas, loadImage } = (() => {
  try { return require('canvas'); } catch(e) { return {}; }
})();
const { PNG } = (() => {
  try { return require('pngjs'); } catch(e) { return {}; }
})();

// Use pngjs for pure Node parsing
if (!PNG) {
  console.log('pngjs not available, trying sharp...');
  const sharp = require('sharp');
  
  async function detectWithSharp(path, label) {
    const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const channels = info.channels;
    console.log(`\n=== ${label}: ${w}x${h}, channels=${channels} ===`);
    
    let minR = h, maxR = 0, minC = w, maxC = 0;
    let count = 0;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r > 180 && g < 80 && b < 80) {
          count++;
          if (y < minR) minR = y;
          if (y > maxR) maxR = y;
          if (x < minC) minC = x;
          if (x > maxC) maxC = x;
        }
      }
    }
    
    if (count === 0) {
      console.log('No red pixels found with strict threshold, trying broader...');
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * channels;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          if (r > 150 && g < 120 && b < 120) {
            count++;
            if (y < minR) minR = y;
            if (y > maxR) maxR = y;
            if (x < minC) minC = x;
            if (x > maxC) maxC = x;
          }
        }
      }
    }
    
    if (count === 0) {
      console.log('Still no red pixels found!');
      return;
    }
    
    console.log(`Red pixels: ${count}`);
    console.log(`Bounds (px): left=${minC}, top=${minR}, right=${maxC}, bottom=${maxR}`);
    console.log(`Bounds (%): left=${(minC/w*100).toFixed(2)}%, top=${(minR/h*100).toFixed(2)}%, right=${(maxC/w*100).toFixed(2)}%, bottom=${(maxR/h*100).toFixed(2)}%`);
    
    const cx = (minC + maxC) / 2;
    const cy = (minR + maxR) / 2;
    const aw = maxC - minC;
    const ah = maxR - minR;
    console.log(`Center (%): x=${(cx/w*100).toFixed(2)}%, y=${(cy/h*100).toFixed(2)}%`);
    console.log(`Size (%): w=${(aw/w*100).toFixed(2)}%, h=${(ah/h*100).toFixed(2)}%`);
    console.log(`\n  Config values:`);
    console.log(`  left: ${(cx/w*100).toFixed(1)},`);
    console.log(`  top:  ${(cy/h*100).toFixed(1)},`);
    console.log(`  width: ${(aw/w*100).toFixed(1)},`);
    console.log(`  height: ${(ah/h*100).toFixed(1)},`);
  }
  
  const base = '/Users/dmitrylymar/Desktop/future-studio/public/mockups';
  Promise.all([
    detectWithSharp(`${base}/oversize-black-front-guide.png`, 'FRONT'),
    detectWithSharp(`${base}/oversize-black-back-guide.png`, 'BACK'),
  ]).catch(e => console.error(e));
} else {
  function detect(path, label) {
    const data = fs.readFileSync(path);
    const png = PNG.sync.read(data);
    const w = png.width, h = png.height;
    console.log(`\n=== ${label}: ${w}x${h} ===`);
    // ... similar logic
  }
}

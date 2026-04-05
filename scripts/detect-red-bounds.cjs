const sharp = require('sharp');

async function detectRedBounds(path, label) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  console.log('\n=== ' + label + ': ' + w + 'x' + h + ', channels=' + ch + ' ===');

  let minR = h, maxR = 0, minC = w, maxC = 0;
  let count = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * ch;
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
    console.log('Strict threshold found 0 red pixels. Trying broader...');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * ch;
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
    if (count > 0) console.log('(broader threshold R>150,G<120,B<120)');
  }

  if (count === 0) {
    console.log('No red pixels found at all!');
    return;
  }

  console.log('Red pixels: ' + count);
  console.log('Bounds (px): left=' + minC + ', top=' + minR + ', right=' + maxC + ', bottom=' + maxR);
  console.log('Bounds (%): left=' + (minC/w*100).toFixed(2) + '%, top=' + (minR/h*100).toFixed(2) + '%, right=' + (maxC/w*100).toFixed(2) + '%, bottom=' + (maxR/h*100).toFixed(2) + '%');

  const cx = (minC + maxC) / 2;
  const cy = (minR + maxR) / 2;
  const aw = maxC - minC;
  const ah = maxR - minR;
  console.log('Center (%): x=' + (cx/w*100).toFixed(2) + '%, y=' + (cy/h*100).toFixed(2) + '%');
  console.log('Size (%): w=' + (aw/w*100).toFixed(2) + '%, h=' + (ah/h*100).toFixed(2) + '%');
  console.log('');
  console.log('  constructorConfig values:');
  console.log('  left: ' + +(cx/w*100).toFixed(1) + ',');
  console.log('  top:  ' + +(cy/h*100).toFixed(1) + ',');
  console.log('  width: ' + +(aw/w*100).toFixed(1) + ',');
  console.log('  height: ' + +(ah/h*100).toFixed(1) + ',');
}

const base = '/Users/dmitrylymar/Desktop/future-studio/public/mockups';
(async () => {
  await detectRedBounds(base + '/oversize-black-front-guide.png', 'FRONT');
  await detectRedBounds(base + '/oversize-black-back-guide.png', 'BACK');
})();

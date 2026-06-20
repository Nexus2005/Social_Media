const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'cartly-logo.webp');

async function resizeIcon(size) {
  const targetSize = size;
  const logoSize = Math.round(size * 0.7); // 70% of canvas
  const padding = Math.round((size - logoSize) / 2);

  // Resize the primary logo
  const logoBuffer = await sharp(inputPath)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create a 100% black square canvas (alpha = 1) and composite the resized logo at the center
  await sharp({
    create: {
      width: targetSize,
      height: targetSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
  .composite([{ input: logoBuffer, top: padding, left: padding }])
  .png()
  .toFile(path.join(__dirname, 'public', `icon-${size}x${size}.png`));

  console.log(`Generated icon-${size}x${size}.png successfully.`);
}

async function run() {
  await resizeIcon(192);
  await resizeIcon(512);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

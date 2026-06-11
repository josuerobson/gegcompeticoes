import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const imagePath = 'C:\\Users\\carlo\\.gemini\\antigravity\\brain\\d6ffd577-1ba6-4a97-a59e-ce8772ad89c7\\media__1781195458880.png';
const outputDir = 'C:\\Users\\carlo\\antigravity\\gegcompeticoes\\assets';

async function main() {
  try {
    console.log('Reading image...');
    const image = await Jimp.read(imagePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    console.log(`Image dimensions: ${width}x${height}`);

    // Crop coordinates:
    // Left shield: ~0 to 32%
    // Center logo: ~32% to 68%
    // Right shield: ~68% to 100%
    const logoX = Math.floor(width * 0.31);
    const logoW = Math.floor(width * 0.38);
    const logoY = Math.floor(height * 0.1);
    const logoH = Math.floor(height * 0.8);

    console.log(`Cropping logo at x:${logoX}, y:${logoY}, w:${logoW}, h:${logoH}`);
    const logo = image.clone().crop({ x: logoX, y: logoY, w: logoW, h: logoH });

    // Make white background transparent
    console.log('Making white background transparent...');
    logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If it's close to white, make it transparent
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 3] = 0; // Alpha = 0
      }
    });

    const outputPath = path.join(outputDir, 'logo_gg_competicoes.png');
    await logo.write(outputPath);
    console.log(`Saved transparent logo to: ${outputPath}`);

    // Crop Left shield
    const leftW = Math.floor(width * 0.32);
    const leftShield = image.clone().crop({ x: 0, y: 0, w: leftW, h: height });
    
    leftShield.scan(0, 0, leftShield.bitmap.width, leftShield.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 3] = 0;
      }
    });
    const leftPath = path.join(outputDir, 'logo_copa_rifle_shot.png');
    await leftShield.write(leftPath);
    console.log(`Saved left shield to: ${leftPath}`);

    // Crop Right shield
    const rightX = Math.floor(width * 0.68);
    const rightW = width - rightX;
    const rightShield = image.clone().crop({ x: rightX, y: 0, w: rightW, h: height });
    
    rightShield.scan(0, 0, rightShield.bitmap.width, rightShield.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      if (r > 240 && g > 240 && b > 240) {
        this.bitmap.data[idx + 3] = 0;
      }
    });
    const rightPath = path.join(outputDir, 'logo_copa_univales.png');
    await rightShield.write(rightPath);
    console.log(`Saved right shield to: ${rightPath}`);

    console.log('Logo processing completed successfully!');
  } catch (err) {
    console.error('Error processing logo:', err);
  }
}

main();

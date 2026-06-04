#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG content with neon glow
const svgContent = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow-intense" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="outer-glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="200" height="200" fill="#0C0C0F"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="#7B6EF6" stroke-width="8.5" opacity="0.2" filter="url(#outer-glow)"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="#7B6EF6" stroke-width="8.5" filter="url(#glow-intense)"/>
  <path d="M 90 52 C 105 50, 120 58, 122 72 C 123 80, 118 86, 108 88" fill="none" stroke="#7B6EF6" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-intense)"/>
  <path d="M 92 112 C 82 114, 78 120, 78 130 C 78 142, 88 150, 105 150 C 118 150, 128 144, 130 135" fill="none" stroke="#7B6EF6" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-intense)"/>
</svg>`;

// iOS icon sizes
const iosIcons = [
  { size: 180, scale: '3x', name: 'iPhone icon (3x)' },
  { size: 120, scale: '2x', name: 'iPhone icon (2x)' },
  { size: 60, scale: '1x', name: 'iPhone icon (1x)' }
];

// Android icon sizes
const androidIcons = [
  { size: 192, density: 'xxhdpi', name: 'xxhdpi (192x192)' },
  { size: 144, density: 'xhdpi', name: 'xhdpi (144x144)' },
  { size: 96, density: 'hdpi', name: 'hdpi (96x96)' },
  { size: 72, density: 'mdpi', name: 'mdpi (72x72)' }
];

console.log('📱 SOMA Neon - App Icon Export\n');

// Create directories
const iosDir = path.join(__dirname, 'logo-exports', 'neon', 'iOS');
const androidDir = path.join(__dirname, 'logo-exports', 'neon', 'Android');

if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });
if (!fs.existsSync(androidDir)) fs.mkdirSync(androidDir, { recursive: true });

(async () => {
  let completed = 0;

  console.log('📱 iOS Neon Icons:');
  console.log('─'.repeat(50));

  for (const { size, scale, name } of iosIcons) {
    try {
      const filename = `AppIcon-${scale}.png`;
      const filepath = path.join(iosDir, filename);

      await sharp(Buffer.from(svgContent))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 12, g: 12, b: 15, alpha: 1 }
        })
        .png({ quality: 95 })
        .toFile(filepath);

      console.log(`✅ ${name.padEnd(25)} → ${filename}`);
      completed++;
    } catch (error) {
      console.log(`❌ ${name.padEnd(25)} → ERROR: ${error.message}`);
    }
  }

  console.log('\n🤖 Android Neon Icons:');
  console.log('─'.repeat(50));

  for (const { size, density, name } of androidIcons) {
    try {
      const filename = `ic_launcher.png`;
      const folderName = `mipmap-${density}`;
      const folderPath = path.join(androidDir, folderName);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filepath = path.join(folderPath, filename);

      await sharp(Buffer.from(svgContent))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 12, g: 12, b: 15, alpha: 1 }
        })
        .png({ quality: 95 })
        .toFile(filepath);

      console.log(`✅ ${name.padEnd(25)} → mipmap-${density}/${filename}`);
      completed++;
    } catch (error) {
      console.log(`❌ ${name.padEnd(25)} → ERROR: ${error.message}`);
    }
  }

  console.log('\n✨ App Icon Export Complete!');
  console.log('─'.repeat(50));
  console.log(`✅ Total: ${completed}/7 neon app icons created\n`);

  console.log('📁 Structure:');
  console.log('  logo-exports/neon/');
  console.log('  ├── iOS/');
  console.log('  │   ├── AppIcon-3x.png     (180×180)');
  console.log('  │   ├── AppIcon-2x.png     (120×120)');
  console.log('  │   └── AppIcon-1x.png     (60×60)');
  console.log('  │');
  console.log('  └── Android/');
  console.log('      ├── mipmap-xxhdpi/ic_launcher.png');
  console.log('      ├── mipmap-xhdpi/ic_launcher.png');
  console.log('      ├── mipmap-hdpi/ic_launcher.png');
  console.log('      └── mipmap-mdpi/ic_launcher.png\n');

  console.log('🎨 All neon icons ready for app integration!\n');
})();

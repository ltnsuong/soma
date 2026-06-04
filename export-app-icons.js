#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG content
const svgContent = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="82" fill="none" stroke="black" stroke-width="8.5"/>
  <path d="M 90 52 C 105 50, 120 58, 122 72 C 123 80, 118 86, 108 88" fill="none" stroke="black" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 92 112 C 82 114, 78 120, 78 130 C 78 142, 88 150, 105 150 C 118 150, 128 144, 130 135" fill="none" stroke="black" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
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

console.log('🚀 SOMA Premium Logo - App Icon Export\n');

// Create directories
const iosDir = path.join(__dirname, 'logo-exports', 'iOS');
const androidDir = path.join(__dirname, 'logo-exports', 'Android');

if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });
if (!fs.existsSync(androidDir)) fs.mkdirSync(androidDir, { recursive: true });

(async () => {
  let completed = 0;

  console.log('📱 iOS Icons:');
  console.log('─'.repeat(50));

  for (const { size, scale, name } of iosIcons) {
    try {
      const filename = `AppIcon-${scale}.png`;
      const filepath = path.join(iosDir, filename);

      await sharp(Buffer.from(svgContent))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ quality: 95 })
        .toFile(filepath);

      console.log(`✅ ${name.padEnd(25)} → ${filename}`);
      completed++;
    } catch (error) {
      console.log(`❌ ${name.padEnd(25)} → ERROR: ${error.message}`);
    }
  }

  console.log('\n🤖 Android Icons:');
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
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ quality: 95 })
        .toFile(filepath);

      console.log(`✅ ${name.padEnd(25)} → mipmap-${density}/${filename}`);
      completed++;
    } catch (error) {
      console.log(`❌ ${name.padEnd(25)} → ERROR: ${error.message}`);
    }
  }

  console.log('\n📦 App Icon Export Complete!');
  console.log('─'.repeat(50));
  console.log(`✅ Total: ${completed}/7 icons created\n`);

  console.log('📁 Directory Structure:');
  console.log('  logo-exports/');
  console.log('  ├── iOS/');
  console.log('  │   ├── AppIcon-3x.png    (180x180 - iPhone)');
  console.log('  │   ├── AppIcon-2x.png    (120x120 - iPhone)');
  console.log('  │   └── AppIcon-1x.png    (60x60 - iPhone)');
  console.log('  │');
  console.log('  └── Android/');
  console.log('      ├── mipmap-xxhdpi/ic_launcher.png   (192x192)');
  console.log('      ├── mipmap-xhdpi/ic_launcher.png    (144x144)');
  console.log('      ├── mipmap-hdpi/ic_launcher.png     (96x96)');
  console.log('      └── mipmap-mdpi/ic_launcher.png     (72x72)\n');

  console.log('🎯 Implementation:');
  console.log('  iOS:');
  console.log('    1. Open Assets.xcassets in Xcode');
  console.log('    2. Create AppIcon set');
  console.log('    3. Drag files into corresponding slots');
  console.log('\n  Android:');
  console.log('    1. Copy mipmap folders to res/');
  console.log('    2. Update AndroidManifest.xml:');
  console.log('       android:icon="@mipmap/ic_launcher"');
  console.log('\n✨ Ready to add to your app!\n');
})();

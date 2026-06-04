#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG content (Variant 1 - Recommended)
const svgContent = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="82" fill="none" stroke="black" stroke-width="8.5"/>
  <path d="M 90 52 C 105 50, 120 58, 122 72 C 123 80, 118 86, 108 88" fill="none" stroke="black" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 92 112 C 82 114, 78 120, 78 130 C 78 142, 88 150, 105 150 C 118 150, 128 144, 130 135" fill="none" stroke="black" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Sizes to export
const sizes = [
  { size: 32, name: '32px (Favicon)' },
  { size: 64, name: '64px (Email Signature)' },
  { size: 128, name: '128px (Website Header)' },
  { size: 180, name: '180px (iOS 3x)' },
  { size: 192, name: '192px (Android xxhdpi)' },
  { size: 256, name: '256px (General Use)' },
  { size: 512, name: '512px (App Store)' },
  { size: 1024, name: '1024px (Large Display)' }
];

console.log('🚀 SOMA Premium Logo - PNG Export\n');
console.log('Exporting Variant 1 (Recommended): soma-premium-logo-final\n');

// Create exports directory
const exportsDir = path.join(__dirname, 'logo-exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Export each size
(async () => {
  let completed = 0;

  for (const { size, name } of sizes) {
    try {
      const filename = `soma-logo-${size}px.png`;
      const filepath = path.join(exportsDir, filename);

      await sharp(Buffer.from(svgContent))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .png({ quality: 95 })
        .toFile(filepath);

      console.log(`✅ ${name.padEnd(30)} → ${filename}`);
      completed++;
    } catch (error) {
      console.log(`❌ ${name.padEnd(30)} → ERROR: ${error.message}`);
    }
  }

  console.log(`\n📦 Exported ${completed}/${sizes.length} PNG files`);
  console.log(`📁 Location: ${exportsDir}\n`);

  // Summary
  console.log('📋 Files Created:');
  console.log('─'.repeat(50));
  const files = fs.readdirSync(exportsDir).sort((a, b) => {
    const aSize = parseInt(a.match(/\d+/)[0]);
    const bSize = parseInt(b.match(/\d+/)[0]);
    return aSize - bSize;
  });

  files.forEach(file => {
    const filepath = path.join(exportsDir, file);
    const stats = fs.statSync(filepath);
    const sizeKb = (stats.size / 1024).toFixed(2);
    console.log(`  ${file.padEnd(25)} ${sizeKb.padStart(8)} KB`);
  });

  console.log('─'.repeat(50));
  console.log('\n🎯 Usage Guide:');
  console.log('  • 32px, 64px → Favicon, social profiles');
  console.log('  • 128px → Website headers');
  console.log('  • 180px → iOS app icon (3x)');
  console.log('  • 192px → Android app icon');
  console.log('  • 256px → General digital use');
  console.log('  • 512px → App store listings');
  console.log('  • 1024px → Large displays, printing');

  console.log('\n✨ Ready for deployment!\n');
})();

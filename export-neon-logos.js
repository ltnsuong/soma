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

// Sizes to export
const sizes = [
  { size: 32, name: '32px (Favicon)' },
  { size: 64, name: '64px (Email)' },
  { size: 128, name: '128px (Header)' },
  { size: 180, name: '180px (iOS)' },
  { size: 192, name: '192px (Android)' },
  { size: 256, name: '256px (Social)' },
  { size: 512, name: '512px (App Store)' },
  { size: 1024, name: '1024px (Large)' }
];

console.log('🌟 SOMA Neon Logo - PNG Export\n');
console.log('Color: Violet (#7B6EF6) • Effect: Glow • Background: Dark\n');

// Create exports directory
const exportsDir = path.join(__dirname, 'logo-exports', 'neon');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

(async () => {
  let completed = 0;

  console.log('📦 Exporting Neon Logos:');
  console.log('─'.repeat(50));

  for (const { size, name } of sizes) {
    try {
      const filename = `soma-neon-logo-${size}px.png`;
      const filepath = path.join(exportsDir, filename);

      await sharp(Buffer.from(svgContent))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 12, g: 12, b: 15, alpha: 1 } // Dark background
        })
        .png({ quality: 95 })
        .toFile(filepath);

      console.log(`✅ ${name.padEnd(30)} → ${filename}`);
      completed++;
    } catch (error) {
      console.log(`❌ ${name.padEnd(30)} → ERROR: ${error.message}`);
    }
  }

  console.log('\n📦 Export Complete!');
  console.log('─'.repeat(50));
  console.log(`✅ Total: ${completed}/${sizes.length} neon logos created\n`);

  console.log('📁 Location: logo-exports/neon/\n');
  console.log('🎨 Design Features:');
  console.log('  • Violet glow (#7B6EF6) — matches SOMA brand');
  console.log('  • Dark background (#0C0C0F) — same as app theme');
  console.log('  • Neon effect — luminous, glowing appearance');
  console.log('  • S-inside-O monogram — same iconic design');
  console.log('\n✨ Ready for app integration!\n');
})();

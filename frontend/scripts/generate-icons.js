#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create icons directory
const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Simple SVG icon for GoldVision
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#1e40af"/>
  <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${
  size * 0.15
}" fill="url(#gold)"/>
  <path d="M${size * 0.3} ${size * 0.6} Q${size * 0.5} ${size * 0.8} ${
  size * 0.7
} ${size * 0.6}" 
        stroke="url(#gold)" stroke-width="${
          size * 0.05
        }" fill="none" stroke-linecap="round"/>
  <text x="${size * 0.5}" y="${
  size * 0.9
}" font-family="Arial, sans-serif" font-size="${size * 0.12}" 
        font-weight="bold" text-anchor="middle" fill="white">G</text>
</svg>`;

// Generate icons in different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach((size) => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.png`;

  // For now, we'll create SVG files and note that they need to be converted to PNG
  const svgFilename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, svgFilename), svg);

  console.log(`Generated ${svgFilename} (${size}x${size})`);
});

console.log(
  "\nNote: SVG files have been generated. For production, convert these to PNG format."
);
console.log(
  "You can use online converters or tools like ImageMagick to convert SVG to PNG."
);

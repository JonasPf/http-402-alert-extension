#!/usr/bin/env node

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const buildDir = 'build';

// Clean build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir);

// Bundle JavaScript files
const jsFiles = [
  { in: 'background.js', out: 'background.js' },
  { in: 'popup.js', out: 'popup.js' }
];

Promise.all(
  jsFiles.map(file =>
    esbuild.build({
      entryPoints: [file.in],
      bundle: true,
      outfile: path.join(buildDir, file.out),
      format: 'iife',
      platform: 'browser',
      target: 'chrome96'
    })
  )
).then(() => {
  console.log('✓ JavaScript files bundled');

  // Copy static files
  const staticFiles = [
    'manifest.json',
    'popup.html',
    'popup.css',
    'content-display.html',
    'content-display.js',
    'logo-16.png',
    'logo-48.png',
    'logo-128.png'
  ];

  staticFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(buildDir, file));
      console.log(`✓ Copied ${file}`);
    } else {
      console.error(`✗ File not found: ${file}`);
    }
  });

  console.log(`\n✓ Build complete! Extension ready in ${buildDir}/`);
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

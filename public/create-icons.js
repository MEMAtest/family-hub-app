const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceSvg = path.join(__dirname, 'icon.svg');
const outputDir = __dirname;
const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omosanya-home-icons-'));

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 256, 384];
const extraOutputs = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192 },
  { name: 'icon-maskable-512.png', size: 512 },
];

if (!fs.existsSync(sourceSvg)) {
  throw new Error(`Missing source icon: ${sourceSvg}`);
}

execFileSync('qlmanage', ['-t', '-s', '1024', '-o', scratchDir, sourceSvg], {
  cwd: root,
  stdio: 'inherit',
});

const sourcePng = path.join(scratchDir, 'icon.svg.png');
if (!fs.existsSync(sourcePng)) {
  throw new Error(`QuickLook did not produce ${sourcePng}`);
}

for (const size of sizes) {
  const fileName = `icon-${size}x${size}.png`;
  execFileSync('sips', ['-z', String(size), String(size), sourcePng, '--out', path.join(outputDir, fileName)], {
    stdio: 'ignore',
  });
  console.log(`Created ${fileName}`);
}

for (const output of extraOutputs) {
  execFileSync('sips', ['-z', String(output.size), String(output.size), sourcePng, '--out', path.join(outputDir, output.name)], {
    stdio: 'ignore',
  });
  console.log(`Created ${output.name}`);
}

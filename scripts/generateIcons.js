const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUTS = [
  { size: 192, color: [59, 130, 246, 255] }, // brand blue
  { size: 512, color: [99, 102, 241, 255] }, // brand indigo
];

const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i += 1) {
    const byte = buf[i];
    crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function generatePng(size, color) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // No filter
    for (let x = 0; x < size; x += 1) {
      const idx = rowStart + 1 + x * 4;
      raw[idx] = color[0];
      raw[idx + 1] = color[1];
      raw[idx + 2] = color[2];
      raw[idx + 3] = color[3];
    }
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', zlib.deflateSync(raw));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  ensureDir(publicDir);

  OUTPUTS.forEach(({ size, color }) => {
    const buffer = generatePng(size, color);
    const fileName = `icon-${size}.png`;
    const outPath = path.join(publicDir, fileName);
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated ${fileName}`);
  });
}

main();

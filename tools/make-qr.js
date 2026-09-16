/*
 * Dependency-free QR generation for the banner.
 *
 *   const { png, svg } = require('./make-qr');
 *   png('qr.png', 'https://example.com/', { px: 1400 });
 *   svg('qr.svg', 'https://example.com/');
 *
 * Uses the vendored encoder (build/vendor/qrcode-generator.js, MIT, Kazuhiko Arase) and
 * writes PNG/SVG itself, so `node tools/setup-site.js <url>` never needs npm install.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ENCODER = path.join(__dirname, '..', 'build', 'vendor', 'qrcode-generator.js');

function buildMatrix(text, ecLevel) {
  let encoder;
  try {
    encoder = require(ENCODER);
  } catch (e) {
    throw new Error('vendor/qrcode-generator.js missing (' + e.message + ')');
  }
  const qr = encoder(0, ecLevel || 'Q'); // typeNumber 0 = pick the smallest that fits
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const margin = 4; // modules of quiet zone, as the spec asks
  const size = count + margin * 2;
  const isDark = (x, y) => {
    const mx = x - margin;
    const my = y - margin;
    if (mx < 0 || my < 0 || mx >= count || my >= count) return false;
    return qr.isDark(my, mx);
  };
  return { size, count, margin, isDark };
}

/* ------------------------------- PNG ---------------------------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function pngMatrix(matrix, file, opts) {
  const px = (opts && opts.px) || 1024;
  const scale = Math.max(1, Math.round(px / matrix.size));
  const size = matrix.size * scale;
  const dark = hexToRgb((opts && opts.dark) || '#04060c');
  const light = hexToRgb((opts && opts.light) || '#ffffff');

  const stride = size * 3 + 1; // 1 filter byte per scanline
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none
    const my = Math.floor(y / scale);
    for (let x = 0; x < size; x++) {
      const on = matrix.isDark(Math.floor(x / scale), my);
      const c = on ? dark : light;
      const o = rowStart + 1 + x * 3;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
  return size;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* ------------------------------- SVG ---------------------------------- */
function svgMatrix(matrix, file, opts) {
  const dark = (opts && opts.dark) || '#04060c';
  const light = (opts && opts.light) || '#ffffff';
  let d = '';
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.isDark(x, y)) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${matrix.size}" height="${matrix.size}" ` +
    `viewBox="0 0 ${matrix.size} ${matrix.size}" shape-rendering="crispEdges">` +
    `<rect width="${matrix.size}" height="${matrix.size}" fill="${light}"/>` +
    `<path d="${d}" fill="${dark}"/></svg>\n`;
  fs.writeFileSync(file, svg);
  return matrix.size;
}

module.exports = {
  matrix: buildMatrix,
  png: (file, text, opts) => pngMatrix(buildMatrix(text, opts && opts.ec), file, opts),
  svg: (file, text, opts) => svgMatrix(buildMatrix(text, opts && opts.ec), file, opts)
};

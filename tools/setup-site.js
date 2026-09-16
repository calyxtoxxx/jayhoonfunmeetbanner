#!/usr/bin/env node
/*
 * Points the banner at a live URL:
 *   - regenerates banner/qr.png + banner/qr.svg for that URL
 *   - rebuilds banner/banner.html from banner/banner.template.html
 *   - writes banner/URL.txt
 *
 *   node tools/setup-site.js https://your-site.example/ar/
 *   node tools/setup-site.js                 (defaults to this machine's LAN address)
 *
 * No dependencies: the QR encoder and the PNG/SVG writers are bundled (tools/make-qr.js).
 * Re-run it every time the site moves (Netlify / GitHub Pages / your own domain).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const qr = require('./make-qr');

const ROOT = path.resolve(__dirname, '..');
const BANNER = path.join(ROOT, 'banner');

function lanUrl() {
  const port = 8080;
  for (const list of Object.values(os.networkInterfaces() || {})) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) return 'http://' + ni.address + ':' + port + '/';
    }
  }
  return 'http://localhost:' + port + '/';
}

(function main() {
  let url = (process.argv[2] || '').trim();
  if (!url) {
    url = lanUrl();
    console.log('- no URL given - using the local network address, for testing only');
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  if (!url.endsWith('/')) url += '/';

  const opts = { px: 1400, ec: 'Q', dark: '#04060c', light: '#ffffff' };
  const px = qr.png(path.join(BANNER, 'qr.png'), url, opts);
  const units = qr.svg(path.join(BANNER, 'qr.svg'), url, opts);

  const template = fs.readFileSync(path.join(BANNER, 'banner.template.html'), 'utf8');
  const pretty = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  fs.writeFileSync(path.join(BANNER, 'banner.html'), template.replace(/\{\{URL\}\}/g, pretty));
  fs.writeFileSync(path.join(BANNER, 'URL.txt'), url + '\n');

  console.log('\n  banner ready\n  ------------');
  console.log('  QR points to : ' + url);
  console.log('  qr.png       : ' + px + ' x ' + px + ' px, QR v' + (units - 17) / 4 + ', ' +
    units + ' modules incl. quiet zone');
  console.log('  files        : banner/qr.png, banner/qr.svg, banner/banner.html');
  console.log('\n  print it     : open banner/banner.html and print to A4 landscape (or A3 for a bigger poster)\n');
})();

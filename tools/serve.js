#!/usr/bin/env node
/*
 * Tiny zero-dependency static server for the AR banner site.
 *
 *   node tools/serve.js                 -> http://localhost:8080 and http://<lan-ip>:8080
 *   node tools/serve.js --port 3000
 *   node tools/serve.js --https         -> self-signed TLS (needed to test on a phone over LAN)
 *
 * Range requests are supported so the browser can seek/stream the mp4 properly.
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);

const opt = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const PORT = parseInt(opt('port', '8080'), 10);
const USE_HTTPS = argv.includes('--https');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mind': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body === undefined) res.end();
  else res.end(body);
}

function serveRange(req, res, file, stat) {
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  const baseHeaders = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache'
  };

  if (!range) {
    return send(res, 200, Object.assign({ 'Content-Length': stat.size }, baseHeaders),
      fs.readFileSync(file));
  }

  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return send(res, 416, { 'Content-Range': `bytes */${stat.size}` });

  let start = m[1] === '' ? stat.size - parseInt(m[2], 10) : parseInt(m[1], 10);
  let end = m[1] === '' || m[2] === '' ? stat.size - 1 : parseInt(m[2], 10);
  start = Math.max(0, start);
  end = Math.min(stat.size - 1, Math.max(start, end));

  res.writeHead(206, Object.assign({
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Content-Length': end - start + 1
  }, baseHeaders));
  fs.createReadStream(file, { start, end }).pipe(res);
}

const server = http.createServer(handler);

function handler(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch (e) {
    return send(res, 400, { 'Content-Type': 'text/plain' }, 'bad request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const file = path.join(ROOT, path.normalize(pathname).replace(/^([\\/])+/, ''));
  if (!file.startsWith(ROOT)) return send(res, 403, { 'Content-Type': 'text/plain' }, 'forbidden');

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      console.log(`  404 ${pathname}`);
      return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 not found');
    }
    if (req.method === 'HEAD') {
      return send(res, 200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes'
      });
    }
    console.log(`  200 ${pathname} (${(stat.size / 1048576).toFixed(2)} MB)`);
    serveRange(req, res, file, stat);
  });
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces() || {})) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address);
    }
  }
  return out;
}

function makeCert(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const key = path.join(dir, 'key.pem');
  const crt = path.join(dir, 'cert.pem');
  if (fs.existsSync(key) && fs.existsSync(crt)) return { key, cert: crt };
  console.log('· generating a self-signed certificate (openssl)...');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365',
    '-keyout', key, '-out', crt,
    '-subj', '/CN=' + (lanAddresses()[0] || 'localhost'),
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1' +
      lanAddresses().map((a) => ',IP:' + a).join('')
  ], { stdio: 'inherit' });
  return { key, cert: crt };
}

function listen(srv, scheme) {
  srv.listen(PORT, () => {
    console.log('\n  AR banner dev server\n  ────────────────────');
    console.log(`  local:   ${scheme}://localhost:${PORT}/`);
    for (const ip of lanAddresses()) console.log(`  network: ${scheme}://${ip}:${PORT}/`);
    if (scheme === 'http') {
      console.log('\n  NOTE: cameras need a secure context. localhost counts as secure,');
      console.log('  but a phone hitting http://<lan-ip> does not — use --https or a real host.');
    } else {
      console.log('\n  NOTE: the certificate is self-signed — accept the warning on the device.');
    }
    console.log('\n  Press Ctrl+C to stop.\n');
  });
}

if (USE_HTTPS) {
  let creds;
  try {
    creds = makeCert(path.join(ROOT, '.certs'));
  } catch (e) {
    console.error('! could not create a certificate (openssl missing?) — falling back to http');
    console.error(' ', e.message);
    listen(server, 'http');
    process.exit(0);
  }
  const secure = https.createServer({ key: fs.readFileSync(creds.key), cert: fs.readFileSync(creds.cert) }, handler);
  listen(secure, 'https');
} else {
  listen(server, 'http');
}

/*
 * One-command verification of the whole project.
 *
 *   node build/verify.mjs                 # everything
 *   node build/verify.mjs --only=banner   # print layout only
 *   node build/verify.mjs --only=ar       # app boots, camera + film ready
 *   node build/verify.mjs --only=detect   # real detection using the artwork as a fake camera feed
 *
 * Requirements: Google Chrome (or set CHROME=<path>), and ffmpeg for the detection suite.
 * No npm dependencies needed for verification itself.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PORT = 8099;
const BASE = `http://localhost:${PORT}/`;
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || 'all';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runNode(args) {
  return new Promise((res) => {
    const c = spawn(process.execPath, args, { cwd: HERE, stdio: 'inherit' });
    c.on('exit', (code) => res(code || 0));
  });
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + 'index.html');
      if (r.ok) return true;
    } catch (e) { /* not up */ }
    await sleep(300);
  }
  return false;
}

function makeFakeCamera(dir) {
  const out = join(dir, 'art-cam.y4m');
  const png = join(ROOT, 'assets', 'target.png');
  if (!existsSync(png)) return null;
  const ff = spawnSync('ffmpeg', [
    '-v', 'error', '-y', '-loop', '1', '-i', png,
    '-vf', 'scale=880:-2,pad=1024:576:(ow-iw)/2:(oh-ih)/2:color=0x3a3f47',
    '-t', '8', '-r', '20', '-pix_fmt', 'yuv420p', '-f', 'yuv4mpegpipe', out
  ], { stdio: 'inherit' });
  return ff.status === 0 && existsSync(out) ? out : null;
}

const results = [];
async function suite(name, url, checks, extra = []) {
  console.log(`\n\n########## ${name} ##########\n`);
  const code = await runNode(['cdp-check.mjs', url, join(HERE, checks), ...extra]);
  results.push({ name, ok: code === 0 });
}

const server = spawn(process.execPath, ['tools/serve.js', '--port', String(PORT)], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
let tmp = null;

try {
  if (!(await waitForServer())) throw new Error('dev server did not start');
  console.log(`dev server up on ${BASE}`);

  if (only === 'all' || only === 'banner') {
    await suite('banner print layout', BASE + 'banner/banner.html', 'checks-banner.mjs');
    await suite('printed QR decodes', BASE + 'banner/banner.html', 'checks-qr.mjs');
  }
  if (only === 'all' || only === 'ar') await suite('app boot / camera / film', BASE, 'checks-ar.mjs', ['--fake-camera']);

  if (only === 'all' || only === 'detect') {
    tmp = mkdtempSync(join(tmpdir(), 'ar-cam-'));
    const y4m = makeFakeCamera(tmp);
    if (y4m) await suite('image tracking (end-to-end)', BASE, 'checks-detect.mjs', ['--fake-camera', '--fake-video=' + y4m]);
    else { console.log('\n! ffmpeg unavailable - skipping the detection suite'); results.push({ name: 'image tracking (end-to-end)', ok: null }); }
  }
} finally {
  server.kill();
  if (tmp) { try { rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
}

console.log('\n\n=============== SUMMARY ===============');
let bad = 0;
for (const r of results) {
  console.log(` ${r.ok === null ? 'SKIP' : (r.ok ? 'PASS' : 'FAIL')}  ${r.name}`);
  if (r.ok === false) bad++;
}
console.log('======================================\n');
process.exit(bad ? 1 : 0);

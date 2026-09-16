/*
 * One-command verification of the whole project.
 *
 *   node build/verify.mjs                                  # local folder
 *   node build/verify.mjs --only=banner|ar|detect          # one suite
 *   node build/verify.mjs --base=https://your-site/        # verify a DEPLOYMENT
 *
 * Requirements: Google Chrome (or CHROME=<path>), and ffmpeg for the detection suite.
 * No npm packages needed for verification itself.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PORT = 8099;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || 'all';
/* --base=https://your-site/ verifies a deployed copy instead of the local folder */
const remoteArg = process.argv.find((a) => a.startsWith('--base='));
const remote = remoteArg ? remoteArg.slice('--base='.length).replace(/\/?$/, '/') : '';
const BASE = remote || `http://localhost:${PORT}/`;

function runNode(args) {
  return new Promise((res) => {
    const c = spawn(process.execPath, args, { cwd: HERE, stdio: 'inherit' });
    c.on('exit', (code) => res(code || 0));
  });
}

async function waitFor(base, tries) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(base + 'index.html');
      if (r.ok) return true;
    } catch (e) { /* not up yet */ }
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

/* The AR view must always show the live camera - never a blank page. Runs the page against a
   flat green fake camera with no artwork in sight and colour-checks the rendered pixels. */
async function cameraSuite() {
  console.log('\n\n########## camera preview visible (not blank) ##########\n');
  const dir = mkdtempSync(join(tmpdir(), 'ar-camview-'));
  const feed = join(dir, 'flat.y4m');
  const shot = join(dir, 'view.png');
  const px = join(dir, 'px.raw');
  const mk = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i',
    'color=c=0x2E7D32:s=1024x576:d=6:r=15', '-pix_fmt', 'yuv420p', '-f', 'yuv4mpegpipe', feed]);
  if (mk.status !== 0) {
    console.log('! ffmpeg unavailable - skipping');
    results.push({ name: 'camera preview visible (not blank)', ok: null });
    return;
  }
  process.env.AR_SHOT = shot;
  const code = await runNode(['cdp-check.mjs', BASE, join(HERE, 'checks-camera.mjs'),
    '--fake-camera', '--fake-video=' + feed]);
  const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', shot, '-vf', 'scale=1:1',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', px]);
  let ok = false;
  let detail = 'no screenshot produced';
  if (ff.status === 0 && existsSync(px)) {
    const b = readFileSync(px);
    const [r, g, bl] = [b[0], b[1], b[2]];
    ok = r > 25 && g > 60 && g > r + 30 && g > bl + 30;   /* green feed, not the dark page */
    detail = `average pixel rgb(${r},${g},${bl}) - expected ~rgb(46,125,50) (camera), not rgb(4,6,12) (blank)`;
  }
  console.log((ok ? 'PASS' : 'FAIL') + '  rendered pixels come from the camera feed  ->  ' + detail);
  results.push({ name: 'camera preview visible (not blank)', ok: code === 0 && ok });
  delete process.env.AR_SHOT;
  try { rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

const results = [];
async function suite(name, url, checks, extra = []) {
  console.log(`\n\n########## ${name} ##########\n`);
  const code = await runNode(['cdp-check.mjs', url, join(HERE, checks), ...extra]);
  results.push({ name, ok: code === 0 });
}

const server = remote ? null : spawn(process.execPath, ['tools/serve.js', '--port', String(PORT)], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
let tmp = null;

try {
  if (!(await waitFor(BASE, 40))) throw new Error('nothing answering at ' + BASE);
  console.log(remote ? `verifying deployment: ${BASE}` : `dev server up on ${BASE}`);

  if (only === 'all' || only === 'banner') {
    await suite('banner print layout', BASE + 'banner/banner.html', 'checks-banner.mjs');
    await suite('printed QR decodes', BASE + 'banner/banner.html', 'checks-qr.mjs');
  }
  if (only === 'all' || only === 'ar') await suite('app boot / camera / film', BASE, 'checks-ar.mjs', ['--fake-camera', '--spy-gum']);
  if (only === 'all' || only === 'ar' || only === 'camera') await cameraSuite();

  if (only === 'all' || only === 'detect') {
    tmp = mkdtempSync(join(tmpdir(), 'ar-cam-'));
    const y4m = makeFakeCamera(tmp);
    if (y4m) await suite('image tracking (end-to-end)', BASE, 'checks-detect.mjs', ['--fake-camera', '--fake-video=' + y4m]);
    else { console.log('\n! ffmpeg unavailable - skipping the detection suite'); results.push({ name: 'image tracking (end-to-end)', ok: null }); }
  }
} finally {
  if (server) server.kill();
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

/*
 * Installs the ONE thing that needs packages: MindAR's offline image-target compiler.
 *
 *   node setup-toolchain.mjs --compiler
 *
 * Nothing else in this project needs npm:
 *   tools/setup-site.js + tools/make-qr.js  ->  QR + banner  (bundled encoder + PNG writer)
 *   build/verify.mjs                        ->  test suites  (plain Node + Chrome)
 *
 * The compiler needs a patch: mind-ar depends on the native `canvas` package, which builds
 * through node-gyp and wants Python + Visual Studio / Xcode. Its only real use in the
 * offline compiler is createCanvas()/loadImage(), which the prebuilt `@napi-rs/canvas`
 * provides - so we install with --ignore-scripts and drop in a shim.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CANVAS = join(HERE, 'node_modules', 'canvas');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!process.argv.includes('--compiler')) {
  console.log(`
Nothing to install.

  QR + banner   :  node tools/setup-site.js https://your-site/   (no dependencies)
  verification  :  node build/verify.mjs                         (plain Node + Chrome)

  banner image target:  node build/setup-toolchain.mjs --compiler     (installs MindAR + tf.js)
`);
  process.exit(0);
}

console.log('> npm install (ignore-scripts) mind-ar@1.2.5 @napi-rs/canvas@1.0.9');
execFileSync(npm, ['install', '--no-save', '--ignore-scripts', '--no-audit', '--no-fund',
  '--loglevel=error', 'mind-ar@1.2.5', '@napi-rs/canvas@1.0.9'], { cwd: HERE, stdio: 'inherit' });

console.log('> shimming `canvas` -> `@napi-rs/canvas`');
mkdirSync(CANVAS, { recursive: true });
writeFileSync(join(CANVAS, 'package.json'),
  JSON.stringify({ name: 'canvas', version: '2.11.2', main: 'index.js' }, null, 2) + '\n');
writeFileSync(join(CANVAS, 'index.js'), `// shim: re-export the prebuilt @napi-rs/canvas under the name mind-ar expects
const c = require('@napi-rs/canvas');
module.exports = c;
module.exports.createCanvas = c.createCanvas;
module.exports.loadImage = c.loadImage;
module.exports.Canvas = c.Canvas;
module.exports.Image = c.Image;
module.exports.ImageData = c.ImageData;
module.exports.Path2D = c.Path2D;
module.exports.createImageData = c.createImageData;
`);

const probe = join(HERE, 'probe.mjs');
writeFileSync(probe, "import { createCanvas, loadImage } from 'canvas';\n" +
  "console.log('compiler toolchain ok:', typeof createCanvas, typeof loadImage);\n");
execFileSync(process.execPath, [probe], { cwd: HERE, stdio: 'inherit' });

console.log(`
Done. Compile the banner image with:

  node compile-target.mjs ../assets/target.png ../assets/targets.mind
`);

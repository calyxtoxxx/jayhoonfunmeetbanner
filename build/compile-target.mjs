import fs from 'node:fs';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { loadImage } from 'canvas';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('usage: node compile-target.mjs <image> <out.mind>'); process.exit(1); }

const compiler = new OfflineCompiler();
const img = await loadImage(fs.readFileSync(input));
console.log(`target: ${input} (${img.width}x${img.height})`);
let last = -1;
await compiler.compileImageTargets([img], (p) => {
  const pct = Math.floor(p);
  if (pct !== last && pct % 5 === 0) { last = pct; process.stdout.write(`\r  compiling... ${pct}%  `); }
});
const buf = compiler.exportData();
fs.writeFileSync(output, Buffer.from(buf));
console.log(`\nwrote ${output} (${(fs.statSync(output).size / 1048576).toFixed(2)} MB)`);

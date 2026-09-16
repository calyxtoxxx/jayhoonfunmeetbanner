/*
 * Headless Chrome harness (CDP over the built-in WebSocket client).
 *
 *   node cdp-check.mjs <url> <steps.mjs> [--fake-camera]
 *
 * The steps module exports an array of { name, expr?, click?, waitMs?, await? }.
 * Prints PASS/FAIL per step plus every console error / uncaught exception.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [url, stepsFile] = process.argv.slice(2);
const fakeCamera = process.argv.includes('--fake-camera');
const PORT = 9411 + Math.floor(Math.random() * 200);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));

const args = [
  '--headless=new', '--no-first-run', '--no-default-browser-check',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader',   // software WebGL for tf.js
  '--disable-extensions', '--mute-audio', '--window-size=1280,860',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--autoplay-policy=no-user-gesture-required'
];
if (fakeCamera) {
  args.push('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream');
  const fv = process.argv.find((a) => a.startsWith('--fake-video='));
  if (fv) args.push('--use-file-for-fake-video-capture=' + fv.split('=').slice(1).join('='));
}
args.push('about:blank');

const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
chrome.stderr.on('data', (d) => { chromeErr += d.toString(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

async function main() {
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(400);
    try {
      const list = await listTargets();
      target = list.find((t) => t.type === 'page');
    } catch (e) { /* not up yet */ }
  }
  if (!target) throw new Error('chrome devtools never came up\n' + chromeErr.slice(0, 800));

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const consoleAll = [];
  const exceptions = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const line = msg.params.type + ': ' +
        msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
      consoleAll.push(line);
      if (['error', 'warning'].includes(msg.params.type)) consoleErrors.push(line);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      exceptions.push(((d.exception && (d.exception.description || d.exception.value)) || d.text) + '\n    at ' + (d.stackTrace ? d.stackTrace.callFrames.slice(0, 4).map(f => f.functionName + ':' + f.lineNumber).join(' <- ') : ''));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push('log: ' + msg.params.entry.text);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const m = ++id;
    pending.set(m, { resolve, reject });
    ws.send(JSON.stringify({ id: m, method, params }));
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');

  /* --spy-gum records the constraints the page hands to getUserMedia
     (installed before any page script runs) */
  if (process.argv.includes('--spy-gum')) {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(function(){
        var md = navigator.mediaDevices;
        if (!md || !md.getUserMedia) return;
        var orig = md.getUserMedia.bind(md);
        window.__gum = [];
        md.getUserMedia = function(c){
          try { window.__gum.push(JSON.parse(JSON.stringify(c || null))); } catch (e) {}
          return orig(c);
        };
      })();`
    });
  }

  await send('Page.navigate', { url });
  await sleep(2500);

  const steps = (await import(pathToFileURL(stepsFile).href)).default;
  let failed = 0;

  for (const step of steps) {
    if (step.waitMs) await sleep(step.waitMs);
    try {
      if (step.screenshot) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(step.screenshot, Buffer.from(shot.data, 'base64'));
        console.log('PASS  ' + step.name + '  ->  saved ' + step.screenshot);
        continue;
      }
      if (step.click) {
        const c = await send('Runtime.evaluate', {
          expression: '(()=>{const e=document.querySelector(' + JSON.stringify(step.click) +
            ");if(!e)return 'no such element';e.click();return 'clicked';})()",
          returnByValue: true
        });
        const clicked = c.result && c.result.value;
        if (!step.expr) {
          const good = clicked === 'clicked';
          if (!good) failed++;
          console.log(`${good ? 'PASS' : 'FAIL'}  ${step.name}  ->  ${JSON.stringify(clicked)}`);
          continue;
        }
      }
      const r = await send('Runtime.evaluate', {
        expression: step.expr,
        awaitPromise: !!step.await,
        returnByValue: true
      });
      const p = r.exceptionDetails;
      const value = r.result && r.result.value;
      let ok = !p && value !== false && value !== null && value !== undefined;
      if (value && typeof value === 'object' && !Array.isArray(value) && 'ok' in value) ok = !!value.ok;
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${step.name}  ->  ${JSON.stringify(
        p ? { error: (p.exception && p.exception.description) || p.text } : value)}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${step.name}  ->  ${e.message}`);
    }
  }

  console.log('\nconsole log (last 20):');
  consoleAll.slice(-20).forEach((e) => console.log('  . ' + String(e).slice(0, 200)));
  console.log('console errors: ' + (consoleErrors.length || 'none'));
  consoleErrors.slice(0, 12).forEach((e) => console.log('  ! ' + e));
  console.log('exceptions: ' + (exceptions.length || 'none'));
  exceptions.slice(0, 12).forEach((e) => console.log('  ! ' + String(e).split('\n').slice(0, 6).join('\n    ')));

  ws.close();
  chrome.kill();
  await sleep(400);
  try { rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  process.exit(failed || exceptions.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error('harness error: ' + e.message);
  chrome.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch (e2) {}
  process.exit(2);
});



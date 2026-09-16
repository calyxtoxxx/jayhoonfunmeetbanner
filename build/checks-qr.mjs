/* Decodes the QR straight out of the rendered print files, in the browser, with the
   vendored MIT/Apache decoder (build/vendor/jsqr.js). This catches contrast, quiet-zone
   and sizing problems that a pure layout test cannot see. */
export default [
  {
    name: 'load vendored QR decoder',
    expr: "fetch('/build/vendor/jsqr.js').then(r=>r.text()).then(src=>{window.eval(src);return typeof jsQR==='function'})",
    await: true
  },
  {
    name: 'decode banner/qr.png',
    expr: "fetch('/banner/qr.png').then(r=>r.blob()).then(b=>createImageBitmap(b)).then(bm=>{const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');x.drawImage(bm,0,0);const d=x.getImageData(0,0,c.width,c.height);const code=jsQR(d.data,c.width,c.height);window.__qrPng=code&&code.data;return window.__qrPng||false})",
    await: true
  },
  {
    name: 'decode the rendered print file banner/banner.png',
    expr: "fetch('/banner/banner.png').then(r=>r.blob()).then(b=>createImageBitmap(b)).then(bm=>{const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');x.drawImage(bm,0,0);const d=x.getImageData(0,0,c.width,c.height);const code=jsQR(d.data,c.width,c.height);window.__qrPrint=code&&code.data;return window.__qrPrint||false})",
    await: true
  },
  {
    name: 'QR content matches banner/URL.txt',
    expr: "(()=>{const cap=document.querySelector('meta[name=qrcap]');return fetch('/banner/URL.txt').then(r=>r.text()).then(url=>{const want=url.trim();const got=window.__qrPrint;return {ok:!!got&&got.replace(/\\/$/,'')===want.replace(/\\/$/,''),decoded:got,expected:want}})})()",
    await: true
  },
  {
    name: 'both QR renderings agree',
    expr: "(()=>({ok:window.__qrPng===window.__qrPrint,png:window.__qrPng,print:window.__qrPrint}))()"
  }
];

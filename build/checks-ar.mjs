/* index.html checks (run with --fake-camera). The page auto-opens the camera: no UI, no tap. */
export default [
  {
    name: 'libraries load (A-Frame + MindAR)',
    expr: "typeof AFRAME !== 'undefined' && !!AFRAME.components['mindar-image-target'] && !!AFRAME.components['mindar-image'] && !!(window.MINDAR && window.MINDAR.IMAGE && window.MINDAR.IMAGE.Controller)"
  },
  {
    name: 'a-scene loaded + webgl canvas present',
    expr: "(()=>{const s=document.querySelector('a-scene');const c=document.querySelector('.a-canvas');return {loaded:!!s.hasLoaded,canvas:!!c,gl:!!(c&&(c.getContext('webgl2')||c.getContext('webgl')))};})()"
  },
  {
    name: 'no start screen / no branding screen (auto-start)',
    expr: "(()=>({start:!!document.querySelector('#start'),startBtn:!!document.querySelector('#startBtn'),splash:!!document.querySelector('#splash')}))()"
  },
  {
    name: 'only UI element is the fallback tap button, and it is hidden',
    expr: "(()=>{const btns=[...document.querySelectorAll('button')].map(b=>({id:b.id,visible:!!(b.offsetWidth||b.offsetHeight)}));const vis=btns.filter(b=>b.visible);return {buttons:btns, visible:vis.length};})()"
  },
  {
    name: 'camera opened BY ITSELF (no click anywhere)',
    expr: "(()=>{const s=document.querySelector('a-scene').systems['mindar-image-system'];const v=s.video;return {started:!!s.controller&&!!s.video,cameraVideo:!!(v&&v.srcObject),size:v?v.videoWidth+'x'+v.videoHeight:'none'};})()"
  },
  {
    name: 'requested a sharper camera stream (1080p ideal)',
    expr: "(()=>{const g=(window.__gum||[])[0];return {ok:!!(g&&g.video&&g.video.width&&g.video.width.ideal>=1280),requested:g?{width:g.video.width,height:g.video.height,frameRate:g.video.frameRate}:null};})()"
  },
  {
    name: 'single film file loaded from ./assets/video.mp4',
    expr: "(()=>{const v=document.querySelector('#arVideo');return {file:(v.currentSrc||'').split('/').pop(),readyState:v.readyState,size:v.videoWidth+'x'+v.videoHeight};})()"
  },
  {
    name: 'targets.mind + film fetched (network)',
    expr: "(()=>{const n=performance.getEntriesByType('resource').map(r=>r.name.split('/').pop());return {mind:n.includes('targets.mind'),video:n.includes('video.mp4')};})()"
  },
  {
    name: 'film bound as a video texture on the anchor',
    expr: "(()=>{const e=document.querySelector('#film');const m=e.getObject3D('mesh');return {hasMesh:!!m,videoTexture:!!(m&&m.material&&m.material.map&&m.material.map.isVideoTexture)};})()"
  },
  {
    name: 'plane matches the artwork aspect (3120x1110)',
    expr: "(()=>{const e=document.querySelector('#film');const r=+(+e.getAttribute('width')/(+e.getAttribute('height'))).toFixed(3);return {ok:Math.abs(r-2.811)<0.05,ratio:r};})()"
  },
  {
    name: 'camera preview is NOT hidden behind a page background',
    expr: "(()=>{const bodyBg=getComputedStyle(document.body).backgroundColor;return {ok:bodyBg==='rgba(0, 0, 0, 0)'||bodyBg==='transparent',bodyBackground:bodyBg};})()"
  },
  {
    name: 'canvas is transparent (alpha)',
    expr: "(()=>{const c=document.querySelector('.a-canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');const a=gl.getContextAttributes();return {ok:a.alpha!==false,alpha:a.alpha};})()"
  },
  {
    name: 'scanning prompt visible while nothing is tracked',
    expr: "!document.querySelector('#scan').classList.contains('hidden')"
  },
  {
    name: 'artwork anchor still hidden before detection',
    expr: "document.querySelector('#anchor').object3D.visible === false"
  },
  {
    name: 'no error shown on a healthy run',
    expr: "document.querySelector('#error').classList.contains('hidden')"
  }
];

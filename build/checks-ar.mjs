/* End-to-end checks for index.html (run with --fake-camera). */
export default [
  {
    name: 'libraries load (A-Frame + MindAR)',
    expr: "typeof AFRAME !== 'undefined' && !!AFRAME.components['mindar-image-target'] && !!AFRAME.components['mindar-image'] && !!(window.MINDAR && window.MINDAR.IMAGE && window.MINDAR.IMAGE.Controller)"
  },
  {
    name: 'a-scene loaded + webgl canvas present',
    expr: "(()=>{const s=document.querySelector('a-scene');const c=document.querySelector('.a-canvas');return {loaded:!!s.hasLoaded, canvas:!!c, ctx: !!(c && (c.getContext('webgl2')||c.getContext('webgl')))};})()"
  },
  {
    name: 'splash + start button visible on load',
    expr: "(()=>{const s=document.querySelector('#splash');return {splash:!s.classList.contains('hidden'), btn:!!document.querySelector('#startBtn')};})()"
  },
  {
    name: 'install AR event probes',
    expr: "(()=>{window.__ar={ready:false,err:null,found:false};const s=document.querySelector('a-scene');s.addEventListener('arReady',()=>{window.__ar.ready=true});s.addEventListener('arError',e=>{window.__ar.err=JSON.stringify(e.detail)});document.querySelector('#arTarget').addEventListener('targetFound',()=>{window.__ar.found=true});return true;})()"
  },
  { name: 'tap Launch AR', click: '#startBtn' },
  { name: 'wait for camera + engine', expr: 'true', waitMs: 9000 },
  {
    name: 'arReady fired (camera pipeline running)',
    expr: "JSON.stringify(window.__ar)"
  },
  {
    name: 'camera stream live',
    expr: "(()=>{const v=[...document.querySelectorAll('video')].find(x=>x.srcObject);if(!v)return 'no camera video';return v.videoWidth+'x'+v.videoHeight+' playing='+!v.paused;})()"
  },
  {
    name: 'artwork film loaded from ./assets',
    expr: "(()=>{const v=document.querySelector('#arVideo');return {file:(v.currentSrc||'').split('/').pop(),readyState:v.readyState,size:v.videoWidth+'x'+v.videoHeight,paused:v.paused,muted:v.muted};})()"
  },
  {
    name: 'targets.mind + video fetched (network)',
    expr: "(()=>{const names=performance.getEntriesByType('resource').map(r=>r.name.split('/').pop());return {mind:names.includes('targets.mind'),videos:names.filter(n=>/^video-/.test(n))};})()"
  },
  {
    name: 'video texture bound to the AR plane',
    expr: "(()=>{const e=document.querySelector('#arVideoPlane');const m=e.getObject3D('mesh');return {hasMesh:!!m, videoTexture: !!(m&&m.material&&m.material.map&&m.material.map.isVideoTexture)};})()"
  },
  {
    name: 'plane sized to artwork aspect (3120x1110)',
    expr: "(()=>{const e=document.querySelector('#arVideoPlane');return {w:e.getAttribute('width'),h:+(+e.getAttribute('height')).toFixed(4),ratio:+(+e.getAttribute('width')/(+e.getAttribute('height'))).toFixed(3)};})()"
  },
  {
    name: 'scanning hint visible while nothing is tracked',
    expr: "(()=>{const s=document.querySelector('#ar-scanning');return !s.classList.contains('hidden');})()"
  },
  {
    name: 'target anchor hidden before detection',
    expr: "document.querySelector('#arTarget').object3D.visible === false"
  },
  {
    name: 'HUD hidden until the artwork is found',
    expr: "!document.querySelector('#hud').classList.contains('on')"
  },
  {
    name: 'sound toggle drives the video element',
    expr: "(()=>{const b=document.querySelector('#soundBtn');b.click();const v=document.querySelector('#arVideo');const on=!v.muted;b.click();return {unmutedOn:on, mutedAgain:v.muted, pressed:b.getAttribute('aria-pressed')};})()"
  },
  { name: 'open the no-AR fallback player', click: '#watchBtn' },
  { name: 'fallback player has the video', expr: "true", waitMs: 1200 },
  {
    name: 'fallback player state',
    expr: "(()=>{const p=document.querySelector('#player');const v=document.querySelector('#playerVideo');return {open:p.classList.contains('on'),file:(v.currentSrc||'').split('/').pop(),readyState:v.readyState};})()"
  },
  { name: 'close fallback player', click: '#closePlayer' },
  {
    name: 'fallback closed',
    expr: "!document.querySelector('#player').classList.contains('on')"
  }
];

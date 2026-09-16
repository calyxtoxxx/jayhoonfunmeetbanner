/* End-to-end checks for index.html (run with --fake-camera).
   The page is deliberately tiny: start -> camera prompt -> film anchored to the artwork. */
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
    name: 'start screen shows one button, nothing else',
    expr: "(()=>{const s=document.querySelector('#start');const buttons=[...document.querySelectorAll('button')].map(b=>b.id);return {startVisible:!s.classList.contains('hidden'),buttons,scanHidden:document.querySelector('#scan').classList.contains('hidden'),errorHidden:document.querySelector('#error').classList.contains('hidden')};})()"
  },
  {
    name: 'no stray A-Frame UI buttons',
    expr: "(()=>{const b=[...document.querySelectorAll('.a-enter-vr-button,.a-enter-ar-button')];const visible=b.filter(e=>e.offsetWidth||e.offsetHeight);return {ok:visible.length===0,visible:visible.length};})()"
  },
  {
    name: 'no leftover features (no fallback player / fullscreen / HUD / quality switch)',
    expr: "(()=>({player:!!document.querySelector('#player'),hud:!!document.querySelector('#hud'),fullscreen:!!document.querySelector('#fsBtn'),sound:!!document.querySelector('#soundBtn'),urlSwitches:(typeof URLSearchParams!=='undefined'&&/q=|rot=|flip/.test(location.search))}))()"
  },
  {
    name: 'install AR probes',
    expr: "(()=>{window.__ar={ready:false,err:null,found:false};const s=document.querySelector('a-scene');s.addEventListener('arReady',()=>{window.__ar.ready=true});s.addEventListener('arError',e=>{window.__ar.err=JSON.stringify(e.detail)});document.querySelector('#anchor').addEventListener('targetFound',()=>{window.__ar.found=true});return true;})()"
  },
  { name: 'tap Start', click: '#startBtn' },
  { name: 'wait for camera + engine', expr: 'true', waitMs: 9000 },
  { name: 'arReady fired (camera pipeline running)', expr: "JSON.stringify(window.__ar)" },
  {
    name: 'camera stream live',
    expr: "(()=>{const v=[...document.querySelectorAll('video')].find(x=>x.srcObject);return v? v.videoWidth+'x'+v.videoHeight+' playing='+!v.paused : 'no camera video';})()"
  },
  {
    name: 'single film file loaded from ./assets/video.mp4',
    expr: "(()=>{const v=document.querySelector('#arVideo');return {file:(v.currentSrc||'').split('/').pop(),readyState:v.readyState,size:v.videoWidth+'x'+v.videoHeight,heldAtZero:+(v.currentTime.toFixed(2))};})()"
  },
  {
    name: 'targets.mind + film fetched (network)',
    expr: "(()=>{const n=performance.getEntriesByType('resource').map(r=>r.name.split('/').pop());return {mind:n.includes('targets.mind'),video:n.includes('video.mp4'),anyOther:n.filter(x=>/^video-(1080|720)|poster/.test(x))};})()"
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

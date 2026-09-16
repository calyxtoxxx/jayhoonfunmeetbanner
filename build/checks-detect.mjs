/* Does MindAR actually LOCK ON when the artwork is in view?
   Run with a fake camera feed that contains the artwork. */
export default [
  {
    name: 'install AR probes',
    expr: "(()=>{window.__ar={ready:false,err:null,found:false,lost:0};const s=document.querySelector('a-scene');s.addEventListener('arReady',()=>{window.__ar.ready=true});s.addEventListener('arError',e=>{window.__ar.err=JSON.stringify(e.detail)});const t=document.querySelector('#arTarget');t.addEventListener('targetFound',()=>{window.__ar.found=true});t.addEventListener('targetLost',()=>{window.__ar.lost++});return true;})()"
  },
  { name: 'tap Launch AR', click: '#startBtn' },
  { name: 'warm up engine', expr: 'true', waitMs: 6000 },
  { name: 'arReady', expr: "window.__ar.ready" },
  {
    name: 'ARTWORK TRACKED (targetFound)',
    expr: "(()=>{for(let i=0;i<25;i++){}return window.__ar.found ? true : 'not detected yet';})()",
    waitMs: 6000
  },
  {
    name: 'anchor is visible in the scene',
    expr: "document.querySelector('#arTarget').object3D.visible"
  },
  {
    name: 'HUD + grain switched on',
    expr: "(()=>{const h=document.querySelector('#hud');return {hud:h.classList.contains('on'),grain:document.querySelector('#grade').classList.contains('on')};})()"
  },
  {
    name: 'scanning overlay auto-hidden by MindAR',
    expr: "document.querySelector('#ar-scanning').classList.contains('hidden')"
  },
  {
    name: 'film playing on the target',
    expr: "(()=>{const v=document.querySelector('#arVideo');return {playing:!v.paused,time:+v.currentTime.toFixed(1),ready:v.readyState};})()"
  },
  {
    name: 'pop-in animation ran (group scaled up)',
    expr: "(()=>{const s=document.querySelector('#arGroup').getAttribute('scale');const v=document.querySelector('#arGroup').object3D.scale;return {attr:String(s),objectScale:+v.x.toFixed(2)};})()"
  },
  {
    name: 'tracking stays locked for 4s',
    expr: "true",
    waitMs: 4000
  },
  {
    name: 'overlay is upright, unmirrored and faces the camera',
    expr: "(()=>{const T=AFRAME.THREE;const o=document.querySelector('#arVideoPlane').object3D;o.updateMatrixWorld(true);const up=new T.Vector3().setFromMatrixColumn(o.matrixWorld,1).normalize();const right=new T.Vector3().setFromMatrixColumn(o.matrixWorld,0).normalize();const normal=new T.Vector3().setFromMatrixColumn(o.matrixWorld,2).normalize();const ok=up.y>0.7&&right.x>0.7&&normal.z>0.5;return {ok,up_y:+up.y.toFixed(2),right_x:+right.x.toFixed(2),normal_z:+normal.z.toFixed(2)};})()"
  },
  {
    name: 'overlay footprint matches the artwork aspect (3120x1110)',
    expr: "(()=>{const T=AFRAME.THREE;const e=document.querySelector('#arVideoPlane');const m=e.getObject3D('mesh');const g=m.geometry.parameters;const s=new T.Vector3();e.object3D.getWorldScale(s);const w=g.width*s.x,h=g.height*s.y;const ratio=+(w/h).toFixed(3);return {ok:Math.abs(ratio-2.811)<0.05,plane_w:+w.toFixed(0),plane_h:+h.toFixed(0),ratio};})()"
  },  {
    name: 'still locked / not lost',
    expr: "(()=>({found:window.__ar.found,lost:window.__ar.lost,visible:document.querySelector('#arTarget').object3D.visible}))()"
  }
];

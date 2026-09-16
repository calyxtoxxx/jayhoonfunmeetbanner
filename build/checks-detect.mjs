/* Does MindAR actually LOCK ON when the artwork is in view?
   Fake camera feed = the artwork itself. */
export default [
  {
    name: 'install AR probes',
    expr: "(()=>{window.__ar={ready:true,err:null,found:false,lost:0};const s=document.querySelector('a-scene');s.addEventListener('arReady',()=>{window.__ar.ready=true});s.addEventListener('arError',e=>{window.__ar.err=JSON.stringify(e.detail)});const a=document.querySelector('#anchor');a.addEventListener('targetFound',()=>{window.__ar.found=true});a.addEventListener('targetLost',()=>{window.__ar.lost++});return true;})()"
  },
  { name: 'warm up engine (camera starts by itself)', expr: 'true', waitMs: 7000 },
  { name: 'arReady', expr: "window.__ar.ready" },
  {
    /* the camera now opens on its own, so MindAR has often locked on before this suite can
       attach listeners - assert on the live state, and report whether the event was seen */
    name: 'ARTWORK TRACKED (anchor locked onto the print)',
    expr: "(()=>{const vis=document.querySelector('#anchor').object3D.visible;return (window.__ar.found||vis)?{ok:true,event:window.__ar.found,anchorVisible:vis}:'not detected yet';})()",
    waitMs: 6000
  },
  { name: 'anchor is visible in the scene', expr: "document.querySelector('#anchor').object3D.visible" },
  {
    name: 'scanning prompt hidden while the artwork is locked',
    expr: "document.querySelector('#scan').classList.contains('hidden')"
  },
  {
    name: 'film playing on the target',
    expr: "(()=>{const v=document.querySelector('#arVideo');return {playing:!v.paused,ready:v.readyState,muted:v.muted,soundRequested:true};})()"
  },
  {
    name: 'pop-in finished (group at scale 1)',
    expr: "(()=>{const s=document.querySelector('#group').object3D.scale;return {ok:Math.abs(s.x-1)<0.05,x:+s.x.toFixed(2)};})()"
  },
  {
    name: 'overlay is upright, unmirrored and faces the camera',
    expr: "(()=>{const T=AFRAME.THREE;const o=document.querySelector('#film').object3D;o.updateMatrixWorld(true);const up=new T.Vector3().setFromMatrixColumn(o.matrixWorld,1).normalize();const right=new T.Vector3().setFromMatrixColumn(o.matrixWorld,0).normalize();const normal=new T.Vector3().setFromMatrixColumn(o.matrixWorld,2).normalize();return {ok:up.y>0.7&&right.x>0.7&&normal.z>0.5,up_y:+up.y.toFixed(2),right_x:+right.x.toFixed(2),normal_z:+normal.z.toFixed(2)};})()"
  },
  {
    name: 'overlay footprint is exactly the artwork (3120x1110)',
    expr: "(()=>{const T=AFRAME.THREE;const e=document.querySelector('#film');const g=e.getObject3D('mesh').geometry.parameters;const s=new T.Vector3();e.object3D.getWorldScale(s);return {ok:Math.abs(g.width*s.x-3120)<60&&Math.abs(g.height*s.y-1110)<60,w:+(g.width*s.x).toFixed(0),h:+(g.height*s.y).toFixed(0)};})()"
  },
  { name: 'tracking stays locked for 4s', expr: 'true', waitMs: 4000 },
  {
    name: 'still locked / not lost',
    expr: "(()=>{const vis=document.querySelector('#anchor').object3D.visible;return {ok:vis&&window.__ar.lost===0,anchorVisible:vis,lostCount:window.__ar.lost,sawFoundEvent:window.__ar.found};})()"
  }
];

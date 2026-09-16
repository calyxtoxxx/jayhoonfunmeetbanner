/* When a browser refuses to open the camera without a gesture (older iOS, or a blocked
   permission), the page must say why and the tap must actually start the camera. */
export default [
  { name: 'wait for the failed automatic attempt', expr: 'true', waitMs: 5000 },
  {
    name: 'the first camera attempt really was refused',
    expr: "(()=>({ok:(window.__gumFails||0)>=1,fails:window.__gumFails||0}))()"
  },
  {
    name: 'fallback overlay explains what to do',
    expr: "(()=>{const e=document.querySelector('#error');return {ok:!e.classList.contains('hidden'),message:document.querySelector('#errorText').textContent.slice(0,90),button:document.querySelector('#retry').textContent.trim()};})()"
  },
  {
    name: 'scanning prompt is hidden behind the overlay',
    expr: "document.querySelector('#scan').classList.contains('hidden')"
  },
  { name: 'tap the fallback button', click: '#retry' },
  {
    name: 'camera opens on that tap',
    expr: "new Promise(function(res){var t0=Date.now();(function poll(){var sys=document.querySelector('a-scene').systems;var s=sys&&sys['mindar-image-system'];var v=s&&s.video;if(v&&v.srcObject&&v.videoWidth>0)return res({ok:true,size:v.videoWidth+'x'+v.videoHeight});if(Date.now()-t0>15000)return res({ok:false,timedOut:true});setTimeout(poll,200)})()})",
    await: true
  },
  {
    name: 'overlay gone and the prompt is back',
    expr: "(()=>({ok:document.querySelector('#error').classList.contains('hidden')&&!document.querySelector('#scan').classList.contains('hidden'),scanText:document.querySelector('#scanText').textContent}))()"
  },
  {
    name: 'the dead camera element from the failed attempt was cleaned up',
    expr: "(()=>{const n=document.querySelectorAll('body > video').length;return {ok:n<=1,cameraElements:n};})()"
  }
];

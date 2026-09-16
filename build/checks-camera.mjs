/* What the AR view looks like when the banner is NOT in frame: it must show the live camera,
   never a blank/black screen. The screenshot is colour-analysed by verify.mjs. */
export default [
  { name: 'wait for the camera to start', expr: 'true', waitMs: 8000 },
  {
    name: 'camera video is streaming',
    expr: "(()=>{const s=document.querySelector('a-scene').systems['mindar-image-system'];const v=s&&s.video;return {ok:!!(v&&v.srcObject&&v.videoWidth>0),size:v?v.videoWidth+'x'+v.videoHeight:'none'};})()"
  },
  {
    name: 'nothing is tracked yet',
    expr: "document.querySelector('#anchor').object3D.visible === false"
  },
  { name: 'screenshot of the AR view (no banner in frame)', screenshot: process.env.AR_SHOT }
];

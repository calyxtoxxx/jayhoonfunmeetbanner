export default [
  { name: 'start (button if the page still has one)', expr: "(()=>{const b=document.querySelector('#startBtn');if(b){b.click();return 'clicked'}return 'auto-start'})()" },
  { name: 'wait for the camera', expr: "true", waitMs: 8000 },
  {
    name: 'body/canvas background state',
    expr: "(()=>{const cs=getComputedStyle(document.body);const v=[...document.querySelectorAll('video')].find(x=>x.srcObject);return {bodyBackground:cs.backgroundColor,htmlBackground:getComputedStyle(document.documentElement).backgroundColor,cameraVideo:!!v,cameraSize:v?v.videoWidth+'x'+v.videoHeight:'none'};})()"
  },
  { name: 'screenshot of the AR view (no artwork in frame)', screenshot: 'C:/Users/Admin/AppData/Local/Temp/ar-blank.png' }
];

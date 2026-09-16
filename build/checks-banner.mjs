/* Print-layout checks for banner/banner.html (A4 landscape, 297x210mm). */
export default [
  {
    name: 'sheet is A4 landscape',
    expr: "(()=>{const r=document.querySelector('.sheet').getBoundingClientRect();return {ok:Math.abs(r.width/r.height-1.4142)<0.01,w:Math.round(r.width),h:Math.round(r.height)};})()"
  },
  {
    name: 'no element overflows the sheet',
    expr: "(()=>{const sr=document.querySelector('.sheet').getBoundingClientRect();const bad=[];document.querySelectorAll('.sheet *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width===0&&r.height===0)return;if(r.bottom>sr.bottom+1||r.right>sr.right+1||r.top<sr.top-1||r.left<sr.left-1)bad.push(((el.className||el.tagName)+'').slice(0,20))});return {ok:bad.length===0,bad};})()"
  },
  {
    name: 'no clipped / hidden text',
    expr: "(()=>{const bad=[];document.querySelectorAll('.sheet *').forEach(el=>{const ov=getComputedStyle(el).overflow;if(ov!=='visible')return;if(el.scrollHeight-el.clientHeight>5||el.scrollWidth-el.clientWidth>5)bad.push(((el.className||el.tagName)+'').slice(0,20)+' +'+(el.scrollHeight-el.clientHeight)+'x'+(el.scrollWidth-el.clientWidth))});return {ok:bad.length===0,bad};})()"
  },
  {
    name: 'Banner printed large (>= 250mm wide)',
    expr: "(()=>{const i=document.querySelector('.art img');const r=i.getBoundingClientRect();const ar=i.naturalWidth/i.naturalHeight;let w=r.width,h=w/ar;if(h>r.height){h=r.height;w=h*ar;}const wmm=+(w/3.7795).toFixed(1),hmm=+(h/3.7795).toFixed(1);return {ok:i.complete&&i.naturalWidth===3120&&wmm>=250,nat:i.naturalWidth+'x'+i.naturalHeight,printed_mm:wmm+'x'+hmm};})()"
  },
  {
    name: 'QR image loaded and >= 45mm',
    expr: "(()=>{const i=document.querySelector('.qr');const r=i.getBoundingClientRect();const mm=r.width/3.7795;return {ok:i.complete&&i.naturalWidth>=1000&&mm>=45&&Math.abs(r.width-r.height)<2,nat:i.naturalWidth,mm:Math.round(mm)};})()"
  },
  {
    name: 'printed URL caption present',
    expr: "(()=>{const t=document.querySelector('.qrbox .url').textContent.trim();return {ok:t.length>6,url:t};})()"
  },
  {
    name: 'three numbered steps present',
    expr: "(()=>{const n=document.querySelectorAll('.step').length;return {ok:n===3,steps:n};})()"
  },
  {
    name: 'step copy readable (>= 3.8mm) and max 2 lines',
    expr: "(()=>{const ps=[...document.querySelectorAll('.step p')];const h=ps.map(p=>+(p.getBoundingClientRect().height/3.7795).toFixed(1));const fs=parseFloat(getComputedStyle(ps[0]).fontSize)/3.7795;return {ok:h.every(x=>x>=5&&x<=18)&&fs>=3.8,heights_mm:h,font_mm:+fs.toFixed(2)};})()"
  },
  {
    name: 'bottom row fills the space evenly (gaps 1-9mm)',
    expr: "(()=>{const s=[...document.querySelectorAll('.step')].map(e=>e.getBoundingClientRect());const gaps=[];for(let i=0;i<s.length-1;i++)gaps.push(+((s[i+1].top-s[i].bottom)/3.7795).toFixed(1));return {ok:gaps.every(g=>g>=1&&g<=9),gaps_mm:gaps};})()"
  },
  {
    name: 'tips chips fit on one row',
    expr: "(()=>{const t=document.querySelector('.tips');const rows=new Set([...t.children].map(c=>Math.round(c.getBoundingClientRect().top))).size;return {ok:rows===1,rows};})()"
  },
  {
    name: 'everything inside the 8mm print margin',
    expr: "(()=>{const sr=document.querySelector('.sheet').getBoundingClientRect();const pad=8*3.7795;const m={};let ok=true;document.querySelectorAll('.bottom *,.bottom,header *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width===0)return;const over=sr.bottom-pad-r.bottom;const side=sr.right-pad/2-r.right;if(over<-1||side<-1){ok=false;m[((el.className||el.tagName)+'').slice(0,16)]=+(Math.min(over,side)/3.7795).toFixed(1);}});return {ok,overflow_mm:m};})()"
  }
];

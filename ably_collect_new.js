// [1단계] 에이블리 새 리뷰 수집 + 사진 축소 — 크롬 탭 https://my.a-bly.com/reviews 에서 javascript_tool 로 실행
// 실행 전 window.NV_LAST_SNO 에 state.json 의 last_sno 를 넣어둘 것. 결과는 ~/Downloads/new_reviews.json 으로 다운로드.
// 진행 상태: window.__nv ({done, n, imgs, err})
(async()=>{
  const LAST = window.NV_LAST_SNO; if(!LAST) { window.__nv={err:'NV_LAST_SNO 없음'}; return; }
  window.__nv={done:false,n:0,imgs:0,err:null};
  const tok=decodeURIComponent(document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('ably-seller-admin-jwt-token=')).split('=').slice(1).join('='));
  const H={'Authorization':'JWT '+tok,'Accept':'application/json'};
  const rows=[]; let stop=false;
  for(let p=1;p<=50 && !stop;p++){
    const r=await fetch('https://api.a-bly.com/seller/reviews/?page='+p+'&per_page=100&order_by=LATEST',{headers:H});
    if(!r.ok){ window.__nv.err='reviews '+r.status; return; }
    const j=await r.json();
    for(const x of j.reviews){ if(x.sno<=LAST){ stop=true; break; }
      rows.push({sno:x.sno,c:x.contents,img:x.images||[],at:x.created_at,g:x.goods&&x.goods.sno,gn:x.goods&&x.goods.name,sz:x.size,sat:x.satisfaction,st:x.status}); }
    if(j.reviews.length<100) break;
  }
  const sel=rows.filter(r=>r.sat && r.st===1 && (r.img.length || (r.c||'').trim().length>=30));
  const toB64=b=>new Promise(res=>{const fr=new FileReader(); fr.onload=()=>res(fr.result.split(',')[1]); fr.readAsDataURL(b);});
  async function shrink(b){ const bmp=await createImageBitmap(b); const s=Math.min(1,720/Math.max(bmp.width,1)); const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(bmp.width*s)); c.height=Math.max(1,Math.round(bmp.height*s)); c.getContext('2d').drawImage(bmp,0,0,c.width,c.height); return await new Promise(res=>c.toBlob(res,'image/webp',0.8)); }
  const images=[];
  for(const r of sel){ for(let i=0;i<r.img.length;i++){ try{ const b=await (await fetch(r.img[i])).blob(); const sb=await shrink(b); images.push({k:r.sno+'_'+i,d:await toB64(sb)}); window.__nv.imgs++; }catch(e){} } }
  const blob=new Blob([JSON.stringify({collected:rows.length,max_sno:rows.length?Math.max(...rows.map(r=>r.sno)):LAST,reviews:sel,images})],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='new_reviews.json'; document.body.appendChild(a); a.click();
  window.__nv.n=sel.length; window.__nv.collected=rows.length; window.__nv.done=true;
})();

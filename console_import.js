// 에이블리 리뷰 → 카페24 REVIEW 게시판(board_no 4) 대량 등록 — 크롬 콘솔(nuavu.cafe24api.com 탭)에 붙여넣기
// 진행 상태는 localStorage.nv_rv_done(등록된 sno→article_no)에 저장되어 중간에 끊겨도 다시 붙여넣으면 이어서 함.
// 끝나면 imported.json 이 다운로드됨 (sno → article_no 매핑).  멈추려면 콘솔에 nvStop=true
(async()=>{
  const SRC='https://dla3813-crypto.github.io/nuavu-reviews/posts.json', BOARD=4, BATCH=10;
  window.nvStop=false;
  let tok=JSON.parse(localStorage.getItem('nv_tok'));
  async function refresh(){ if(new Date(tok.expires_at+'+09:00')-Date.now()>15*60*1000) return;
    const r=await fetch('/api/v2/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Authorization':'Basic '+btoa(localStorage.getItem('nv_client')+':'+localStorage.getItem('nv_secret'))},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:tok.refresh_token})});
    const j=await r.json(); if(!j.access_token) throw new Error('token refresh fail'); localStorage.setItem('nv_tok',JSON.stringify(j)); tok=j; }
  const posts=await (await fetch(SRC+'?v='+Date.now())).json();
  const done=JSON.parse(localStorage.getItem('nv_rv_done')||'{}');
  const todo=posts.filter(p=>!done[p.sno]);
  console.log('전체',posts.length,'이미 등록',Object.keys(done).length,'남음',todo.length);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const mk=p=>({title:p.title,content:p.content,writer:p.writer,product_no:p.product_no,rating:p.rating,input_channel:'P',display:'T',client_ip:'127.0.0.1',created_date:p.created_date});
  async function post(arr){ await refresh();
    const r=await fetch('/api/v2/admin/boards/'+BOARD+'/articles',{method:'POST',headers:{'Authorization':'Bearer '+tok.access_token,'Content-Type':'application/json'},body:JSON.stringify({shop_no:1,requests:arr.map(mk)})});
    if(r.status===429){ await sleep(3000); return post(arr); }
    const j=await r.json().catch(()=>({}));
    return {status:r.status, articles:(j.articles||[]).map(a=>a.article_no), err:j.error&&j.error.message};
  }
  let ok=0, fail=[]; const t0=Date.now();
  for(let i=0;i<todo.length;i+=BATCH){ if(window.nvStop){ console.log('중단'); break; }
    const b=todo.slice(i,i+BATCH); let res=await post(b);
    if(res.status===201 && res.articles.length===b.length){ b.forEach((p,k)=>done[p.sno]=res.articles[k]); ok+=b.length; }
    else { for(const p of b){ const r1=await post([p]); if(r1.status===201 && r1.articles.length){ done[p.sno]=r1.articles[0]; ok++; } else { fail.push({sno:p.sno,err:r1.err||r1.status}); } await sleep(400); } }
    localStorage.setItem('nv_rv_done',JSON.stringify(done));
    if((i/BATCH)%20===0) console.log('진행',ok+'/'+todo.length,'실패',fail.length, Math.round((Date.now()-t0)/1000)+'s');
    await sleep(500);
  }
  console.log('완료 등록',ok,'실패',fail.length, fail.slice(0,5));
  const blob=new Blob([JSON.stringify({done,fail})],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='imported.json'; document.body.appendChild(a); a.click();
})();

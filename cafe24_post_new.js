// [3단계] new_posts.json 을 카페24 REVIEW 게시판에 등록 — 크롬 탭 https://nuavu.cafe24api.com/... 에서 javascript_tool 로 실행
// 등록된 sno 는 localStorage.nv_rv_done 에 누적(중복 방지). 결과: window.__nvpost = {done, ok, fail:[...]}
// 글마다 비밀번호(password)를 넣어 비회원 수정이 막히도록 한다.
(async()=>{
  window.__nvpost={done:false,ok:0,fail:[],skipped:0};
  const SRC='https://dla3813-crypto.github.io/nuavu-reviews/new_posts.json', BOARD=4;
  let tok=JSON.parse(localStorage.getItem('nv_tok')||'null'); if(!tok){ window.__nvpost.err='NO_TOKEN'; window.__nvpost.done=true; return; }
  async function refresh(){ if(new Date(tok.expires_at+'+09:00')-Date.now()>15*60*1000) return;
    const r=await fetch('/api/v2/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Authorization':'Basic '+btoa(localStorage.getItem('nv_client')+':'+localStorage.getItem('nv_secret'))},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:tok.refresh_token})});
    const j=await r.json(); if(!j.access_token) throw new Error('TOKEN_REFRESH_FAIL'); localStorage.setItem('nv_tok',JSON.stringify(j)); tok=j; }
  const posts=await (await fetch(SRC+'?v='+Date.now())).json();
  const done=JSON.parse(localStorage.getItem('nv_rv_done')||'{}');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  for(const p of posts){ if(done[p.sno]){ window.__nvpost.skipped++; continue; }
    try{ await refresh();
      const body={shop_no:1,requests:[{title:p.title,content:p.content,writer:p.writer,password:p.password,product_no:p.product_no,rating:p.rating,input_channel:'P',display:'T',client_ip:'127.0.0.1',created_date:p.created_date}]};
      let r=await fetch('/api/v2/admin/boards/'+BOARD+'/articles',{method:'POST',headers:{'Authorization':'Bearer '+tok.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(r.status===429){ await sleep(3000); r=await fetch('/api/v2/admin/boards/'+BOARD+'/articles',{method:'POST',headers:{'Authorization':'Bearer '+tok.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)}); }
      const j=await r.json().catch(()=>({}));
      if(r.status===201 && j.articles && j.articles[0]){ done[p.sno]=j.articles[0].article_no; window.__nvpost.ok++; }
      else window.__nvpost.fail.push({sno:p.sno,status:r.status,err:j.error&&j.error.message});
    }catch(e){ window.__nvpost.fail.push({sno:p.sno,err:String(e)}); if(/TOKEN/.test(String(e))) break; }
    localStorage.setItem('nv_rv_done',JSON.stringify(done)); await sleep(600);
  }
  window.__nvpost.done=true;
})();

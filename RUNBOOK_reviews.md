# 에이블리 새 리뷰 → 자사몰(cafe24) 상품후기 자동 추가 — 실행 절차 (예약 작업용, 하루 1회)

목표: 에이블리 셀러 API에서 마지막 반영 이후의 새 리뷰를 받아, 사진은 GitHub(dla3813-crypto/nuavu-reviews, Pages)에 올리고, 글은 카페24 REVIEW 게시판(board_no 4)에 등록한다.
파일: 연결 폴더 `~/Desktop/클로드/에이블리리뷰이식/` (이 절차서, ably_collect_new.js, build_new.py, cafe24_post_new.js). GitHub 토큰은 `~/Desktop/클로드/카페24오늘출발 갱신/github_token.txt`.
선정 기준: 만족 + (사진 있음 또는 본문 30자 이상) + 카페24 상품 매칭됨. 제목 = 본문 첫 문장 ~24자. 작성자 "에이블리 구매자", 별점 5, 글 비밀번호 랜덤.
상태: 저장소의 `state.json` (`last_sno` = 마지막으로 처리한 에이블리 리뷰 번호). 카페24 등록 중복 방지는 cafe24api 탭 localStorage `nv_rv_done`.

## 0. 전제
- 크롬에 에이블리 셀러(my.a-bly.com) 로그인 세션, 카페24 앱 토큰(nuavu.cafe24api.com localStorage nv_tok)이 있어야 한다. 둘 중 하나라도 없으면 중단하고 한 줄 보고.
- 작업용 크롬 탭은 새로 열고 끝나면 닫는다. 토큰·시크릿 값은 절대 출력하지 않는다.

## 1. 저장소 준비 (device_bash)
```bash
D="$(ls -d $HOME/mnt/*/ | grep -v -E 'Claude|Downloads' | head -1)"; T=$(tr -d '\r\n ' < "$D/카페24오늘출발 갱신/github_token.txt")
cd $HOME && rm -rf nuavu-reviews nuavu-today
git clone -q --depth 1 "https://x-access-token:${T}@github.com/dla3813-crypto/nuavu-reviews.git" && git clone -q --depth 1 "https://x-access-token:${T}@github.com/dla3813-crypto/nuavu-today.git"
cat nuavu-reviews/state.json
```
`last_sno` 값을 기억한다.

## 2. 에이블리 새 리뷰 수집 (크롬)
1. 새 탭으로 `https://my.a-bly.com/reviews` 열기. 로그인 화면이면 중단·보고.
2. javascript_tool: `window.NV_LAST_SNO = <last_sno>` 실행 후, `에이블리리뷰이식/ably_collect_new.js` 전문 실행 (device_bash `cat` 으로 읽어서 그대로 넣는다).
3. 10초 간격으로 `window.__nv` 확인 → `done:true` 까지 (보통 1분 내). `err` 가 있으면 보고 후 중단. `n`(선별 건수)이 0이면 "새 리뷰 없음"으로 끝낸다(이후 단계 생략).
4. `~/Downloads/new_reviews.json` 이 생겼는지 device_bash 로 확인.

## 3. 사진·등록 데이터 생성 + 푸시 (device_bash)
```bash
D="$(ls -d $HOME/mnt/*/ | grep -v -E 'Claude|Downloads' | head -1)"; T=$(tr -d '\r\n ' < "$D/카페24오늘출발 갱신/github_token.txt")
F=$(ls -t "$HOME/mnt/Downloads"/new_reviews*.json | head -1)
cd $HOME/nuavu-reviews && python3 "$D/에이블리리뷰이식/build_new.py" --new "$F" --repo . --today-map $HOME/nuavu-today/map.json
git config user.email dla3813@gmail.com && git config user.name nuavu-bot
git add -A && git commit -qm "새 리뷰 $(TZ=Asia/Seoul date '+%m-%d')" && timeout 160 git push -q "https://x-access-token:${T}@github.com/dla3813-crypto/nuavu-reviews.git" main && echo pushed
mkdir -p "$HOME/mnt/Downloads/_ezadmin_old" && mv -n "$F" "$HOME/mnt/Downloads/_ezadmin_old/"
```
출력의 `posts N` 이 등록할 건수. 푸시 후 **90초 대기**(Pages 반영) → 크롬으로 `https://dla3813-crypto.github.io/nuavu-reviews/new_posts.json?v=<now>` 가 방금 건수로 보이는지 확인.

## 4. 카페24 등록 (크롬)
1. 새 탭으로 `https://nuavu.cafe24api.com/api/v2/admin/categories/58` 열기(401 JSON 정상).
2. `에이블리리뷰이식/cafe24_post_new.js` 전문을 javascript_tool 로 실행.
3. 10초 간격으로 `window.__nvpost` 확인 → `done:true`. `ok`/`fail` 집계. `err:'NO_TOKEN'` 또는 fail 에 TOKEN 이 있으면 "카페24 앱 인증 다시 필요"로 보고.

## 5. 보고
- 정상: 한 줄 `리뷰 추가 완료 — 수집 C / 등록 K / 미매칭 U` (U는 build_new.py 출력의 미매칭). 새 리뷰 없으면 `새 리뷰 없음`.
- 이상(로그인 풀림·토큰 만료·푸시 실패·등록 실패 다수): 무엇이 막혔는지 한 줄 + 사장님 조치 필요 여부. 정상 완료는 알림 없이 조용히 끝낸다.

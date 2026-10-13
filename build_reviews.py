#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
에이블리 리뷰 → 카페24 상품후기 이식: 데이터 준비 스크립트
  입력: ably_reviews_2y.json (크롬 수집본), goods_map.json (에이블리 goods sno → 카페24 product_no),
        rvw_*.json (크롬에서 720px webp 로 줄인 사진 번들, base64)
  출력: <repo>/i/<리뷰sno>_<n>.webp  (GitHub Pages 로 서빙)
        posts.json  = 카페24 게시판 API 등록용 배열 [{sno, product_no, title, content, rating, created_date}]
선정 기준: 만족(sat) + 상태 1 + 상품 매칭됨 + (사진 있음 or 본문 30자 이상)
제목: 본문 첫 문장 20자 안팎 (없으면 '만족해요')
"""
import json, os, re, base64, glob, argparse, html

BASE = 'https://dla3813-crypto.github.io/nuavu-reviews/i/'

def make_title(c):
    s = re.sub(r'\s+', ' ', (c or '')).strip()
    s = re.sub(r'[\U0001F300-\U0001FAFF☀-➿]+', '', s).strip()   # 이모지 제거
    if not s: return '만족해요'
    m = re.split(r'(?<=[.!?~])\s|\n', s)[0].strip()
    t = m if 4 <= len(m) <= 28 else s[:24].rstrip()
    if len(s) > len(t): t = t.rstrip(' ,.!~') + '…' if not t.endswith(('.', '!', '~')) else t
    return t[:40]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--reviews', required=True); ap.add_argument('--goods', required=True)
    ap.add_argument('--bundles', required=True, help='rvw_*.json 이 있는 폴더')
    ap.add_argument('--repo', required=True, help='nuavu-reviews clone 경로'); ap.add_argument('--out', required=True)
    ap.add_argument('--writer', default='에이블리 구매자')
    a = ap.parse_args()
    rows = json.load(open(a.reviews, encoding='utf-8'))
    gmap = {int(k): v for k, v in json.load(open(a.goods, encoding='utf-8')).items()}
    idir = os.path.join(a.repo, 'i'); os.makedirs(idir, exist_ok=True)
    have = set()
    for f in sorted(glob.glob(os.path.join(a.bundles, 'rvw_*.json'))):
        for x in json.load(open(f, encoding='utf-8')):
            p = os.path.join(idir, x['k'] + '.webp')
            if not os.path.exists(p):
                open(p, 'wb').write(base64.b64decode(x['d']))
            have.add(x['k'])
    posts = []; noimg = 0
    for r in rows:
        if not (r.get('sat') and r.get('st') == 1 and r.get('g') in gmap): continue
        c = (r.get('c') or '').strip()
        imgs = [r['sno'] and f"{r['sno']}_{i}" for i in range(len(r.get('img') or []))]
        imgs = [k for k in imgs if k in have]
        if not imgs and len(c) < 30: continue
        if r.get('img') and not imgs: noimg += 1
        body = '<p>' + html.escape(c).replace('\n', '<br>') + '</p>'
        if r.get('sz') and r['sz'] != '없음': body += f"<p style=\"color:#888;font-size:12px\">구매 사이즈: {html.escape(r['sz'])}</p>"
        for k in imgs: body += f'<p><img src="{BASE}{k}.webp" style="max-width:100%"></p>'
        posts.append({'sno': r['sno'], 'product_no': gmap[r['g']], 'title': make_title(c), 'content': body,
                      'rating': 5, 'writer': a.writer, 'created_date': r['at'] + '+09:00', 'imgs': len(imgs)})
    posts.sort(key=lambda p: p['created_date'])          # 오래된 것부터 등록 → 게시판 순서 자연스럽게
    json.dump(posts, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'posts {len(posts)} / with image {sum(1 for p in posts if p["imgs"])} / images saved {len(have)} / 사진 누락으로 사진 없이 등록 {noimg}')

if __name__ == '__main__':
    main()

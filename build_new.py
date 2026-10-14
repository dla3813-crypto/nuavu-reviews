#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[2단계] 새 리뷰 → 사진 저장 + 등록용 new_posts.json + state.json 갱신 (VM, nuavu-reviews clone 안에서 실행)
  python3 build_new.py --new ~/mnt/Downloads/new_reviews.json --repo ~/nuavu-reviews --today-map ~/nuavu-today/map.json
상품 매칭: repo/goods_map.json(에이블리 goods sno → 카페24 product_no) 우선, 없으면 카페24 상품명(map.json)과 이름 정규화 비교로 찾아 goods_map.json 에 추가.
"""
import json, os, re, base64, argparse, html, random, string

BASE = 'https://dla3813-crypto.github.io/nuavu-reviews/i/'

def norm(s):
    s = str(s or ''); s = re.sub(r'\[[^\]]*\]', '', s); s = re.sub(r'\([^)]*\)', '', s); s = re.sub(r'[^\w가-힣]', '', s); return s.lower()

def to_no(c):
    n = 0
    for ch in c[1:]: n = n * 26 + (0 if ch == '0' else ord(ch) - 65)
    return n

def make_title(c):
    s = re.sub(r'\s+', ' ', (c or '')).strip()
    s = re.sub(r'[\U0001F300-\U0001FAFF☀-➿]+', '', s).strip()
    if not s: return '만족해요'
    m = re.split(r'(?<=[.!?~])\s|\n', s)[0].strip()
    t = m if 4 <= len(m) <= 28 else s[:24].rstrip()
    if len(s) > len(t) and not t.endswith(('.', '!', '~')): t = t.rstrip(' ,.!~') + '…'
    return t[:40]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--new', required=True); ap.add_argument('--repo', required=True); ap.add_argument('--today-map')
    ap.add_argument('--writer', default='에이블리 구매자')
    a = ap.parse_args()
    data = json.load(open(a.new, encoding='utf-8'))
    gpath = os.path.join(a.repo, 'goods_map.json'); gmap = {int(k): v for k, v in json.load(open(gpath, encoding='utf-8')).items()}
    spath = os.path.join(a.repo, 'state.json'); state = json.load(open(spath, encoding='utf-8'))
    cafe = {}
    if a.today_map and os.path.exists(a.today_map):
        for p in json.load(open(a.today_map, encoding='utf-8')): cafe.setdefault(norm(p['name']), to_no(p['code']))
    idir = os.path.join(a.repo, 'i'); os.makedirs(idir, exist_ok=True)
    have = set()
    for x in data.get('images', []):
        open(os.path.join(idir, x['k'] + '.webp'), 'wb').write(base64.b64decode(x['d'])); have.add(x['k'])
    posts = []; unmatched = {}; added_map = 0
    for r in data['reviews']:
        g = r.get('g')
        if g not in gmap:
            no = cafe.get(norm(r.get('gn')))
            if no: gmap[g] = no; added_map += 1
            else: unmatched[r.get('gn')] = unmatched.get(r.get('gn'), 0) + 1; continue
        c = (r.get('c') or '').strip()
        imgs = [f"{r['sno']}_{i}" for i in range(len(r.get('img') or [])) if f"{r['sno']}_{i}" in have]
        if not imgs and len(c) < 30: continue
        body = '<p>' + html.escape(c).replace('\n', '<br>') + '</p>'
        if r.get('sz') and r['sz'] != '없음': body += f"<p style=\"color:#888;font-size:12px\">구매 사이즈: {html.escape(r['sz'])}</p>"
        for k in imgs: body += f'<p><img src="{BASE}{k}.webp" style="max-width:100%"></p>'
        pw = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        posts.append({'sno': r['sno'], 'product_no': gmap[g], 'title': make_title(c), 'content': body, 'rating': 5,
                      'writer': a.writer, 'password': pw, 'created_date': r['at'] + '+09:00', 'imgs': len(imgs)})
    posts.sort(key=lambda p: p['created_date'])
    json.dump(posts, open(os.path.join(a.repo, 'new_posts.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump({str(k): v for k, v in gmap.items()}, open(gpath, 'w', encoding='utf-8'), ensure_ascii=False)
    state['last_sno'] = max(state.get('last_sno', 0), int(data.get('max_sno') or 0))
    state['pending_posts'] = len(posts)
    um = state.setdefault('unmatched', {})
    for k, v in unmatched.items(): um[k] = um.get(k, 0) + v
    json.dump(state, open(spath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"collected {data.get('collected')} / selected {len(data['reviews'])} / posts {len(posts)} / images {len(have)} / 상품매칭 추가 {added_map} / 미매칭 {sum(unmatched.values())} / last_sno {state['last_sno']}")

if __name__ == '__main__':
    main()

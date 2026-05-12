import sys, requests, urllib.parse, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DC0 = 'zhSYMUJyLxyPTomMBKO2fCYeA4HRFlR4Unc=|1777000405'
ZC0 = ('2|1:0|10:1777001664|4:z_c0|92:'
       'Mi4xVG50RDFnVUFBQURPRkpneFFuSXZIQ1lBQUFCZ0FsVk51ekxZYWdEZGEzeE9sc0VOQUZmVE1lcHVMX012YmktOUZ3|'
       'd022b6c9408f861dede6fa8003adb7b11b6199b5b779abb294f66f272e5a9960')

q = urllib.parse.quote('计算机科学与技术 劝退')
api = f'/api/v4/search_v3?t=general&q={q}&correction=1&offset=0&limit=5'

r = requests.post('http://127.0.0.1:3000/get_sign',
                  json={'url': api, 'dc0': DC0},
                  timeout=5, proxies={'http': None, 'https': None})
sig = r.json().get('signature')
print(f'Signature: {sig[:30]}...')

resp = requests.get('https://www.zhihu.com' + api, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    'x-zse-93': '101_3_3.0',
    'x-zse-96': sig,
    'Cookie': f'd_c0="{DC0}"; z_c0="{ZC0}"',
    'Connection': 'close',
}, timeout=15)

print(f'HTTP {resp.status_code}')
data = resp.json()
items = data.get('data', [])
print(f'Total items: {len(items)}')

for i, item in enumerate(items[:5]):
    print(f'\n--- item[{i}] ---')
    print(f'  item.type      = {item.get("type")}')
    obj = item.get('object', {})
    print(f'  object.type    = {obj.get("type")}')
    print(f'  object.keys    = {list(obj.keys())[:10]}')
    if 'question' in obj:
        q2 = obj['question']
        print(f'  question.id    = {q2.get("id")}')
        print(f'  answer_count   = {q2.get("answer_count")}')
        print(f'  title          = {q2.get("title", "")[:60]}')
    elif 'id' in obj:
        print(f'  obj.id         = {obj.get("id")}')
        print(f'  answer_count   = {obj.get("answer_count")}')
        print(f'  title          = {obj.get("title", obj.get("name",""))[:60]}')

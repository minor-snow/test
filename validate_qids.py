"""
验证并清理无效的 question_id：
- 19位超长 ID → 验证是否能访问 /api/v4/questions/{id}
- 如果返回 404 → 标记 DEAD 并记录
"""
import sys, sqlite3, requests, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DC0 = 'zhSYMUJyLxyPTomMBKO2fCYeA4HRFlR4Unc=|1777000405'
ZC0 = ('2|1:0|10:1777001664|4:z_c0|92:'
       'Mi4xVG50RDFnVUFBQURPRkpneFFuSXZIQ1lBQUFCZ0FsVk51ekxZYWdEZGEzeE9sc0VOQUZmVE1lcHVMX012YmktOUZ3|'
       'd022b6c9408f861dede6fa8003adb7b11b6199b5b779abb294f66f272e5a9960')

db = r'H:\Analysis\zhihu\bot_database.db'
RPC = 'http://127.0.0.1:3000/get_sign'

with sqlite3.connect(db) as conn:
    long_ids = [r[0] for r in conn.execute(
        "SELECT question_id FROM question_tasks WHERE state='READY' AND LENGTH(question_id) > 12"
    ).fetchall()]

print(f'待验证超长 ID: {len(long_ids)} 个\n')

session = requests.Session()
session.trust_env = False

dead_ids  = []
valid_ids = []

for qid in long_ids:
    api = f'/api/v4/questions/{qid}?include=answer_count,title'
    try:
        r = session.post(RPC, json={'url': api, 'dc0': DC0},
                         timeout=5, proxies={'http': None, 'https': None})
        sig = r.json().get('signature', '')
    except Exception as e:
        print(f'  [RPC ERR] {qid}: {e}')
        continue

    try:
        resp = session.get(f'https://www.zhihu.com{api}', timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 Chrome/124.0.0.0',
            'x-zse-93': '101_3_3.0', 'x-zse-96': sig,
            'Cookie': f'd_c0="{DC0}"; z_c0="{ZC0}"', 'Connection': 'close',
        })
        if resp.status_code == 200:
            d = resp.json()
            title = d.get('title', '')[:40]
            ans   = d.get('answer_count', '?')
            print(f'  [OK  ] {qid} → 回答:{ans} | {title}')
            valid_ids.append(qid)
        elif resp.status_code == 404:
            print(f'  [404 ] {qid} → 不是有效 question_id，标记 DEAD')
            dead_ids.append(qid)
        else:
            print(f'  [HTTP {resp.status_code}] {qid}')
    except Exception as e:
        print(f'  [ERR ] {qid}: {e}')

    time.sleep(0.5)

# 清理 dead
if dead_ids:
    with sqlite3.connect(db) as conn:
        conn.executemany(
            "UPDATE question_tasks SET state='DEAD', last_error_class='PERMANENT_404' WHERE question_id=?",
            [(qid,) for qid in dead_ids]
        )
        conn.commit()

print(f'\n结果: 有效 {len(valid_ids)} | 无效(DEAD) {len(dead_ids)} | 共验证 {len(long_ids)} 个')

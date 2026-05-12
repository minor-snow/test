import sys, sqlite3
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

db = r'H:\Analysis\zhihu\bot_database.db'
with sqlite3.connect(db) as conn:
    # 1. 检查账号状态
    rows = conn.execute('SELECT dc0, z_c0, status, trust_score FROM accounts').fetchall()
    print('=== 全部账号 ===')
    for r in rows:
        zc0_status = 'HAS_ZC0' if r[1] else 'NO_ZC0'
        print(f'  dc0={r[0][:25]}...  {zc0_status}  status={r[2]}  trust={r[3]}')
    
    # 2. 把没有 z_c0 的账号标记为 DEAD（否则会 401）
    n = conn.execute("UPDATE accounts SET status='DEAD' WHERE z_c0 IS NULL AND status='ACTIVE'").rowcount
    conn.commit()
    if n:
        print(f'\n已将 {n} 个无 z_c0 的账号标记为 DEAD')
    
    # 3. 最终 ACTIVE 账号
    active = conn.execute("SELECT COUNT(*) FROM accounts WHERE status='ACTIVE'").fetchone()[0]
    ready  = conn.execute("SELECT COUNT(*) FROM question_tasks WHERE state='READY'").fetchone()[0]
    print(f'\n可用 ACTIVE 账号: {active}')
    print(f'待爬 READY 任务:  {ready}')

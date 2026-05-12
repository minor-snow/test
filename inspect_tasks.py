import sys, sqlite3
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from collections import Counter

db = r'H:\Analysis\zhihu\bot_database.db'
with sqlite3.connect(db) as conn:
    rows = conn.execute('''
        SELECT question_id, source_type FROM question_tasks
        WHERE state='READY' ORDER BY source_type, CAST(question_id AS INTEGER)
    ''').fetchall()

sources = Counter(r[1] for r in rows)
print('=== 任务来源分布 ===')
for k, v in sources.items():
    print(f'  {k:<15}: {v} 条')
print(f'  {"合计":<15}: {len(rows)} 条')

# 超长 ID（19位 = 可能是 answer_id 或 feed ID）
long_ids  = [r[0] for r in rows if len(r[0]) > 12]
normal_ids = [r[0] for r in rows if len(r[0]) <= 12]
print(f'\n=== 正常 question_id (<=12位): {len(normal_ids)} 个 ===')
print(f'=== 超长 ID (>12位，可能是 answer_id): {len(long_ids)} 个 ===')
for qid in long_ids[:15]:
    print(f'  {qid}')
if len(long_ids) > 15:
    print(f'  ... 共 {len(long_ids)} 个')

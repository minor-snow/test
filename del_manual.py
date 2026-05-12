import sys, sqlite3
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
db = r'H:\Analysis\zhihu\bot_database.db'
with sqlite3.connect(db) as conn:
    n = conn.execute("SELECT COUNT(*) FROM question_tasks WHERE source_type='manual'").fetchone()[0]
    conn.execute("DELETE FROM question_tasks WHERE source_type='manual'")
    conn.commit()
    remaining = conn.execute('SELECT COUNT(*) FROM question_tasks').fetchone()[0]
    print(f'已删除 {n} 条 manual 任务，剩余 {remaining} 条')

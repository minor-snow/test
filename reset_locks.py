"""
重置所有锁：将 is_in_use 和 LEASED 状态强制归零
用法: python reset_locks.py
"""
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    from config_loader import config
    db_path = config.get("paths", {}).get("database", "bot_database.db")
except Exception:
    db_path = "bot_database.db"

DB_FILE = os.path.join(BASE_DIR, db_path)

with sqlite3.connect(DB_FILE) as conn:
    n1 = conn.execute("UPDATE accounts SET is_in_use = 0").rowcount
    n2 = conn.execute("UPDATE question_tasks SET state='READY', lease_owner=NULL WHERE state='LEASED'").rowcount
    conn.commit()
    print(f"重置完毕: 释放账号 {n1} 个, 回收任务 {n2} 个")

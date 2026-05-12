"""
战前检查：验证账号、数据库 schema、RPC Signer 状态
用法: python preflight.py
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import sqlite3
import requests
import os
import time

try:
    from config_loader import config as _cfg
except Exception:
    _cfg = {}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, (_cfg.get("paths", {}) or {}).get("database", "bot_database.db"))
SIGNER_HOST = (_cfg.get("signer", {}) or {}).get("host", "127.0.0.1")
SIGNER_PORT = (_cfg.get("signer", {}) or {}).get("port", 3000)
RPC_HEALTH = f"http://{SIGNER_HOST}:{SIGNER_PORT}/health"


def check_rpc():
    print("=== 1. RPC Signer 状态 ===")
    try:
        r = requests.get(RPC_HEALTH, timeout=3, proxies={"http": None, "https": None})
        if r.status_code == 200:
            data = r.json()
            ok = data.get("ok", False)
            ready = data.get("ready", False)
            version = data.get("signer_version", "?")
            workers = data.get("availableWorkers", 0)
            print(f"  Signer: {'在线' if ok else '离线'}")
            print(f"  就绪: {'是' if ready else '否'}")
            print(f"  版本: {version}")
            print(f"  可用 Workers: {workers}")
            if not ready:
                print("  ⚠️  Signer 未就绪！请先启动: node rpc_server.js")
    except Exception as e:
        print(f"  ❌ RPC Signer 无法连接: {e}")
        print("  请先启动: node rpc_server.js")


def check_accounts():
    print("\n=== 2. 账号状态 ===")
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()

        # 检查列是否存在
        c.execute("PRAGMA table_info(accounts)")
        cols = [col[1] for col in c.fetchall()]

        if "d_c0" not in cols and "dc0" not in cols:
            print("  ❌ accounts 表结构异常，缺少 d_c0 列。请运行: python init_assets.py")
            return

        d_c0_col = "d_c0" if "d_c0" in cols else "dc0"
        z_c0_col = "z_c0" if "z_c0" in cols else None

        rows = c.execute(f"SELECT {d_c0_col}, {z_c0_col or 'NULL as z_c0'}, status, trust_score FROM accounts").fetchall()
        print(f"  总账号数: {len(rows)}")

        for r in rows:
            d_c0_val = r[0]
            z_c0_val = r[1]
            status = r[2]
            trust = r[3]
            has_zc0 = "有ZC0" if z_c0_val else "无ZC0"
            masked = d_c0_val[:20] + "..." if d_c0_val and len(d_c0_val) > 20 else d_c0_val
            icon = "✓" if status == "ACTIVE" else "✗"
            print(f"  {icon} {masked} | {has_zc0} | {status} | 信任分:{trust}")

        # 将无 z_c0 的账号标记为 DEAD
        if z_c0_col:
            n = c.execute(f"UPDATE accounts SET status='DEAD' WHERE {z_c0_col} IS NULL AND status='ACTIVE'").rowcount
            conn.commit()
            if n:
                print(f"  ⚠️  已将 {n} 个无 z_c0 的账号标记为 DEAD")

        active = c.execute("SELECT COUNT(*) FROM accounts WHERE status='ACTIVE'").fetchone()[0]
        print(f"\n  可用 ACTIVE 账号: {active}")


def check_tasks():
    print("\n=== 3. 任务队列 ===")
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT state, COUNT(*) as n FROM question_tasks GROUP BY state")
        state_counts = {r[0]: r[1] for r in c.fetchall()}
        total = sum(state_counts.values())
        print(f"  总任务数: {total}")
        for state, n in sorted(state_counts.items()):
            print(f"    {state}: {n}")

        ready = state_counts.get("READY", 0)
        if ready == 0 and total > 0:
            print(f"  ℹ️  没有 READY 状态的任务，可能全部完成或全部阻塞")


def check_answers():
    print("\n=== 4. 采集数据 ===")
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as n FROM raw_answers")
        total = c.fetchone()[0]
        print(f"  已采集答案: {total} 条")

        c.execute("SELECT COUNT(DISTINCT question_id) as n FROM raw_answers")
        questions = c.fetchone()[0]
        print(f"  覆盖问题: {questions} 个")


if __name__ == "__main__":
    print("=" * 50)
    print("  知乎采集系统 · 战前检查")
    print("=" * 50)

    if not os.path.exists(DB_FILE):
        print(f"\n  ❌ 数据库文件不存在: {DB_FILE}")
        print("  请先运行: python init_assets.py")
        sys.exit(1)

    check_rpc()
    check_accounts()
    check_tasks()
    check_answers()

    print("\n" + "=" * 50)
    print("  检查完毕")
    print("=" * 50)

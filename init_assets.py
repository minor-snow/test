import sqlite3
import argparse
import os
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "bot_database.db")


def setup_database():
    """VNext Phase 1: 创建/迁移数据库到最新 schema"""
    print(">>> VNext Phase 1: 初始化数据库...")
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute('PRAGMA journal_mode=WAL;')

        # ── 1. accounts ──
        c.execute('''CREATE TABLE IF NOT EXISTS accounts (
                        d_c0 TEXT PRIMARY KEY,
                        z_c0 TEXT,
                        status TEXT DEFAULT 'ACTIVE',
                        cooldown_until INTEGER DEFAULT 0,
                        trust_score INTEGER DEFAULT 100,
                        is_in_use INTEGER DEFAULT 0,
                        last_leased_at INTEGER DEFAULT 0,
                        last_error_class TEXT,
                        ban_score INTEGER DEFAULT 0,
                        last_used_at INTEGER DEFAULT 0
                    )''')

        # accounts 兼容迁移
        c.execute("PRAGMA table_info(accounts)")
        cols = [col[1] for col in c.fetchall()]
        # 处理 dc0 → d_c0 重命名
        if "dc0" in cols and "d_c0" not in cols:
            try:
                c.execute("ALTER TABLE accounts RENAME COLUMN dc0 TO d_c0")
                print(">>> [迁移] 已重命名 accounts.dc0 → d_c0")
            except sqlite3.OperationalError:
                pass
            cols = [col[1] for col in (c.execute("PRAGMA table_info(accounts)").fetchall())]
        for colname, coltype, default in [
            ("z_c0", "TEXT", "NULL"),
            ("is_in_use", "INTEGER", "0"),
            ("last_leased_at", "INTEGER", "0"),
            ("last_error_class", "TEXT", "NULL"),
            ("ban_score", "INTEGER", "0"),
            ("last_used_at", "INTEGER", "0"),
        ]:
            if colname not in cols:
                try:
                    c.execute(f"ALTER TABLE accounts ADD COLUMN {colname} {coltype} DEFAULT {default}")
                except sqlite3.OperationalError:
                    pass

        # ── 2. question_tasks（VNext 核心任务表）──
        c.execute('''CREATE TABLE IF NOT EXISTS question_tasks (
                        question_id     TEXT PRIMARY KEY,
                        current_offset  INTEGER DEFAULT 0,
                        state           TEXT DEFAULT 'READY',
                        priority        INTEGER DEFAULT 0,
                        attempt_count   INTEGER DEFAULT 0,
                        retry_count     INTEGER DEFAULT 0,
                        lease_owner     TEXT,
                        lease_until     INTEGER DEFAULT 0,
                        next_run_at     INTEGER DEFAULT 0,
                        last_error_class TEXT,
                        last_error_detail TEXT,
                        source_type     TEXT DEFAULT 'manual',
                        created_at      INTEGER,
                        updated_at      INTEGER
                    )''')

        # ── 3. task_attempts（审计表）──
        c.execute('''CREATE TABLE IF NOT EXISTS task_attempts (
                        attempt_id      INTEGER PRIMARY KEY AUTOINCREMENT,
                        question_id     TEXT NOT NULL,
                        offset          INTEGER NOT NULL,
                        account_dc0     TEXT,
                        signer_version  TEXT,
                        http_status     INTEGER,
                        error_class     TEXT,
                        error_detail    TEXT,
                        latency_ms      INTEGER,
                        created_at      INTEGER NOT NULL
                    )''')
        c.execute("CREATE INDEX IF NOT EXISTS idx_attempts_qid ON task_attempts(question_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_attempts_error ON task_attempts(error_class)")

        # ── 4. replay_gaps（缺口回补队列）──
        c.execute('''CREATE TABLE IF NOT EXISTS replay_gaps (
                        gap_id          INTEGER PRIMARY KEY AUTOINCREMENT,
                        question_id     TEXT NOT NULL,
                        offset          INTEGER NOT NULL,
                        reason_class    TEXT NOT NULL,
                        source_attempt_id INTEGER,
                        status          TEXT DEFAULT 'PENDING',
                        replay_count    INTEGER DEFAULT 0,
                        first_seen_at   INTEGER NOT NULL,
                        last_replayed_at INTEGER,
                        UNIQUE(question_id, offset)
                    )''')

        # ── 5. raw_answers ──
        c.execute('''CREATE TABLE IF NOT EXISTS raw_answers (
                        answer_id TEXT PRIMARY KEY,
                        question_id TEXT,
                        content TEXT,
                        plain_text TEXT,
                        raw_json TEXT
                    )''')

        # ── 6. 旧表迁移 ──
        # 旧 tasks → question_tasks
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        if c.fetchone():
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='question_tasks'")
            # question_tasks 表刚创建，检查是否已有数据
            c.execute("SELECT COUNT(*) FROM question_tasks")
            if c.fetchone()[0] == 0:
                print(">>> [迁移] 旧 tasks → question_tasks...")
                now = int(time.time())
                c.execute(f"""INSERT OR IGNORE INTO question_tasks
                             (question_id, current_offset, state, retry_count, created_at, updated_at)
                             SELECT question_id, current_offset,
                                    CASE WHEN is_completed = 1 THEN 'DONE' ELSE 'READY' END,
                                    COALESCE(retry_count, 0), {now}, {now}
                             FROM tasks""")
                print(f">>> [迁移] 迁移了 {c.rowcount} 条任务")
            c.execute("ALTER TABLE tasks RENAME TO tasks_v15_backup")
            print(">>> [迁移] 旧 tasks 已备份为 tasks_v15_backup")

        # 旧 missing_gaps → replay_gaps
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='missing_gaps'")
        if c.fetchone():
            now = int(time.time())
            c.execute(f"""INSERT OR IGNORE INTO replay_gaps
                         (question_id, offset, reason_class, status, first_seen_at)
                         SELECT question_id, offset, 'LEGACY', 'PENDING', COALESCE(created_at, {now})
                         FROM missing_gaps""")
            c.execute("ALTER TABLE missing_gaps RENAME TO missing_gaps_v15_backup")
            print(">>> [迁移] missing_gaps → replay_gaps 完成")

        conn.commit()
    print(">>> 数据库 schema 已就绪 (VNext Phase 1)。")


def seed_data():
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        print(">>> ⚠️  正在执行高危操作：清空数据...")
        c.execute("DELETE FROM accounts")
        c.execute("DELETE FROM question_tasks")
        c.execute("DELETE FROM raw_answers")
        c.execute("DELETE FROM task_attempts")
        c.execute("DELETE FROM replay_gaps")

        print(">>> 正在填装测试弹仓 (Accounts)...")
        dummy_dc0s = [
            ('mock_dc0_identity_111111111', 'mock_zc0_AAAAA111111'),
            ('mock_dc0_identity_AAAAA22222', 'mock_zc0_BBBBB22222'),
            ('mock_dc0_identity_BBBBB33333', 'mock_zc0_CCCCC33333'),
            ('mock_dc0_identity_CCCCC44444', 'mock_zc0_DDDDD44444'),
            ('mock_dc0_identity_DDDDD55555', 'mock_zc0_EEEEE55555'),
        ]
        import random
        for d_c0, z_c0 in dummy_dc0s:
            c.execute("INSERT OR IGNORE INTO accounts (d_c0, z_c0, status, trust_score) VALUES (?, ?, 'ACTIVE', ?)",
                      (d_c0, z_c0, random.randint(80, 100)))

        print(">>> 正在填装测试任务 (Tasks)...")
        now = int(time.time())
        dummy_questions = ['550742168', '601323835', '604812328', '264627402', '565809772']
        for qid in dummy_questions:
            c.execute("""INSERT OR IGNORE INTO question_tasks 
                         (question_id, current_offset, state, source_type, created_at, updated_at) 
                         VALUES (?, 0, 'READY', 'manual', ?, ?)""", (qid, now, now))

        conn.commit()
    print(">>> 【沙盒弹库】填装完毕！")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="VNext Phase 1 数据库初始化")
    parser.add_argument("--seed", action="store_true", help="警告：清空所有数据并重新装填测试数据。")
    args = parser.parse_args()

    setup_database()

    if args.seed:
        seed_data()
    else:
        print(">>> (提示：未执行种子数据装填。如需重置，请加 --seed 参数)")

"""
数据库维护工具：备份、清理、完整性检查
用法: python db_maintenance.py [backup|vacuum|stats|prune]
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import sqlite3
import os
import shutil
import time
from datetime import datetime

try:
    from config_loader import conf
except Exception:
    def conf(key, default=None):
        return default

from logger_setup import logger

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, conf("paths.database", "bot_database.db"))


def _get_conn():
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def backup():
    """备份数据库到 backups/ 目录"""
    backup_dir = os.path.join(BASE_DIR, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"bot_database_{timestamp}.db")

    # 使用 SQLite 在线备份 API（保证一致性）
    src = sqlite3.connect(DB_FILE)
    dst = sqlite3.connect(backup_path)
    src.backup(dst)
    src.close()
    dst.close()

    size_mb = os.path.getsize(backup_path) / (1024 * 1024)
    logger.info(f"[Backup] 数据库已备份到: {backup_path} ({size_mb:.1f} MB)")

    # 保留最近 10 个备份
    backups = sorted(
        [f for f in os.listdir(backup_dir) if f.startswith("bot_database_")],
        reverse=True
    )
    for old in backups[10:]:
        os.remove(os.path.join(backup_dir, old))
        logger.info(f"[Backup] 清理旧备份: {old}")

    return backup_path


def vacuum():
    """压缩数据库文件，回收空间"""
    logger.info("[Vacuum] 开始压缩数据库...")
    before = os.path.getsize(DB_FILE) / (1024 * 1024)
    with _get_conn() as conn:
        conn.execute("VACUUM")
    after = os.path.getsize(DB_FILE) / (1024 * 1024)
    logger.info(f"[Vacuum] 压缩完成: {before:.1f} MB → {after:.1f} MB (减少 {before - after:.1f} MB)")


def stats():
    """输出数据库统计信息"""
    with _get_conn() as conn:
        c = conn.cursor()

        c.execute("SELECT COUNT(*) as n FROM accounts")
        acc_total = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM accounts WHERE status='ACTIVE'")
        acc_active = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM accounts WHERE status='DEAD'")
        acc_dead = c.fetchone()["n"]

        c.execute("SELECT COUNT(*) as n FROM question_tasks")
        task_total = c.fetchone()["n"]
        c.execute("SELECT state, COUNT(*) as n FROM question_tasks GROUP BY state")
        task_states = {r["state"]: r["n"] for r in c.fetchall()}

        c.execute("SELECT COUNT(*) as n FROM raw_answers")
        ans_total = c.fetchone()["n"]

        c.execute("SELECT COUNT(*) as n FROM task_attempts")
        attempts = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM replay_gaps WHERE status='PENDING'")
        pending_gaps = c.fetchone()["n"]

    logger.info("=" * 50)
    logger.info("  数据库统计")
    logger.info("=" * 50)
    logger.info(f"  账号: {acc_total} 总计 / {acc_active} 活跃 / {acc_dead} 死亡")
    logger.info(f"  任务: {task_total} 总计")
    for state, n in sorted(task_states.items()):
        logger.info(f"    {state}: {n}")
    logger.info(f"  已采集答案: {ans_total}")
    logger.info(f"  请求记录: {attempts}")
    logger.info(f"  待回补缺口: {pending_gaps}")
    logger.info(f"  数据库大小: {os.path.getsize(DB_FILE) / (1024 * 1024):.1f} MB")
    logger.info("=" * 50)


def prune_old_attempts(days=7):
    """清理超过 N 天的旧审计记录（raw_answers 和 tasks 不受影响）"""
    cutoff = int(time.time()) - days * 86400
    with _get_conn() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM task_attempts WHERE created_at < ?", (cutoff,))
        deleted = c.rowcount
        conn.commit()
    logger.info(f"[Prune] 已清理 {deleted} 条超过 {days} 天的审计记录")
    vacuum()


def integrity_check():
    """运行 SQLite 完整性检查"""
    with _get_conn() as conn:
        c = conn.cursor()
        c.execute("PRAGMA integrity_check")
        result = c.fetchone()
        logger.info(f"[Integrity] 数据库完整性: {result[0]}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.info("用法: python db_maintenance.py [backup|vacuum|stats|prune|integrity]")
        logger.info("  backup   - 备份数据库")
        logger.info("  vacuum   - 压缩数据库")
        logger.info("  stats    - 显示统计信息")
        logger.info("  prune    - 清理旧审计记录")
        logger.info("  integrity - 完整性检查")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "backup":
        backup()
    elif cmd == "vacuum":
        vacuum()
    elif cmd == "stats":
        stats()
    elif cmd == "prune":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        prune_old_attempts(days)
    elif cmd == "integrity":
        integrity_check()
    else:
        logger.info(f"未知命令: {cmd}")

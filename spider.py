import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import sqlite3
import time
import random
import requests
import json
import concurrent.futures
import subprocess
import threading
import atexit
import re
import html
import os

# ==========================================
# VNext Phase 1 架构配置
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RPC_SERVER = "http://127.0.0.1:3000"
DB_FILE = os.path.join(BASE_DIR, "bot_database.db")
NODE_LOG = os.path.join(BASE_DIR, "node_signer.log")
CONCURRENCY = 2                     # 降并发: 牢牢拉住请求频率
TUNNEL_PROXY_URL = None             # ← 挂代理时填入
ACCOUNT_MIN_GAP_SEC = 15            # 同一账号两次使用间隔不小于 15s
MAX_ANSWERS_LIMIT = 0               # 0=无限制，>0=爬到这么多条自动停
SIGNER_VERSION = "browser_hook_v16"

# ── 签名缓存 ─────────────────────────────────────────────
_SIG_CACHE = {}          # key: (url, d_c0) → (signature, expire_at)
_SIG_CACHE_TTL = 120     # 签名缓存有效期秒数 (知乎同一 URL 签名短时间内不变)


def _get_signature_cached(session, target_api, d_c0):
    """获取签名，优先从缓存读取。同时负责 RPC 调用和重试逻辑。"""
    now = time.time()
    cache_key = (target_api, d_c0)

    # 检查缓存
    if cache_key in _SIG_CACHE:
        sig_val, expire_at = _SIG_CACHE[cache_key]
        if now < expire_at:
            return sig_val
        del _SIG_CACHE[cache_key]

    # 请求 RPC Signer
    sig = None
    for attempt in range(3):
        try:
            resp = session.post(f"{RPC_SERVER}/get_sign",
                              json={"url": target_api, "dc0": d_c0},
                              timeout=5, proxies={"http": None, "https": None})
            if resp.status_code == 200:
                sig = resp.json().get("signature")
                break
        except Exception:
            time.sleep(1)

    # 缓存有效签名
    if sig:
        _SIG_CACHE[cache_key] = (sig, now + _SIG_CACHE_TTL)
        # 清理过期缓存条目
        expired = [k for k, v in _SIG_CACHE.items() if v[1] < now]
        for k in expired:
            del _SIG_CACHE[k]

    return sig


# 任务状态常量
S_READY = "READY"
S_LEASED = "LEASED"
S_BACKOFF = "BACKOFF"
S_GAP = "GAP"
S_DONE = "DONE"
S_QUARANTINED = "QUARANTINED"
S_DEAD = "DEAD"

# 错误分类常量
E_TRANSIENT_NETWORK = "TRANSIENT_NETWORK"
E_HTTP_403_429 = "HTTP_403_429"
E_HTTP_401 = "HTTP_401"
E_CAPTCHA_HTML = "CAPTCHA_HTML"
E_FORMAT_ERROR = "FORMAT_ERROR"
E_SIGNER_ERROR = "SIGNER_ERROR"
E_FALSE_EMPTY = "FALSE_EMPTY"
E_PERMANENT_404 = "PERMANENT_404"

# 退避/阀值配置（稳健模式：全线加长）
BACKOFF_SECONDS = {
    E_TRANSIENT_NETWORK: 60,            # 30→60
    E_HTTP_403_429: 120,                # 60→120
    E_CAPTCHA_HTML: 300,                # 120→300
    E_FALSE_EMPTY: [600, 3600, None],   # 300/1800→600/3600
    E_SIGNER_ERROR: [120, 300, None],   # 60/120→120/300
    E_FORMAT_ERROR: [120, 300, None],
}
GAP_THRESHOLD = 3
LEASE_TIMEOUT_SEC = 300

# 账号信任分惩罚（稳健模式：大幅软化）
TRUST_PENALTY = {
    E_HTTP_403_429: 3,     # 原 10 → 3，容许 33 次 403 才死
    E_CAPTCHA_HTML: 5,     # 原 10 → 5
    E_FALSE_EMPTY:  2,     # 原 5  → 2
}
TRUST_REGEN_PER_CYCLE = 1  # 维护线程每 30s 给 ACTIVE 账号回 +1 信任分


def _get_db_conn():
    conn = sqlite3.connect(DB_FILE, timeout=20)
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.row_factory = sqlite3.Row
    return conn


def _db_retry(fn):
    """装饰器：捕获 sqlite3.OperationalError（database is locked），
    最多重试 5 次，每次指数退避 + 随机抖动，避免并发 Worker 同时重试互相踩踏。
    超过上限后打印警告并重新抛出，让调用方的外层 except 处理。"""
    import functools
    import random as _random
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        max_retries = 5
        for attempt in range(max_retries):
            try:
                return fn(*args, **kwargs)
            except sqlite3.OperationalError as e:
                if attempt == max_retries - 1:
                    print(f"[DB] {fn.__qualname__} 重试 {max_retries} 次仍失败: {e}")
                    raise
                wait = (0.1 * (2 ** attempt)) + _random.uniform(0, 0.1)
                print(f"[DB] {fn.__qualname__} 锁冲突 (第{attempt+1}次)，{wait:.2f}s 后重试")
                time.sleep(wait)
    return wrapper


# ==========================================
# Schema 迁移（兼容旧版 + 新建）
# ==========================================
def _check_and_migrate_schema():
    print("[System] VNext Phase 1: 执行 schema 巡检与迁移...")
    with _get_db_conn() as conn:
        c = conn.cursor()
        c.execute("PRAGMA journal_mode=WAL;")

        # ── 1. question_tasks（核心任务表）──
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='question_tasks'")
        has_new_tasks = c.fetchone() is not None

        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        has_old_tasks = c.fetchone() is not None

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

        # 迁移旧 tasks 表数据
        if has_old_tasks and not has_new_tasks:
            print("[Migration] 检测到旧版 tasks 表，迁移数据到 question_tasks...")
            now = int(time.time())
            c.execute(f'''INSERT OR IGNORE INTO question_tasks 
                         (question_id, current_offset, state, retry_count, created_at, updated_at)
                         SELECT question_id, current_offset,
                                CASE WHEN is_completed = 1 THEN '{S_DONE}'
                                     ELSE '{S_READY}' END,
                                COALESCE(retry_count, 0), {now}, {now}
                         FROM tasks''')
            c.execute("ALTER TABLE tasks RENAME TO tasks_v15_backup")
            print(f"[Migration] 迁移完成，旧表已备份为 tasks_v15_backup")

        # ── 2. task_attempts（审计表）──
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

        # ── 3. replay_gaps（缺口回补队列）──
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

        # ── 4. accounts（兼容旧表迁移）──
        c.execute('''CREATE TABLE IF NOT EXISTS accounts (
            d_c0 TEXT PRIMARY KEY,
            z_c0 TEXT,
            status TEXT DEFAULT 'ACTIVE',
            cooldown_until INTEGER DEFAULT 0,
            trust_score INTEGER DEFAULT 100,
            is_in_use INTEGER DEFAULT 0
        )''')

        c.execute("PRAGMA table_info(accounts)")
        acc_cols = [r['name'] for r in c.fetchall()]
        # 处理 dc0 → d_c0 重命名（兼容旧 harvester 写入的 schema）
        if "dc0" in acc_cols and "d_c0" not in acc_cols:
            try:
                c.execute("ALTER TABLE accounts RENAME COLUMN dc0 TO d_c0")
                print("[Migration] 已重命名 accounts.dc0 → d_c0")
                acc_cols = [r['name'] for r in c.execute("PRAGMA table_info(accounts)").fetchall()]
            except sqlite3.OperationalError:
                pass
        for col, default in [("z_c0", "NULL"), ("is_in_use", "0"), ("last_leased_at", "0"),
                             ("last_error_class", "NULL"), ("ban_score", "0"), ("last_used_at", "0")]:
            if col not in acc_cols:
                try:
                    c.execute(f"ALTER TABLE accounts ADD COLUMN {col} {'TEXT' if 'class' in col else 'INTEGER'} DEFAULT {default}")
                except sqlite3.OperationalError:
                    pass

        # ── 5. raw_answers（保持，补列）──
        c.execute('''CREATE TABLE IF NOT EXISTS raw_answers (
            answer_id TEXT PRIMARY KEY,
            question_id TEXT,
            content TEXT,
            plain_text TEXT,
            raw_json TEXT
        )''')
        c.execute("PRAGMA table_info(raw_answers)")
        ra_cols = [r['name'] for r in c.fetchall()]
        if 'plain_text' not in ra_cols:
            try:
                c.execute("ALTER TABLE raw_answers ADD COLUMN plain_text TEXT")
            except sqlite3.OperationalError:
                pass

        # ── 6. 旧 missing_gaps 迁移到 replay_gaps ──
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='missing_gaps'")
        if c.fetchone():
            print("[Migration] 迁移 missing_gaps → replay_gaps...")
            now = int(time.time())
            c.execute(f"""INSERT OR IGNORE INTO replay_gaps 
                         (question_id, offset, reason_class, status, first_seen_at)
                         SELECT question_id, offset, 'LEGACY', 'PENDING', COALESCE(created_at, {now})
                         FROM missing_gaps""")
            c.execute("ALTER TABLE missing_gaps RENAME TO missing_gaps_v15_backup")
            print("[Migration] missing_gaps 迁移完成")

        conn.commit()
    print("[System] Schema 巡检完成。")


def clean_html(raw_html):
    if not raw_html:
        return ""
    text = re.sub(r'(?i)<br\s*/?>\s*|</p>|<p>', '\n', raw_html)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n\s*\n', '\n', html.unescape(text)).strip()
    return text


# ==========================================
# 内存统计（Dashboard 用）
# ==========================================
class MemoryDashboardStats:
    def __init__(self):
        self.total_requests = 0
        self.success_200 = 0
        self.fail_403_429 = 0
        self.fail_401 = 0
        self.fail_signer = 0
        self.fail_other = 0
        self.scraped_answers = 0
        self.lock = threading.Lock()

stats = MemoryDashboardStats()


# ==========================================
# NodeSupervisor（保持，仅微调）
# ==========================================
class NodeSupervisor:
    """管理 Node signer 进程生命周期。
    支持：健康检查、Canary 验活、渐进式重启 (指数退避)、近 TTL 预温。"""

    def __init__(self):
        self.process = None
        self.is_ready = False
        self.consecutive_failures = 0
        self.restart_count = 0
        self._log_handle = None
        self.signer_version = SIGNER_VERSION
        self.last_canary_ok = 0
        self._last_request_count = 0
        self._ttl_limit = 0
        self._prewarming = False

        self._cleanup_orphans()
        atexit.register(self.kill_all)
        self._start()
        self.watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self.watchdog_thread.start()

    def _cleanup_orphans(self):
        """清理本项目的孤儿 signer 进程"""
        try:
            output = subprocess.check_output('netstat -aon', shell=True, stderr=subprocess.DEVNULL).decode()
            for line in output.splitlines():
                if ':3000 ' in line and 'LISTENING' in line:
                    pid = line.strip().split()[-1]
                    if str(pid) != "0":
                        try:
                            wmic_out = subprocess.check_output(
                                f'wmic process where "ProcessId={pid}" get CommandLine /value',
                                shell=True, stderr=subprocess.DEVNULL
                            ).decode(errors='ignore')
                            if 'node' in wmic_out.lower() and 'rpc_server.js' in wmic_out:
                                print(f"[Supervisor] 发现 3000 端口孤儿 signer (PID: {pid})，清理。")
                                subprocess.check_call(["taskkill", "/F", "/T", "/PID", pid],
                                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        except Exception:
                            pass
        except Exception:
            pass

    def _start(self):
        print(f"[Supervisor] 启动 Node signer (重启次数: {self.restart_count})...")
        self._log_handle = open(NODE_LOG, 'a', encoding='utf-8')
        env = os.environ.copy()
        env["SIGNER_MAX_REQUESTS"] = "0"  # 永不自杀，由 Supervisor 控制生命周期
        self.process = subprocess.Popen(
            ["node", "rpc_server.js"],
            cwd=BASE_DIR,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=self._log_handle
        )

    def kill_all(self):
        if self.process and self.process.poll() is None:
            print("\n[Supervisor] 执行进程树终止 (taskkill /F /T)...")
            try:
                subprocess.check_call(["taskkill", "/F", "/T", "/PID", str(self.process.pid)],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass
        if self._log_handle:
            try:
                self._log_handle.close()
            except Exception:
                pass

    def _get_health(self):
        """获取 signer 健康数据，失败返回 None"""
        try:
            resp = requests.get(f"{RPC_SERVER}/health", timeout=3, proxies={"http": None, "https": None})
            if resp.status_code == 200:
                data = resp.json()
                self._last_request_count = data.get("totalResolved", 0)
                self._ttl_limit = data.get("ttlLimit", 0)
                return data
        except Exception:
            pass
        return None

    def should_prewarm(self):
        """判断是否需要预温重启（当前 signer 接近 TTL 时）"""
        if self._ttl_limit <= 0:
            return False
        return self._last_request_count > self._ttl_limit * 0.7

    def run_canary(self):
        try:
            r = requests.get(f"{RPC_SERVER}/canary", timeout=10, proxies={"http": None, "https": None})
            if r.status_code == 200:
                data = r.json()
                if data.get("ok") and data.get("signature"):
                    self.last_canary_ok = int(time.time())
                    self.signer_version = data.get("signer_version", SIGNER_VERSION)
                    return True
        except Exception:
            pass
        return False

    def _graceful_restart(self):
        """温和重启：先标记 NOT READY，排空队列后再杀旧进程启动新的"""
        print("[Supervisor] 执行温和重启...")
        old_pid = self.process.pid if self.process else None
        self.is_ready = False

        # 等待任务队列排空 (最多等 30s)
        for _ in range(30):
            health = self._get_health()
            if health and health.get("queueDepth", 0) == 0:
                break
            time.sleep(1)

        # 杀旧进程
        if old_pid:
            try:
                subprocess.check_call(["taskkill", "/F", "/T", "/PID", str(old_pid)],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception:
                pass

        time.sleep(2)
        self.consecutive_failures = 0
        self._start()

        # 等待新进程就绪 (最多等 30s)
        for _ in range(30):
            if self.process and self.process.poll() is None:
                health = self._get_health()
                if health and health.get("ready"):
                    self.is_ready = True
                    print("[Supervisor] 新 signer 实例已就绪")
                    return
            time.sleep(1)
        print("[Supervisor] 新 signer 实例启动超时")

    def _watchdog_loop(self):
        while True:
            time.sleep(5)
            if self.restart_count > 8:
                print("\n[CRITICAL] Node signer 不可恢复（重启 > 8 轮）。退出。")
                self.kill_all()
                os._exit(1)

            if self.process is None or self.process.poll() is not None:
                self.is_ready = False
                self.consecutive_failures += 1
            else:
                health = self._get_health()
                if health and health.get("ok") is True and health.get("ready") is True:
                    # 首次 ready 或每 10 分钟做 canary
                    if not self.is_ready or (
                        self.last_canary_ok > 0 and int(time.time()) - self.last_canary_ok > 600
                    ):
                        if self.run_canary():
                            print(f"[Supervisor] Canary 验活通过 (v{self.signer_version})")
                        else:
                            print("[Supervisor] Canary 验活失败，signer 标记为 NOT READY")
                            self.is_ready = False
                            self.consecutive_failures += 1
                            continue
                    self.consecutive_failures = 0
                    self.is_ready = True
                    self.restart_count = 0

                    # 近 TTL 预温：触发温和重启
                    if self.should_prewarm() and not self._prewarming:
                        self._prewarming = True
                        print(f"[Supervisor] Signer 接近 TTL ({self._last_request_count}/{self._ttl_limit})，触发预温重启")
                        self._graceful_restart()
                        self._prewarming = False
                else:
                    self.is_ready = False
                    self.consecutive_failures += 1

            if self.consecutive_failures >= 3:
                self.is_ready = False
                print("[Supervisor] 连续 3 轮健康检查失败，重启 Node...")
                self.kill_all()
                self.restart_count += 1
                backoff = min(2 ** self.restart_count, 60)
                time.sleep(backoff)
                self.consecutive_failures = 0
                self._start()


# ==========================================
# AccountManager（错误分层）
# ==========================================
class AccountManager:
    @_db_retry
    def _rescue_cooldowns(self):
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("UPDATE accounts SET status = 'ACTIVE' WHERE status = 'COOLDOWN' AND cooldown_until < ?", (now,))
            conn.commit()

    @_db_retry
    def _clear_dead_locks(self):
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("UPDATE accounts SET is_in_use = 0 WHERE is_in_use = 1 AND last_leased_at < ?", (now - 300,))
            conn.commit()

    @_db_retry
    def lock_and_get_weapon(self):
        """返回 (d_c0, z_c0) 元组。强制同一账号间隔 ACCOUNT_MIN_GAP_SEC 才能再次使用。"""
        now = int(time.time())
        min_last_used = now - ACCOUNT_MIN_GAP_SEC
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("BEGIN IMMEDIATE")
            c.execute('''SELECT d_c0, z_c0 FROM (
                            SELECT d_c0, z_c0, trust_score FROM accounts
                            WHERE status = 'ACTIVE' AND is_in_use = 0
                              AND cooldown_until < ?
                              AND (last_used_at IS NULL OR last_used_at < ?)
                            ORDER BY trust_score DESC LIMIT 10
                         ) ORDER BY RANDOM() LIMIT 1''', (now, min_last_used))
            row = c.fetchone()
            if row:
                d_c0 = row['d_c0']
                z_c0 = row['z_c0']
                c.execute("UPDATE accounts SET is_in_use = 1, last_leased_at = ?, last_used_at = ? WHERE d_c0 = ?",
                          (now, now, d_c0))
                conn.commit()
                return d_c0, z_c0
            conn.rollback()
            return None, None

    @_db_retry
    def release_weapon(self, d_c0):
        if not d_c0:
            return
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("UPDATE accounts SET is_in_use = 0 WHERE d_c0 = ?", (d_c0,))
            conn.commit()

    @_db_retry
    def report_damage(self, d_c0, error_class):
        """[VNext] 按错误分类精确处罚账号"""
        if not d_c0:
            return
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()

            if error_class == E_HTTP_401:
                c.execute("UPDATE accounts SET status = 'DEAD', trust_score = 0, is_in_use = 0, last_error_class = ? WHERE d_c0 = ?",
                          (error_class, d_c0))
            elif error_class in (E_HTTP_403_429, E_CAPTCHA_HTML):
                penalty  = TRUST_PENALTY.get(error_class, 3)
                cooldown = BACKOFF_SECONDS.get(error_class, 120)
                c.execute("""UPDATE accounts
                             SET status = 'COOLDOWN', cooldown_until = ?, trust_score = MAX(0, trust_score - ?),
                                 is_in_use = 0, last_error_class = ?
                             WHERE d_c0 = ?""", (now + cooldown, penalty, error_class, d_c0))
            elif error_class == E_FALSE_EMPTY:
                penalty = TRUST_PENALTY.get(E_FALSE_EMPTY, 2)
                c.execute("""UPDATE accounts
                             SET status = 'COOLDOWN', cooldown_until = ?, trust_score = MAX(0, trust_score - ?),
                                 is_in_use = 0, last_error_class = ?
                             WHERE d_c0 = ?""", (now + 90, penalty, error_class, d_c0))
            elif error_class in (E_SIGNER_ERROR, E_TRANSIENT_NETWORK, E_FORMAT_ERROR, E_PERMANENT_404):
                c.execute("UPDATE accounts SET is_in_use = 0 WHERE d_c0 = ?", (d_c0,))
            else:
                c.execute("UPDATE accounts SET is_in_use = 0 WHERE d_c0 = ?", (d_c0,))

            c.execute("UPDATE accounts SET status = 'DEAD' WHERE trust_score <= 0 AND status != 'DEAD'")
            conn.commit()


# ==========================================
# TaskManager（状态机）
# ==========================================
class TaskManager:
    def __init__(self):
        self._recover_stale_leases()

    def _recover_stale_leases(self):
        """启动时清理过期租约"""
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute(f"UPDATE question_tasks SET state = '{S_READY}', lease_owner = NULL, lease_until = 0 "
                      f"WHERE state = '{S_LEASED}' AND lease_until < ?", (now,))
            affected = c.rowcount
            conn.commit()
            if affected:
                print(f"[TaskManager] 恢复了 {affected} 个过期租约任务")

    def lock_and_get_target(self, worker_id):
        """按状态机选取任务，返回 dict 或 None"""
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("BEGIN IMMEDIATE")
            # 优先级 DESC → 重试次数 ASC → 随机打散
            c.execute(f'''SELECT question_id, current_offset, retry_count, attempt_count
                         FROM question_tasks
                         WHERE state IN ('{S_READY}')
                            OR (state = '{S_BACKOFF}' AND next_run_at <= ?)
                         ORDER BY priority DESC, retry_count ASC, RANDOM()
                         LIMIT 1''', (now,))
            row = c.fetchone()
            if row:
                qid = row['question_id']
                lease_until = now + LEASE_TIMEOUT_SEC
                c.execute(f"""UPDATE question_tasks 
                             SET state = '{S_LEASED}', lease_owner = ?, lease_until = ?, updated_at = ?
                             WHERE question_id = ?""", (worker_id, lease_until, now, qid))
                conn.commit()
                return dict(row)
            conn.rollback()
            return None

    @_db_retry
    def transition_state(self, question_id, new_state, *,
                         new_offset=None, retry_count=None, error_class=None,
                         error_detail=None, next_run_at=None):
        """统一的状态流转入口"""
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()

            sets = [f"state = ?", "lease_owner = NULL", "lease_until = 0", "updated_at = ?"]
            params = [new_state, now]

            if new_offset is not None:
                sets.append("current_offset = ?")
                params.append(new_offset)
            if retry_count is not None:
                sets.append("retry_count = ?")
                params.append(retry_count)
            if error_class is not None:
                sets.append("last_error_class = ?")
                params.append(error_class)
            if error_detail is not None:
                sets.append("last_error_detail = ?")
                params.append(error_detail[:200] if error_detail else None)
            if next_run_at is not None:
                sets.append("next_run_at = ?")
                params.append(next_run_at)

            # attempt_count 每次租出回来都 +1
            sets.append("attempt_count = attempt_count + 1")

            params.append(question_id)
            sql = f"UPDATE question_tasks SET {', '.join(sets)} WHERE question_id = ?"
            c.execute(sql, params)
            conn.commit()

    @_db_retry
    def record_attempt(self, question_id, offset, dc0, signer_version,
                       http_status, error_class, error_detail, latency_ms):
        """写入 task_attempts 审计表，返回 attempt_id"""
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("""INSERT INTO task_attempts 
                         (question_id, offset, account_dc0, signer_version, http_status,
                          error_class, error_detail, latency_ms, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                      (question_id, offset, dc0, signer_version, http_status,
                       error_class, error_detail[:200] if error_detail else None, latency_ms, now))
            attempt_id = c.lastrowid
            conn.commit()
            return attempt_id

    @_db_retry
    def create_gap(self, question_id, offset, reason_class, attempt_id=None):
        """记录缺口到 replay_gaps"""
        now = int(time.time())
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("""INSERT OR IGNORE INTO replay_gaps 
                         (question_id, offset, reason_class, source_attempt_id, status, first_seen_at)
                         VALUES (?, ?, ?, ?, 'PENDING', ?)""",
                      (question_id, offset, reason_class, attempt_id, now))
            conn.commit()

    @_db_retry
    def save_raw_answers(self, question_id, answers_list):
        with _get_db_conn() as conn:
            c = conn.cursor()
            for item in answers_list:
                ans_id = str(item.get("id", ""))
                content = item.get("content", "") or item.get("excerpt", "")
                plain_txt = clean_html(content)
                if not ans_id:
                    continue
                c.execute('''INSERT OR IGNORE INTO raw_answers (answer_id, question_id, content, plain_text, raw_json) 
                             VALUES (?, ?, ?, ?, ?)''',
                          (ans_id, question_id, content, plain_txt, json.dumps(item, ensure_ascii=False)))
            conn.commit()

    @_db_retry
    def verify_completeness(self, question_id, answer_count_from_api):
        """校验采集完整性：比对实际采集数与问题标注的 answer_count。
        如果缺失超过 5%，记录 GAP 供后续回补。"""
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) as n FROM raw_answers WHERE question_id = ?", (question_id,))
            collected = c.fetchone()['n']

            if answer_count_from_api > 0 and collected < answer_count_from_api * 0.95:
                missing = answer_count_from_api - collected
                print(f"[Integrity] Q{question_id}: 采集 {collected} / 标注 {answer_count_from_api} (缺失 {missing} 条)")
                # 记录缺失的 offset 范围
                now = int(time.time())
                gap_start = collected  # 简化：以采集数为起点
                c.execute("""INSERT OR IGNORE INTO replay_gaps
                             (question_id, offset, reason_class, status, first_seen_at)
                             VALUES (?, ?, 'INCOMPLETE_CHECK', 'PENDING', ?)""",
                          (question_id, gap_start, now))
                conn.commit()
                return False
            return True

    def get_remaining_count(self):
        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute(f"SELECT COUNT(*) as n FROM question_tasks WHERE state NOT IN ('{S_DONE}', '{S_DEAD}')")
            return c.fetchone()['n']


# ==========================================
# 后台维护线程
# ==========================================
def maintenance_thread(am, tm):
    while True:
        time.sleep(30)
        try:
            now = int(time.time())
            am._rescue_cooldowns()
            am._clear_dead_locks()

            # 信任分缓慢再生：ACTIVE 账号每 30s 回 +1，上限 100
            with _get_db_conn() as conn:
                conn.execute("""UPDATE accounts SET trust_score = MIN(100, trust_score + ?)
                                WHERE status = 'ACTIVE' AND trust_score < 100""",
                             (TRUST_REGEN_PER_CYCLE,))
                conn.commit()

            with _get_db_conn() as conn:
                c = conn.cursor()
                # 租约超时回收：LEASED → READY
                c.execute(f"UPDATE question_tasks SET state = '{S_READY}', lease_owner = NULL, lease_until = 0 "
                          f"WHERE state = '{S_LEASED}' AND lease_until > 0 AND lease_until < ?", (now,))
                recovered = c.rowcount

                # BACKOFF 到期自动提升：BACKOFF → READY（由 lock_and_get_target 的 WHERE 条件处理）
                # 这里不需要显式 UPDATE，因为 lock_and_get_target 已经包含 BACKOFF + next_run_at <= now

                conn.commit()
                if recovered:
                    print(f"[Maintenance] 回收 {recovered} 个过期租约")
        except Exception:
            pass


# ==========================================
# 辅助函数
# ==========================================
def _is_zhihu_challenge_page(resp):
    """检测知乎反爬验证页面。支持 HTML 和 JSON 两种响应格式。"""
    # 先检查完整 body，不只看前 500 字符
    body = resp.text if resp.text else ""
    body_lower = body[:2000].lower()

    # JSON 格式的反爬响应: {"error":{"code":403,"message":"..."}}
    if resp.status_code == 200 and body.startswith('{'):
        try:
            import json as _json
            err_data = _json.loads(body)
            if isinstance(err_data, dict):
                error = err_data.get("error", {})
                if isinstance(error, dict):
                    err_code = error.get("code", 0)
                    err_msg = str(error.get("message", "")).lower()
                    if err_code in (403, 429, 4031, 4032) or any(
                        m in err_msg for m in ['captcha', 'limit', 'block', '安全', '频率']
                    ):
                        return True
        except Exception:
            pass

    # HTML 格式的反爬页面
    content_type = resp.headers.get('Content-Type', '')
    challenge_markers = [
        'unhuman', '安全验证', 'captcha', '知乎安全中心',
        '人机验证', '系统检测到异常', 'request rejected',
        'too many requests', '访问过于频繁', '您的IP暂时',
        '请完成验证', '滑块验证', '请点击下方'
    ]
    return any(marker in body_lower for marker in challenge_markers)


def _classify_error(resp, data=None):
    """根据响应分类错误"""
    if resp is None:
        return E_TRANSIENT_NETWORK
    if resp.status_code == 401:
        return E_HTTP_401
    if resp.status_code in (403, 429) or _is_zhihu_challenge_page(resp):
        body = resp.text[:2000] if resp.text else ""
        body_lower = body.lower()
        if any(m in body_lower for m in ['captcha', '安全验证', 'unhuman', '人机验证', '滑块']):
            return E_CAPTCHA_HTML
        return E_HTTP_403_429
    if resp.status_code == 404:
        return E_PERMANENT_404
    if resp.status_code == 200:
        if data is None:
            # 200 但非 JSON，进一步甄别是否为反爬页面
            if _is_zhihu_challenge_page(resp):
                return E_CAPTCHA_HTML
            return E_FORMAT_ERROR
        if "data" not in data or not isinstance(data.get("data"), list):
            # 可能是 JSON 格式的错误响应
            error = data.get("error", {})
            if isinstance(error, dict) and error.get("code", 0) in (403, 429):
                return E_HTTP_403_429
            return E_FORMAT_ERROR
    return E_FORMAT_ERROR


def _get_backoff_seconds(error_class, retry_count):
    """根据错误类型和重试次数计算退避秒数。返回 None 表示应该转 GAP/QUARANTINED。"""
    spec = BACKOFF_SECONDS.get(error_class)
    if spec is None:
        return 60  # 默认
    if isinstance(spec, list):
        idx = min(retry_count, len(spec) - 1)
        return spec[idx]
    return spec


# ==========================================
# Worker 主循环
# ==========================================
def worker_cycle(worker_id, am, tm, supervisor):
    session = requests.Session()
    session.trust_env = False
    if TUNNEL_PROXY_URL:
        session.proxies = {"http": TUNNEL_PROXY_URL, "https": TUNNEL_PROXY_URL}

    worker_name = f"w{worker_id}"

    while True:
        # 检查是否达到采集上限
        if MAX_ANSWERS_LIMIT > 0:
            with stats.lock:
                if stats.scraped_answers >= MAX_ANSWERS_LIMIT:
                    print(f"[{worker_name}] 已达采集上限 {MAX_ANSWERS_LIMIT} 条，Worker 退出")
                    return

        # 等待 signer 就绪
        while not supervisor.is_ready:
            time.sleep(2)

        task = tm.lock_and_get_target(worker_name)
        if not task:
            # 没有可用任务，检查是否全部完成
            remaining = tm.get_remaining_count()
            if remaining == 0:
                break
            time.sleep(5)
            continue

        question_id = task['question_id']
        offset = task['current_offset']
        current_retries = task['retry_count']

        d_c0, z_c0 = am.lock_and_get_weapon()
        if not d_c0:
            # 没有可用账号，任务回 READY
            tm.transition_state(question_id, S_READY)
            time.sleep(10)
            continue

        target_api = f"/api/v4/questions/{question_id}/answers?limit=20&offset={offset}&include=data[*].content"

        # ── 签名（带缓存）──
        t0 = time.time()
        sig = _get_signature_cached(session, target_api, d_c0)

        if not sig:
            latency = int((time.time() - t0) * 1000)
            attempt_id = tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                           None, E_SIGNER_ERROR, "签名获取失败", latency)
            with stats.lock:
                stats.fail_signer += 1

            am.release_weapon(d_c0)

            backoff = _get_backoff_seconds(E_SIGNER_ERROR, current_retries)
            if backoff is None:
                tm.create_gap(question_id, offset, E_SIGNER_ERROR, attempt_id)
                tm.transition_state(question_id, S_GAP, error_class=E_SIGNER_ERROR,
                                    retry_count=current_retries + 1)
                print(f"[{worker_name}] Q{question_id} 签名连续失败 → GAP")
            else:
                tm.transition_state(question_id, S_BACKOFF, error_class=E_SIGNER_ERROR,
                                    retry_count=current_retries + 1,
                                    next_run_at=int(time.time()) + backoff)
            continue

        # ── 发起知乎 API 请求 ──
        # ── 构建 Cookie 头 ──
        cookie_parts = [f'd_c0="{d_c0}"']
        if z_c0:
            cookie_parts.append(f'z_c0="{z_c0}"')
        cookie_header = '; '.join(cookie_parts)

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
            'x-zse-93': '101_3_3.0',
            'x-zse-96': sig,
            'Cookie': cookie_header,
            'Connection': 'close',
        }

        t0 = time.time()
        try:
            with stats.lock:
                stats.total_requests += 1

            resp = session.get(f"https://www.zhihu.com{target_api}", headers=headers, timeout=15)
            latency = int((time.time() - t0) * 1000)

            if resp.status_code == 200:
                # 尝试 JSON 解码
                try:
                    data = resp.json()
                except ValueError:
                    error_class = E_CAPTCHA_HTML
                    attempt_id = tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                                   200, error_class, "200 但非 JSON", latency)
                    with stats.lock:
                        stats.fail_403_429 += 1
                    am.report_damage(d_c0, error_class)

                    backoff = _get_backoff_seconds(error_class, current_retries)
                    if backoff is None:
                        tm.create_gap(question_id, offset, error_class, attempt_id)
                        tm.transition_state(question_id, S_QUARANTINED, error_class=error_class,
                                            retry_count=current_retries + 1)
                    else:
                        tm.transition_state(question_id, S_BACKOFF, error_class=error_class,
                                            retry_count=current_retries + 1,
                                            next_run_at=int(time.time()) + backoff)
                    continue

                # 格式校验
                if "data" not in data or not isinstance(data["data"], list):
                    error_class = E_FORMAT_ERROR
                    attempt_id = tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                                   200, error_class, "格式异常: 缺少 data 数组", latency)
                    with stats.lock:
                        stats.fail_other += 1
                    am.report_damage(d_c0, error_class)  # FORMAT_ERROR 不罚账号

                    backoff = _get_backoff_seconds(error_class, current_retries)
                    if backoff is None:
                        tm.create_gap(question_id, offset, error_class, attempt_id)
                        tm.transition_state(question_id, S_QUARANTINED, error_class=error_class,
                                            retry_count=current_retries + 1)
                    else:
                        tm.transition_state(question_id, S_BACKOFF, error_class=error_class,
                                            retry_count=current_retries + 1,
                                            next_run_at=int(time.time()) + backoff)
                    continue

                # ── 正常数据处理 ──
                with stats.lock:
                    stats.success_200 += 1

                is_end = data.get("paging", {}).get("is_end", False)
                answers = data["data"]

                if len(answers) == 0:
                    if is_end:
                        # 真正的末页
                        tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                          200, None, "空页+is_end=true", latency)
                        am.release_weapon(d_c0)
                        tm.transition_state(question_id, S_DONE, retry_count=0)
                    else:
                        # FALSE_EMPTY：空页但 is_end=false
                        # 策略：先换号重试同一 offset，不超过 GAP_THRESHOLD 次
                        error_class = E_FALSE_EMPTY
                        attempt_id = tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                                       200, error_class, "data=[] && is_end=false", latency)
                        am.report_damage(d_c0, error_class)

                        # 换号重试：当前账号可能被风控限制返回空数据
                        alt_account = am.lock_and_get_weapon()
                        if alt_account[0]:
                            alt_d_c0, alt_z_c0 = alt_account
                            print(f"[{worker_name}] Q{question_id} 假空页 → 换号重试 offset={offset}")
                            # 用新账号重新签名
                            alt_sig = _get_signature_cached(session, target_api, alt_d_c0)
                            if alt_sig:
                                alt_cookie = f'd_c0="{alt_d_c0}"'
                                if alt_z_c0:
                                    alt_cookie += f'; z_c0="{alt_z_c0}"'
                                try:
                                    alt_resp = session.get(f"https://www.zhihu.com{target_api}",
                                                          headers={**headers, 'Cookie': alt_cookie},
                                                          timeout=15)
                                    if alt_resp.status_code == 200:
                                        try:
                                            alt_data = alt_resp.json()
                                            if "data" in alt_data and isinstance(alt_data["data"], list) and len(alt_data["data"]) > 0:
                                                # 换号成功！使用新数据
                                                tm.save_raw_answers(question_id, alt_data["data"])
                                                with stats.lock:
                                                    stats.scraped_answers += len(alt_data["data"])
                                                tm.record_attempt(question_id, offset, alt_d_c0, supervisor.signer_version,
                                                                  200, None, f"换号成功 {len(alt_data['data'])} 条", latency)
                                                am.release_weapon(alt_d_c0)
                                                is_end = alt_data.get("paging", {}).get("is_end", False)
                                                next_offset = offset + 20
                                                new_state = S_DONE if is_end else S_READY
                                                tm.transition_state(question_id, new_state, new_offset=next_offset, retry_count=0)
                                                print(f"[{worker_name}] Q{question_id} 换号重试成功 ✓ 获得 {len(alt_data['data'])} 条")
                                                continue
                                        except ValueError:
                                            pass
                                    am.report_damage(alt_d_c0, error_class)
                                except Exception:
                                    am.release_weapon(alt_d_c0)
                            else:
                                am.release_weapon(alt_d_c0)
                            print(f"[{worker_name}] Q{question_id} 换号重试也失败，进入退避")

                        backoff = _get_backoff_seconds(error_class, current_retries)
                        if backoff is None:
                            tm.create_gap(question_id, offset, error_class, attempt_id)
                            tm.transition_state(question_id, S_GAP, error_class=error_class,
                                                retry_count=current_retries + 1)
                            print(f"[{worker_name}] Q{question_id} offset={offset} 假空页 ×{current_retries+1} → GAP")
                        else:
                            tm.transition_state(question_id, S_BACKOFF, error_class=error_class,
                                                retry_count=current_retries + 1,
                                                next_run_at=int(time.time()) + backoff)
                            print(f"[{worker_name}] Q{question_id} 假空页 → BACKOFF {backoff}s")
                    continue

                # 有数据，保存
                tm.save_raw_answers(question_id, answers)
                with stats.lock:
                    stats.scraped_answers += len(answers)

                tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                  200, None, f"成功 {len(answers)} 条", latency)
                am.release_weapon(d_c0)

                next_offset = offset + 20
                if is_end:
                    tm.transition_state(question_id, S_DONE, new_offset=next_offset, retry_count=0)
                    # 完整性校验：比对 answer_count
                    answer_total = data.get("paging", {}).get("totals", 0)
                    if answer_total > 0:
                        tm.verify_completeness(question_id, answer_total)
                else:
                    tm.transition_state(question_id, S_READY, new_offset=next_offset, retry_count=0)

                # ── 稳健模式：成功后随机延迟，模拟人类浏览节律 ──
                import random as _rand
                throttle = _rand.uniform(2.0, 6.0)
                time.sleep(throttle)

            elif resp.status_code == 401:
                # HTTP 401: 账号死，任务不罚（换号重试）
                error_class = E_HTTP_401
                tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                  401, error_class, "Unauthorized", latency)
                with stats.lock:
                    stats.fail_401 += 1
                am.report_damage(d_c0, error_class)
                tm.transition_state(question_id, S_READY, error_class=error_class)

            elif resp.status_code == 404:
                # 题目不存在
                error_class = E_PERMANENT_404
                tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                  404, error_class, "Not Found", latency)
                am.release_weapon(d_c0)
                tm.transition_state(question_id, S_DEAD, error_class=error_class)
                print(f"[{worker_name}] Q{question_id} → DEAD (404)")

            else:
                # 403/429/挑战页/其他
                error_class = _classify_error(resp)
                detail = f"HTTP {resp.status_code}"
                attempt_id = tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                                               resp.status_code, error_class, detail, latency)
                with stats.lock:
                    stats.fail_403_429 += 1
                am.report_damage(d_c0, error_class)

                backoff = _get_backoff_seconds(error_class, current_retries)
                if backoff is None:
                    tm.create_gap(question_id, offset, error_class, attempt_id)
                    tm.transition_state(question_id, S_GAP, error_class=error_class,
                                        retry_count=current_retries + 1)
                else:
                    tm.transition_state(question_id, S_BACKOFF, error_class=error_class,
                                        retry_count=current_retries + 1,
                                        next_run_at=int(time.time()) + backoff)

        except requests.exceptions.RequestException as e:
            latency = int((time.time() - t0) * 1000)
            error_class = E_TRANSIENT_NETWORK
            tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                              None, error_class, str(e)[:200], latency)
            am.release_weapon(d_c0)  # 网络错误不罚账号
            with stats.lock:
                stats.fail_other += 1
            tm.transition_state(question_id, S_BACKOFF, error_class=error_class,
                                retry_count=current_retries + 1,
                                next_run_at=int(time.time()) + BACKOFF_SECONDS[E_TRANSIENT_NETWORK])
            time.sleep(5)

        except Exception as e:
            latency = int((time.time() - t0) * 1000) if 't0' in dir() else 0
            tm.record_attempt(question_id, offset, d_c0, supervisor.signer_version,
                              None, E_FORMAT_ERROR, f"未知异常: {str(e)[:150]}", latency)
            with stats.lock:
                stats.fail_other += 1
            am.release_weapon(d_c0)
            tm.transition_state(question_id, S_BACKOFF, error_class=E_FORMAT_ERROR,
                                retry_count=current_retries + 1,
                                next_run_at=int(time.time()) + 60)
            time.sleep(1)


# ==========================================
# 终端仪表盘
# ==========================================
def dashboard_thread():
    while True:
        time.sleep(10)
        with stats.lock:
            reqs = stats.total_requests
            s200 = stats.success_200
            s403 = stats.fail_403_429
            s_sig = stats.fail_signer
            ans = stats.scraped_answers
            s_oth = stats.fail_other

        with _get_db_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) as n FROM accounts WHERE status='ACTIVE' AND is_in_use=0")
            active_acc = c.fetchone()['n']

            c.execute(f"SELECT state, COUNT(*) as n FROM question_tasks GROUP BY state")
            state_counts = {r['state']: r['n'] for r in c.fetchall()}

        ready = state_counts.get(S_READY, 0)
        backoff = state_counts.get(S_BACKOFF, 0)
        gap = state_counts.get(S_GAP, 0)
        done = state_counts.get(S_DONE, 0)

        rate = (s200 / reqs * 100) if reqs > 0 else 0
        print(f"\n[VNext Board] "
              f"REQ:{reqs} OK:{s200}({rate:.0f}%) BAN:{s403} SIG_ERR:{s_sig} OTHER:{s_oth} | "
              f"Ans:+{ans} | Accs:{active_acc} | "
              f"R:{ready} B:{backoff} G:{gap} D:{done}")


# ==========================================
# 入口
# ==========================================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=0, help='最大采集答案数，0=无限制')
    args = parser.parse_args()
    if args.limit > 0:
        MAX_ANSWERS_LIMIT = args.limit

    _check_and_migrate_schema()
    limit_msg = f"（限制 {MAX_ANSWERS_LIMIT} 条）" if MAX_ANSWERS_LIMIT > 0 else "（无限制）"
    print(f"====== VNext Phase 1 启动 {limit_msg} ======")

    supervisor = NodeSupervisor()
    am = AccountManager()
    tm = TaskManager()

    t_maint = threading.Thread(target=maintenance_thread, args=(am, tm), daemon=True)
    t_maint.start()

    t_dash = threading.Thread(target=dashboard_thread, daemon=True)
    t_dash.start()

    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(worker_cycle, i, am, tm, supervisor): i for i in range(CONCURRENCY)}
        for future in concurrent.futures.as_completed(futures):
            future.result()

    print("\n[System] 全部任务完成，退出。")

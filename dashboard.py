"""
知乎 RPC 采集系统 - VNext 实时监控仪表盘
启动: python dashboard.py
访问: http://127.0.0.1:5000
"""
import os
import time
import sqlite3
import requests
from flask import Flask, Response, jsonify

from config_loader import conf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_FILE = os.path.join(BASE_DIR, conf("paths.database", "bot_database.db"))
NODE_LOG = os.path.join(BASE_DIR, conf("paths.node_log", "node_signer.log"))
RPC_HOST = conf("signer.host", "127.0.0.1")
RPC_PORT = conf("signer.port", 3000)
RPC_HEALTH = f"http://{RPC_HOST}:{RPC_PORT}{conf('signer.health_endpoint', '/health')}"
DASHBOARD_HOST = conf("dashboard.host", "127.0.0.1")
DASHBOARD_PORT = conf("dashboard.port", 5000)

app = Flask(__name__)


def _get_db():
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


# ─── API Endpoints ────────────────────────────────────────────

@app.route("/api/stats")
def api_stats():
    """系统全局统计"""
    with _get_db() as conn:
        c = conn.cursor()

        # 任务按状态分组
        c.execute("SELECT state, COUNT(*) as n FROM question_tasks GROUP BY state")
        state_counts = {r["state"]: r["n"] for r in c.fetchall()}

        c.execute("SELECT COUNT(*) as total FROM question_tasks")
        total_tasks = c.fetchone()["total"]

        # 账号
        now = int(time.time())
        c.execute("SELECT COUNT(*) as total FROM accounts")
        total_accounts = c.fetchone()["total"]
        c.execute("SELECT COUNT(*) as n FROM accounts WHERE status = 'ACTIVE' AND is_in_use = 0 AND cooldown_until < ?", (now,))
        ready_accounts = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM accounts WHERE is_in_use = 1")
        busy_accounts = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM accounts WHERE status = 'DEAD'")
        dead_accounts = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM accounts WHERE cooldown_until >= ?", (now,))
        cooling_accounts = c.fetchone()["n"]

        # 回答 & 缺口
        c.execute("SELECT COUNT(*) as n FROM raw_answers")
        total_answers = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM replay_gaps WHERE status = 'PENDING'")
        pending_gaps = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM replay_gaps")
        total_gaps = c.fetchone()["n"]

        # 审计：最近 1h 错误分布
        one_hour_ago = now - 3600
        c.execute("SELECT error_class, COUNT(*) as n FROM task_attempts WHERE error_class IS NOT NULL AND created_at > ? GROUP BY error_class",
                  (one_hour_ago,))
        error_dist = {r["error_class"]: r["n"] for r in c.fetchall()}

        # 审计：最近 1h 总请求 & 成功
        c.execute("SELECT COUNT(*) as n FROM task_attempts WHERE created_at > ?", (one_hour_ago,))
        recent_total = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM task_attempts WHERE created_at > ? AND error_class IS NULL", (one_hour_ago,))
        recent_ok = c.fetchone()["n"]

        # retry 分布
        c.execute("SELECT retry_count, COUNT(*) as n FROM question_tasks WHERE state NOT IN ('DONE','DEAD') GROUP BY retry_count ORDER BY retry_count")
        retry_dist = {str(r["retry_count"]): r["n"] for r in c.fetchall()}

    # RPC health
    rpc = {"ok": False, "detail": "离线"}
    try:
        r = requests.get(RPC_HEALTH, timeout=2, proxies={"http": None, "https": None})
        if r.status_code == 200:
            rpc = {"ok": True, "detail": r.json()}
    except Exception:
        pass

    return jsonify({
        "tasks": {"total": total_tasks, "states": state_counts},
        "accounts": {"total": total_accounts, "ready": ready_accounts, "busy": busy_accounts,
                     "dead": dead_accounts, "cooling": cooling_accounts},
        "answers": total_answers,
        "gaps": {"total": total_gaps, "pending": pending_gaps},
        "rpc": rpc,
        "retry_distribution": retry_dist,
        "error_distribution": error_dist,
        "recent_requests": {"total": recent_total, "ok": recent_ok},
        "ts": now,
    })


@app.route("/api/tasks")
def api_tasks():
    with _get_db() as conn:
        c = conn.cursor()
        c.execute("""SELECT question_id, current_offset, state, retry_count, attempt_count,
                            last_error_class, source_type, priority
                     FROM question_tasks 
                     ORDER BY CASE state 
                        WHEN 'LEASED' THEN 0 WHEN 'BACKOFF' THEN 1 WHEN 'GAP' THEN 2 
                        WHEN 'QUARANTINED' THEN 3 WHEN 'READY' THEN 4 WHEN 'DONE' THEN 5 ELSE 6 END,
                     retry_count DESC, rowid DESC LIMIT 100""")
        rows = [dict(r) for r in c.fetchall()]
    return jsonify(rows)


@app.route("/api/accounts")
def api_accounts():
    with _get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT d_c0, z_c0, status, trust_score, cooldown_until, is_in_use, last_error_class FROM accounts ORDER BY status, trust_score DESC")
        rows = []
        now = int(time.time())
        for r in c.fetchall():
            d = dict(r)
            dc0 = d["d_c0"]
            d["dc0_masked"] = dc0[:6] + "****" + dc0[-4:] if len(dc0) > 10 else dc0
            d["cooling_remaining"] = max(0, d["cooldown_until"] - now)
            rows.append(d)
    return jsonify(rows)


@app.route("/api/attempts")
def api_attempts():
    """最近 50 条审计记录"""
    with _get_db() as conn:
        c = conn.cursor()
        c.execute("""SELECT attempt_id, question_id, offset, account_dc0, signer_version,
                            http_status, error_class, error_detail, latency_ms, created_at
                     FROM task_attempts ORDER BY attempt_id DESC LIMIT 50""")
        rows = []
        for r in c.fetchall():
            d = dict(r)
            if d.get("account_dc0") and len(d["account_dc0"]) > 10:
                d["account_dc0"] = d["account_dc0"][:6] + "****"
            rows.append(d)
    return jsonify(rows)


@app.route("/api/gaps")
def api_gaps():
    with _get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT gap_id, question_id, offset, reason_class, status, replay_count, first_seen_at FROM replay_gaps ORDER BY first_seen_at DESC LIMIT 50")
        rows = [dict(r) for r in c.fetchall()]
    return jsonify(rows)


@app.route("/api/logs")
def api_logs():
    lines = []
    if os.path.exists(NODE_LOG):
        try:
            with open(NODE_LOG, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()[-80:]
        except Exception:
            pass
    return jsonify([l.rstrip() for l in lines])


@app.route("/api/log-stream")
def log_stream():
    def generate():
        if not os.path.exists(NODE_LOG):
            yield "data: [等待日志文件创建...]\n\n"
            return
        with open(NODE_LOG, "r", encoding="utf-8", errors="replace") as f:
            f.seek(0, 2)
            while True:
                line = f.readline()
                if line:
                    yield f"data: {line.rstrip()}\n\n"
                else:
                    time.sleep(0.5)
    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─── Frontend ─────────────────────────────────────────────────

DASHBOARD_HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>知乎采集系统 · VNext 监控台</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0e17;--bg2:#111827;--bg3:#1a2235;--bg4:#243049;
  --text:#e2e8f0;--text2:#94a3b8;--text3:#64748b;
  --accent:#6366f1;--accent2:#818cf8;--green:#10b981;--yellow:#f59e0b;
  --red:#ef4444;--cyan:#06b6d4;--pink:#ec4899;--orange:#f97316;
  --glass:rgba(255,255,255,.04);--glass-border:rgba(255,255,255,.08);
  --radius:12px;--radius-sm:8px;
}
html{font-size:14px}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}

.header{padding:20px 32px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--glass-border);backdrop-filter:blur(12px);
  position:sticky;top:0;z-index:100;background:rgba(10,14,23,.85)}
.header h1{font-size:1.3rem;font-weight:700;
  background:linear-gradient(135deg,var(--accent2),var(--cyan));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.header .status{display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--text2)}
.header .dot{width:8px;height:8px;border-radius:50%;animation:pulse 2s infinite}
.dot.on{background:var(--green);box-shadow:0 0 8px var(--green)}
.dot.off{background:var(--red);box-shadow:0 0 8px var(--red)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.container{max-width:1440px;margin:0 auto;padding:24px 32px 48px}
.grid-5{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
@media(max-width:1200px){.grid-5{grid-template-columns:repeat(3,1fr)}.grid-3,.grid-2{grid-template-columns:1fr}}
@media(max-width:700px){.grid-5{grid-template-columns:1fr 1fr}}

.card{background:var(--bg2);border:1px solid var(--glass-border);border-radius:var(--radius);
  padding:18px 22px;transition:transform .2s,box-shadow .2s}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.3)}
.card.glow-green{border-color:rgba(16,185,129,.25)}
.card.glow-red{border-color:rgba(239,68,68,.25)}
.card-label{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:6px}
.card-value{font-size:1.8rem;font-weight:700;line-height:1}
.card-sub{font-size:.78rem;color:var(--text2);margin-top:6px;display:flex;gap:10px;flex-wrap:wrap}
.card-sub span{display:flex;align-items:center;gap:3px}
.mini-dot{width:6px;height:6px;border-radius:50%;display:inline-block}

.progress-wrap{height:5px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-top:8px}
.progress-bar{height:100%;border-radius:3px;transition:width .6s ease;background:linear-gradient(90deg,var(--accent),var(--cyan))}

.section-title{font-size:.95rem;font-weight:600;margin:24px 0 10px;display:flex;align-items:center;gap:8px}
.section-title::before{content:'';width:3px;height:16px;border-radius:2px;background:var(--accent)}

.table-wrap{overflow-x:auto;border-radius:var(--radius);border:1px solid var(--glass-border);background:var(--bg2)}
table{width:100%;border-collapse:collapse;font-size:.8rem}
th{text-align:left;padding:9px 12px;background:var(--bg3);color:var(--text2);font-weight:600;
  text-transform:uppercase;letter-spacing:.04em;font-size:.7rem;white-space:nowrap;position:sticky;top:0}
td{padding:8px 12px;border-top:1px solid var(--glass-border);white-space:nowrap}
tr:hover td{background:var(--glass)}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:600}
.badge-green{background:rgba(16,185,129,.15);color:var(--green)}
.badge-yellow{background:rgba(245,158,11,.15);color:var(--yellow)}
.badge-red{background:rgba(239,68,68,.15);color:var(--red)}
.badge-blue{background:rgba(99,102,241,.15);color:var(--accent2)}
.badge-cyan{background:rgba(6,182,212,.15);color:var(--cyan)}
.badge-orange{background:rgba(249,115,22,.15);color:var(--orange)}
.badge-pink{background:rgba(236,72,153,.15);color:var(--pink)}
.badge-gray{background:rgba(100,116,139,.15);color:var(--text3)}

.log-box{background:#0c1018;border:1px solid var(--glass-border);border-radius:var(--radius);
  padding:14px;height:280px;overflow-y:auto;font-family:'JetBrains Mono',monospace;
  font-size:.75rem;line-height:1.7;color:var(--text2);scroll-behavior:smooth}
.log-box::-webkit-scrollbar{width:6px}
.log-box::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
.log-line{padding:1px 0}
.log-line.err{color:var(--red)}
.log-line.warn{color:var(--yellow)}
.log-line.ok{color:var(--green)}
.log-line.hook{color:var(--cyan)}

.state-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.state-pill{padding:4px 10px;border-radius:6px;font-size:.72rem;font-weight:600;display:flex;align-items:center;gap:4px}

.retry-bars{display:flex;align-items:flex-end;gap:5px;height:50px;margin-top:6px}
.retry-col{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1}
.retry-col .bar{width:100%;border-radius:3px 3px 0 0;transition:height .4s ease;min-height:2px}
.retry-col .lbl{font-size:.62rem;color:var(--text3)}
.retry-col .val{font-size:.68rem;font-weight:600;color:var(--text2)}

/* tabs */
.tabs{display:flex;gap:2px;margin-bottom:0;background:var(--bg3);border-radius:var(--radius) var(--radius) 0 0;overflow:hidden;border:1px solid var(--glass-border);border-bottom:none}
.tab{padding:10px 18px;font-size:.78rem;font-weight:600;color:var(--text3);cursor:pointer;transition:all .2s;border:none;background:none}
.tab.active{color:var(--text);background:var(--bg2);border-bottom:2px solid var(--accent)}
.tab-content{display:none}
.tab-content.active{display:block}

.footer{text-align:center;padding:20px;color:var(--text3);font-size:.72rem}
</style>
</head>
<body>

<div class="header">
  <h1>⚡ VNext 采集监控台</h1>
  <div class="status">
    <span id="rpc-label">RPC Signer</span>
    <div class="dot off" id="rpc-dot"></div>
    <span id="clock" style="margin-left:12px;font-family:'JetBrains Mono',monospace;font-size:.78rem"></span>
  </div>
</div>

<div class="container">
  <!-- ── Row 1: State cards ── -->
  <div class="grid-5">
    <div class="card" id="card-tasks">
      <div class="card-label">任务总览</div>
      <div class="card-value" id="v-total">–</div>
      <div class="state-pills" id="state-pills"></div>
      <div class="progress-wrap"><div class="progress-bar" id="tasks-progress" style="width:0%"></div></div>
    </div>
    <div class="card">
      <div class="card-label">已采集回答</div>
      <div class="card-value" style="color:var(--cyan)" id="v-answers">–</div>
    </div>
    <div class="card" id="card-accounts">
      <div class="card-label">账号弹药库</div>
      <div class="card-value" id="v-acc-total">–</div>
      <div class="card-sub">
        <span><span class="mini-dot" style="background:var(--green)"></span> 就绪 <b id="v-acc-ready">0</b></span>
        <span><span class="mini-dot" style="background:var(--accent2)"></span> 作战 <b id="v-acc-busy">0</b></span>
        <span><span class="mini-dot" style="background:var(--yellow)"></span> 冷却 <b id="v-acc-cool">0</b></span>
        <span><span class="mini-dot" style="background:var(--red)"></span> 阵亡 <b id="v-acc-dead">0</b></span>
      </div>
    </div>
    <div class="card" id="card-rpc">
      <div class="card-label">RPC 签名工厂</div>
      <div class="card-value" id="v-rpc-status" style="font-size:1rem">检测中...</div>
      <div class="card-sub" id="v-rpc-detail"></div>
    </div>
    <div class="card">
      <div class="card-label">数据缺口 (Gaps)</div>
      <div class="card-value" style="color:var(--pink)" id="v-gaps">–</div>
      <div class="card-sub"><span>待回补: <b id="v-gaps-pending">0</b></span></div>
    </div>
  </div>

  <!-- ── Row 2: Error distribution + Retry + Success Rate ── -->
  <div class="grid-3">
    <div class="card">
      <div class="card-label">近 1h 错误分布</div>
      <div id="error-dist" style="margin-top:6px"></div>
    </div>
    <div class="card">
      <div class="card-label">重试分布 (活跃任务)</div>
      <div class="retry-bars" id="retry-chart"></div>
    </div>
    <div class="card">
      <div class="card-label">近 1h 成功率</div>
      <div class="card-value" id="v-success-rate" style="color:var(--green)">–</div>
      <div class="card-sub"><span>请求: <b id="v-recent-total">0</b></span><span>成功: <b id="v-recent-ok">0</b></span></div>
    </div>
  </div>

  <!-- ── Logs ── -->
  <div class="section-title">实时日志流</div>
  <div class="log-box" id="logbox"></div>

  <!-- ── Tabs: Tasks / Accounts / Attempts / Gaps ── -->
  <div style="margin-top:24px">
    <div class="tabs">
      <div class="tab active" onclick="switchTab('tab-tasks',this)">任务队列</div>
      <div class="tab" onclick="switchTab('tab-attempts',this)">审计日志</div>
      <div class="tab" onclick="switchTab('tab-accounts',this)">账号池</div>
      <div class="tab" onclick="switchTab('tab-gaps',this)">缺口记录</div>
    </div>

    <div id="tab-tasks" class="tab-content active">
      <div class="table-wrap" style="max-height:400px;overflow-y:auto;border-radius:0 0 var(--radius) var(--radius)">
        <table><thead><tr>
          <th>QID</th><th>Offset</th><th>状态</th><th>重试</th><th>尝试</th><th>最后错误</th><th>来源</th>
        </tr></thead><tbody id="tasks-tbody"></tbody></table>
      </div>
    </div>

    <div id="tab-attempts" class="tab-content">
      <div class="table-wrap" style="max-height:400px;overflow-y:auto;border-radius:0 0 var(--radius) var(--radius)">
        <table><thead><tr>
          <th>ID</th><th>QID</th><th>Offset</th><th>HTTP</th><th>错误</th><th>耗时</th><th>Signer</th><th>时间</th>
        </tr></thead><tbody id="attempts-tbody"></tbody></table>
      </div>
    </div>

    <div id="tab-accounts" class="tab-content">
      <div class="table-wrap" style="max-height:300px;overflow-y:auto;border-radius:0 0 var(--radius) var(--radius)">
        <table><thead><tr>
          <th>DC0</th><th>状态</th><th>信任分</th><th>冷却</th><th>使用中</th><th>最后错误</th>
        </tr></thead><tbody id="acc-tbody"></tbody></table>
      </div>
    </div>

    <div id="tab-gaps" class="tab-content">
      <div class="table-wrap" style="max-height:300px;overflow-y:auto;border-radius:0 0 var(--radius) var(--radius)">
        <table><thead><tr>
          <th>QID</th><th>Offset</th><th>原因</th><th>状态</th><th>回放次数</th><th>首次发现</th>
        </tr></thead><tbody id="gaps-tbody"></tbody></table>
      </div>
    </div>
  </div>
</div>

<div class="footer">知乎 RPC 采集系统 VNext Phase 1 · Dashboard</div>

<script>
const $ = s => document.getElementById(s);
const STATE_BADGE = {
  READY:       {cls:'badge-blue',  label:'待采'},
  LEASED:      {cls:'badge-cyan',  label:'采集中'},
  BACKOFF:     {cls:'badge-yellow',label:'退避'},
  GAP:         {cls:'badge-orange',label:'缺口'},
  DONE:        {cls:'badge-green', label:'完成'},
  QUARANTINED: {cls:'badge-pink',  label:'隔离'},
  DEAD:        {cls:'badge-red',   label:'终止'},
};
const STATE_COLORS = {
  READY:'var(--accent2)', LEASED:'var(--cyan)', BACKOFF:'var(--yellow)',
  GAP:'var(--orange)', DONE:'var(--green)', QUARANTINED:'var(--pink)', DEAD:'var(--red)'
};

setInterval(() => {
  $('clock').textContent = new Date().toLocaleTimeString('zh-CN', {hour12: false});
}, 1000);

function switchTab(id, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  $(id).classList.add('active');
  el.classList.add('active');
}

async function fetchJSON(url) {
  try { const r = await fetch(url); return await r.json(); } catch(e) { return null; }
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleTimeString('zh-CN', {hour12:false});
}

async function refreshStats() {
  const d = await fetchJSON('/api/stats');
  if (!d) return;
  const st = d.tasks.states || {};
  const total = d.tasks.total;
  const done = st.DONE || 0;

  $('v-total').textContent = total.toLocaleString();
  const pct = total > 0 ? (done / total * 100) : 0;
  $('tasks-progress').style.width = pct.toFixed(1) + '%';

  // State pills
  const pills = $('state-pills');
  pills.innerHTML = Object.entries(st).map(([s, n]) => {
    const c = STATE_COLORS[s] || 'var(--text3)';
    return `<div class="state-pill" style="background:${c}22;color:${c}">${s} ${n}</div>`;
  }).join('');

  $('v-answers').textContent = d.answers.toLocaleString();
  $('v-acc-total').textContent = d.accounts.total;
  $('v-acc-ready').textContent = d.accounts.ready;
  $('v-acc-busy').textContent = d.accounts.busy;
  $('v-acc-cool').textContent = d.accounts.cooling;
  $('v-acc-dead').textContent = d.accounts.dead;
  $('v-gaps').textContent = d.gaps.total;
  $('v-gaps-pending').textContent = d.gaps.pending;

  // RPC
  const dot = $('rpc-dot');
  const rpcCard = $('card-rpc');
  if (d.rpc.ok) {
    dot.className = 'dot on';
    rpcCard.className = 'card glow-green';
    const h = d.rpc.detail;
    $('v-rpc-status').textContent = '🟢 在线';
    $('v-rpc-status').style.color = 'var(--green)';
    const canary = h.last_canary_ok ? fmtTime(h.last_canary_ok) : '未验';
    $('v-rpc-detail').innerHTML = `
      <span>v${h.signer_version||'?'}</span>
      <span>W:${h.availableWorkers||0}</span>
      <span>Q:${h.queueDepth||0}</span>
      <span>🐤${canary}</span>`;
  } else {
    dot.className = 'dot off';
    rpcCard.className = 'card glow-red';
    $('v-rpc-status').textContent = '🔴 离线';
    $('v-rpc-status').style.color = 'var(--red)';
    $('v-rpc-detail').innerHTML = '';
  }

  // Success rate
  const rr = d.recent_requests;
  $('v-recent-total').textContent = rr.total;
  $('v-recent-ok').textContent = rr.ok;
  const rate = rr.total > 0 ? (rr.ok / rr.total * 100).toFixed(1) + '%' : '—';
  $('v-success-rate').textContent = rate;
  $('v-success-rate').style.color = rr.total > 0 && rr.ok/rr.total > 0.8 ? 'var(--green)' : 'var(--yellow)';

  // Error distribution
  const ed = d.error_distribution;
  const edEl = $('error-dist');
  const errColors = {
    TRANSIENT_NETWORK:'var(--text3)',HTTP_403_429:'var(--yellow)',HTTP_401:'var(--red)',
    CAPTCHA_HTML:'var(--orange)',FORMAT_ERROR:'var(--pink)',SIGNER_ERROR:'var(--accent2)',
    FALSE_EMPTY:'var(--cyan)',PERMANENT_404:'var(--text3)'
  };
  if (Object.keys(ed).length === 0) {
    edEl.innerHTML = '<span style="color:var(--text3);font-size:.78rem">暂无错误 ✓</span>';
  } else {
    edEl.innerHTML = Object.entries(ed).map(([k,v]) => {
      const c = errColors[k]||'var(--text3)';
      return `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:.75rem">
        <span style="color:${c}">${k}</span><span style="font-weight:600">${v}</span></div>`;
    }).join('');
  }

  // Retry chart
  const retryEl = $('retry-chart');
  const rd = d.retry_distribution;
  const keys = Object.keys(rd).sort((a,b) => +a - +b);
  if (keys.length === 0) {
    retryEl.innerHTML = '<span style="color:var(--text3);font-size:.78rem">—</span>';
  } else {
    const maxVal = Math.max(...keys.map(k => rd[k]), 1);
    const colors = ['var(--green)','var(--cyan)','var(--yellow)','var(--orange)','var(--pink)','var(--red)'];
    retryEl.innerHTML = keys.map((k) => {
      const h = Math.max(4, (rd[k] / maxVal) * 44);
      const c = colors[Math.min(+k, colors.length - 1)];
      return `<div class="retry-col"><div class="val">${rd[k]}</div>
        <div class="bar" style="height:${h}px;background:${c}"></div>
        <div class="lbl">R${k}</div></div>`;
    }).join('');
  }
}

async function refreshTasks() {
  const rows = await fetchJSON('/api/tasks');
  if (!rows) return;
  $('tasks-tbody').innerHTML = rows.map(r => {
    const sb = STATE_BADGE[r.state] || {cls:'badge-gray',label:r.state};
    const errBadge = r.last_error_class
      ? `<span class="badge badge-red">${r.last_error_class}</span>`
      : '<span class="badge badge-gray">—</span>';
    return `<tr>
      <td><a href="https://www.zhihu.com/question/${r.question_id}" target="_blank" style="color:var(--accent2);text-decoration:none">${r.question_id}</a></td>
      <td>${r.current_offset}</td>
      <td><span class="badge ${sb.cls}">${sb.label}</span></td>
      <td>${r.retry_count}</td>
      <td>${r.attempt_count}</td>
      <td>${errBadge}</td>
      <td><span class="badge badge-gray">${r.source_type||'—'}</span></td>
    </tr>`;
  }).join('');
}

async function refreshAttempts() {
  const rows = await fetchJSON('/api/attempts');
  if (!rows) return;
  $('attempts-tbody').innerHTML = rows.map(r => {
    const httpBadge = r.http_status
      ? (r.http_status===200 && !r.error_class
          ? `<span class="badge badge-green">${r.http_status}</span>`
          : `<span class="badge badge-yellow">${r.http_status}</span>`)
      : '<span class="badge badge-gray">—</span>';
    const errBadge = r.error_class
      ? `<span class="badge badge-red">${r.error_class}</span>`
      : '<span class="badge badge-green">OK</span>';
    return `<tr>
      <td>${r.attempt_id}</td>
      <td>${r.question_id}</td>
      <td>${r.offset}</td>
      <td>${httpBadge}</td>
      <td>${errBadge}</td>
      <td>${r.latency_ms||'—'}ms</td>
      <td style="font-size:.7rem">${r.signer_version||'—'}</td>
      <td style="font-size:.7rem">${fmtTime(r.created_at)}</td>
    </tr>`;
  }).join('');
}

async function refreshAccounts() {
  const rows = await fetchJSON('/api/accounts');
  if (!rows) return;
  $('acc-tbody').innerHTML = rows.map(r => {
    const st = r.status==='ACTIVE'
      ? '<span class="badge badge-green">ACTIVE</span>'
      : '<span class="badge badge-red">'+r.status+'</span>';
    const cool = r.cooling_remaining > 0
      ? `<span class="badge badge-yellow">${r.cooling_remaining}s</span>`
      : '<span class="badge badge-gray">—</span>';
    const inUse = r.is_in_use ? '<span class="badge badge-cyan">使用中</span>' : '<span class="badge badge-gray">空闲</span>';
    const lastErr = r.last_error_class ? `<span class="badge badge-orange">${r.last_error_class}</span>` : '—';
    return `<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:.72rem">${r.dc0_masked}</td>
      <td>${st}</td><td>${r.trust_score}</td><td>${cool}</td><td>${inUse}</td><td>${lastErr}</td>
    </tr>`;
  }).join('');
}

async function refreshGaps() {
  const rows = await fetchJSON('/api/gaps');
  if (!rows) return;
  $('gaps-tbody').innerHTML = rows.map(r => {
    const stBadge = r.status==='PENDING'
      ? '<span class="badge badge-yellow">PENDING</span>'
      : r.status==='RESOLVED'
        ? '<span class="badge badge-green">RESOLVED</span>'
        : `<span class="badge badge-gray">${r.status}</span>`;
    return `<tr>
      <td>${r.question_id}</td><td>${r.offset}</td>
      <td><span class="badge badge-orange">${r.reason_class}</span></td>
      <td>${stBadge}</td><td>${r.replay_count}</td>
      <td style="font-size:.7rem">${fmtTime(r.first_seen_at)}</td>
    </tr>`;
  }).join('');
}

function startLogStream() {
  const box = $('logbox');
  fetchJSON('/api/logs').then(lines => {
    if (!lines) return;
    lines.forEach(l => appendLog(box, l));
    box.scrollTop = box.scrollHeight;
  });
  const es = new EventSource('/api/log-stream');
  es.onmessage = e => {
    appendLog(box, e.data);
    if (box.scrollHeight - box.scrollTop - box.clientHeight < 80) box.scrollTop = box.scrollHeight;
  };
  es.onerror = () => { setTimeout(startLogStream, 3000); es.close(); };
}

function appendLog(box, text) {
  const div = document.createElement('div');
  div.className = 'log-line';
  if (/fatal|error|失败|阵亡|自杀/i.test(text)) div.className += ' err';
  else if (/warn|warning|拦截|冷却|backoff|canary.*失败/i.test(text)) div.className += ' warn';
  else if (/成功|就绪|在线|捕获|canary.*通过/i.test(text)) div.className += ' ok';
  else if (/hook|注入/i.test(text)) div.className += ' hook';
  div.textContent = text;
  box.appendChild(div);
  while (box.children.length > 500) box.removeChild(box.firstChild);
}

refreshStats(); refreshTasks(); refreshAttempts(); refreshAccounts(); refreshGaps(); startLogStream();
setInterval(refreshStats, 3000);
setInterval(() => { refreshTasks(); refreshAttempts(); refreshAccounts(); refreshGaps(); }, 5000);
</script>
</body>
</html>"""


@app.route("/")
def index():
    return DASHBOARD_HTML


if __name__ == "__main__":
    from logger_setup import logger
    logger.info("=" * 50)
    logger.info("  知乎采集系统 · VNext 实时监控仪表盘")
    logger.info(f"  访问 http://{DASHBOARD_HOST}:{DASHBOARD_PORT}")
    logger.info("=" * 50)
    app.run(host=DASHBOARD_HOST, port=DASHBOARD_PORT, debug=False, threaded=True)

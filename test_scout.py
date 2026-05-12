"""
scout 快速测试脚本 — 限定 10 次请求，指定 d_c0
用法: python test_scout.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests
import sqlite3
import time
import random
import urllib.parse
import os

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DB_FILE    = os.path.join(BASE_DIR, "bot_database.db")
RPC_SERVER = "http://127.0.0.1:3000/get_sign"

# ── 测试 Cookie ──────────────────────────────────────────
TEST_DC0 = 'zhSYMUJyLxyPTomMBKO2fCYeA4HRFlR4Unc=|1777000405'
TEST_ZC0 = ('2|1:0|10:1777001664|4:z_c0|92:'
            'Mi4xVG50RDFnVUFBQURPRkpneFFuSXZIQ1lBQUFCZ0FsVk51ekxZYWdEZGEzeE9sc0VOQUZmVE1lcHVMX012YmktOUZ3|'
            'd022b6c9408f861dede6fa8003adb7b11b6199b5b779abb294f66f272e5a9960')

# ── 搜索矩阵（只取前 10 个组合）────────────────────────────
MAJORS   = ["计算机科学与技术", "土木工程", "环境工程", "临床医学", "法学"]
KEYWORDS = ["劝退", "后悔"]          # 5×2 = 10 次，恰好 10 个请求
MAX_REQUESTS   = 10
MIN_ANSWER_COUNT = 20   # 降低门槛，搜索词已经过滤了相关性


def get_sign(session, api_path, dc0):
    try:
        r = session.post(RPC_SERVER,
                         json={"url": api_path, "dc0": dc0},
                         timeout=5,
                         proxies={"http": None, "https": None})
        if r.status_code == 200:
            return r.json().get("signature")
    except Exception as e:
        print(f"  [RPC Error] {e}")
    return None


def _check_rpc():
    """RPC Signer 预检，无法连接则直接退出"""
    try:
        r = requests.get("http://127.0.0.1:3000/health",
                         timeout=3, proxies={"http": None, "https": None})
        if r.status_code == 200 and r.json().get("ready"):
            print("[RPC] Signer 在线 (ready=true)")
            return True
    except Exception:
        pass
    print("[ERROR] RPC Signer 未运行！")
    print("        请先在另一个终端执行: node rpc_server.js")
    print("        等待输出 'RPC 在线' 后再跑本脚本")
    return False


def run_test():
    if not _check_rpc():
        sys.exit(1)

    print("=" * 60)
    print(f"  Scout 测试模式 · 限制 {MAX_REQUESTS} 次请求")
    print(f"  d_c0 = {TEST_DC0[:20]}...")
    print("=" * 60)

    session = requests.Session()
    session.trust_env = False

    req_count     = 0
    total_found   = 0
    total_written = 0

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()

        for major in MAJORS:
            for keyword in KEYWORDS:
                if req_count >= MAX_REQUESTS:
                    break

                query      = f"{major} {keyword}"
                encoded_q  = urllib.parse.quote(query)
                api_path   = (f"/api/v4/search_v3?t=general&q={encoded_q}"
                              f"&correction=1&offset=0&limit=20")

                print(f"\n[{req_count+1}/{MAX_REQUESTS}] 搜索: 「{query}」")

                sig = get_sign(session, api_path, TEST_DC0)
                if not sig:
                    print("  [!!] 签名失败，跳过")
                    req_count += 1
                    continue

                headers = {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "x-zse-93": "101_3_3.0",
                    "x-zse-96": sig,
                    "Cookie":   f'd_c0="{TEST_DC0}"; z_c0="{TEST_ZC0}"',
                    "Connection": "close",
                }

                try:
                    resp = session.get(
                        f"https://www.zhihu.com{api_path}",
                        headers=headers,
                        timeout=15
                    )
                    req_count += 1

                    print(f"  HTTP {resp.status_code}", end="")

                    if resp.status_code != 200:
                        print(f"  ← 非 200，跳过")
                        if resp.status_code in (401, 403):
                            print("  ⚠️  Cookie 可能已失效或被风控")
                        continue

                    try:
                        data = resp.json()
                    except Exception:
                        print(f"  ← 返回了非 JSON（可能是验证页），前 200 字:")
                        print(f"     {resp.text[:200]}")
                        continue

                    items = data.get("data", [])
                    print(f"  ← 返回 {len(items)} 条原始结果")

                    valid = 0
                    for item in items:
                        if item.get("type") != "search_result":
                            continue
                        obj      = item.get("object", {})
                        obj_type = obj.get("type", "")

                        qid = None
                        if obj_type == "answer":
                            # 新版 API: question 子对象只有 id，从 url 解析更可靠
                            # url 格式: https://www.zhihu.com/question/465369002/answer/...
                            url = obj.get("url", "")
                            import re
                            m = re.search(r'/question/(\d+)', url)
                            if m:
                                qid = m.group(1)
                            else:
                                q_obj = obj.get("question", {})
                                qid   = str(q_obj.get("id", "")) or None
                        elif obj_type == "question":
                            qid = str(obj.get("id", "")) or None

                        if not qid:
                            continue

                        # 尝试获取标题用于展示（可能为空）
                        q_obj = obj.get("question", obj)
                        title = q_obj.get("title") or q_obj.get("name") or f"QID:{qid}"
                        excerpt = obj.get("excerpt", "")[:40]

                        now = int(time.time())
                        c.execute(
                            """INSERT OR IGNORE INTO question_tasks
                               (question_id, current_offset, state,
                                source_type, created_at, updated_at)
                               VALUES (?, 0, 'READY', 'scout_test', ?, ?)""",
                            (qid, now, now)
                        )
                        total_written += c.rowcount
                        valid += 1
                        total_found += 1
                        display = title[:40] if title != f"QID:{qid}" else excerpt
                        print(f"    [OK] QID:{qid} | {display}")

                    conn.commit()
                    print(f"  → 本次过滤后有效: {valid} 条")

                except Exception as e:
                    print(f"  ✗ 请求异常: {e}")
                    req_count += 1

                time.sleep(random.uniform(1.5, 3.0))   # 礼貌间隔

            else:
                continue
            break  # MAX_REQUESTS 已到，跳出外层循环

    print("\n" + "=" * 60)
    print(f"  测试完成: 共发出 {req_count} 次请求")
    print(f"  通过过滤的问题: {total_found} 个")
    print(f"  新写入数据库:   {total_written} 条")
    print("=" * 60)


if __name__ == "__main__":
    run_test()

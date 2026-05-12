"""
知乎定向搜索侦察兵 — 发现高价值问题目标
用法: python scout.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests
import sqlite3
import time
import random
import string
import urllib.parse
import re
import os

# ── 加载配置 ─────────────────────────────────────────────
try:
    from config_loader import config as _cfg
except Exception:
    _cfg = {}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def _conf(key, default):
    keys = key.split(".")
    val = _cfg
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        else:
            return default
    return val if val is not None else default

DB_FILE = os.path.join(BASE_DIR, _conf("paths.database", "bot_database.db"))
SIGNER_HOST = _conf("signer.host", "127.0.0.1")
SIGNER_PORT = _conf("signer.port", 3000)
RPC_SERVER = f"http://{SIGNER_HOST}:{SIGNER_PORT}/get_sign"
TARGET_MAJORS = _conf("scout.target_majors", ["计算机科学与技术", "土木工程", "环境工程", "临床医学", "法学"])
EMOTION_KEYWORDS = _conf("scout.emotion_keywords", ["劝退", "后悔", "坑", "转行", "就业惨"])
MIN_ANSWER_COUNT = _conf("scout.min_answer_count", 50)
SEARCH_DELAY_MIN = _conf("scout.search_delay_min", 2.0)
SEARCH_DELAY_MAX = _conf("scout.search_delay_max", 4.0)
UA = _conf("browser.user_agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")


def generate_fake_dc0():
    """动态伪造定长的访客身份"""
    rand_str = ''.join(random.choices(string.ascii_letters + string.digits, k=22))
    return f'{rand_str}visitor='


def _extract_question_id(item):
    """
    从搜索结果条目中提取 question_id。
    兼容多种 API 返回结构：
    - 新版: object.type='answer', url 中包含 /question/{id}/answer/{aid}
    - 旧版: object.type='question', object.id 直接是 question_id
    - 部分场景: question 子对象中可能只有 id
    """
    obj = item.get("object", {})

    # 策略 1: 从 url 解析（最可靠）
    url = obj.get("url", "")
    if url:
        m = re.search(r'/question/(\d+)', url)
        if m:
            return m.group(1)

    # 策略 2: 从 question 子对象获取
    question = obj.get("question", {})
    if isinstance(question, dict):
        qid = str(question.get("id", ""))
        if qid and qid != "0":
            return qid

    # 策略 3: 如果 object.type == 'question'，直接取 id
    if obj.get("type") == "question":
        oid = str(obj.get("id", ""))
        if oid and oid != "0":
            return oid

    return None


def get_search_signature(session, api_path, dc0):
    """请求 Node RPC 计算签名"""
    try:
        resp = session.post(RPC_SERVER, json={"url": api_path, "dc0": dc0}, timeout=5,
                          proxies={"http": None, "https": None})
        if resp.status_code == 200:
            return resp.json().get("signature")
    except Exception as e:
        print(f"    [RPC Error] {e}")
    return None


def _validate_question_exists(question_id, session, dc0):
    """快速验证 question_id 是否有效（返回 200 且包含 title）"""
    try:
        api = f"/api/v4/questions/{question_id}?include=answer_count,title"
        sig = get_search_signature(session, api, dc0)
        if not sig:
            return False, 0
        resp = session.get(f"https://www.zhihu.com{api}", timeout=10, headers={
            'User-Agent': UA,
            'x-zse-93': '101_3_3.0',
            'x-zse-96': sig,
            'Cookie': f'd_c0="{dc0}"',
            'Connection': 'close',
        })
        if resp.status_code == 200:
            data = resp.json()
            return True, data.get("answer_count", 0)
    except Exception:
        pass
    return False, 0


def run_scout():
    print("====== 重装狙击侦察兵已上线：执行定点清除与高价值目标锁定 ======")

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()

        session = requests.Session()
        session.trust_env = False

        visitor_dc0 = generate_fake_dc0()
        print(f">>> 临时战术指纹: d_c0={visitor_dc0[:20]}...")

        total_captured = 0

        for major in TARGET_MAJORS:
            for keyword in EMOTION_KEYWORDS:
                search_query = f"{major} {keyword}"
                print(f"\n>>> 正在执行战略搜索: [{search_query}] ...")

                encoded_query = urllib.parse.quote(search_query)
                api_path = f"/api/v4/search_v3?t=general&q={encoded_query}&correction=1&offset=0&limit=20"

                sig = get_search_signature(session, api_path, visitor_dc0)
                if not sig:
                    print(f"    [Fatal] 签名节点失联，跳过 [{search_query}]")
                    continue

                headers = {
                    'User-Agent': UA,
                    'Connection': 'close',
                    'x-zse-93': '101_3_3.0',
                    'x-zse-96': sig,
                    'Cookie': f'd_c0="{visitor_dc0}"',
                }

                try:
                    res = session.get(f"https://www.zhihu.com{api_path}", headers=headers, timeout=15)

                    if res.status_code != 200:
                        if res.status_code in [401, 403]:
                            print(f"    [拦截] 遭遇风控 (HTTP {res.status_code})，换马甲后继续")
                            visitor_dc0 = generate_fake_dc0()
                        else:
                            print(f"    [Error] 搜索接口返回: {res.status_code}")
                        continue

                    try:
                        data = res.json()
                    except ValueError:
                        print(f"    [Error] 200 但非 JSON，响应前 200 字: {res.text[:200]}")
                        # 可能是验证页面，换马甲
                        visitor_dc0 = generate_fake_dc0()
                        continue

                    valid_targets = 0

                    for item in data.get('data', []):
                        # ── 军事化数据过滤 ──
                        obj = item.get('object', {})

                        # 过滤 1：只认真实问答帖子，丢弃专栏/视频
                        item_type = item.get('type', '')
                        obj_type = obj.get('type', '')

                        if item_type == 'search_result' and obj_type == 'answer':
                            # 从回答的 question 子对象获取信息
                            question_data = obj.get('question', {})
                            q_title = question_data.get('title', '') or question_data.get('name', '')
                            answer_count = question_data.get('answer_count', 0)
                            q_id = _extract_question_id(item)
                        elif obj_type == 'question':
                            # 直接是问题对象
                            q_title = obj.get('title', '') or obj.get('name', '')
                            answer_count = obj.get('answer_count', 0)
                            q_id = str(obj.get('id', ''))
                        else:
                            continue

                        if not q_id or q_id == '0':
                            continue

                        # 过滤 2：热度门槛
                        if answer_count < MIN_ANSWER_COUNT:
                            continue

                        # 过滤 3：相关性门槛（标题必须包含专业关键字的前2字）
                        short_major = major[:2]
                        if short_major not in q_title:
                            continue

                        # 鉴权通过，压入弹仓
                        now = int(time.time())
                        c.execute(
                            """INSERT OR IGNORE INTO question_tasks
                               (question_id, current_offset, state, source_type, created_at, updated_at)
                               VALUES (?, 0, 'READY', 'scout', ?, ?)""",
                            (q_id, now, now),
                        )
                        valid_targets += 1
                        total_captured += 1
                        print(f"    [锁定目标] QID:{q_id} | 回答数:{answer_count} | 标题: {q_title[:50]}")

                    conn.commit()
                    print(f"    -> 本轮扫荡结束，成功捕获 {valid_targets} 个高价值母题坐标。")

                except Exception as e:
                    print(f"    [网络异常] {e}")

                time.sleep(random.uniform(SEARCH_DELAY_MIN, SEARCH_DELAY_MAX))

    print(f"\n====== 所有专业侦察完毕，共捕获 {total_captured} 个高价值母题坐标 ======")


if __name__ == "__main__":
    run_scout()

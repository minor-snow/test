import requests
import sqlite3
import time
import random
import string
import urllib.parse
import os

# ==========================================
# 战前配置
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "bot_database.db")
RPC_SERVER = "http://127.0.0.1:3000/get_sign"

# 目标大类专业字典
TARGET_MAJORS = [
    "计算机科学与技术",
    "土木工程",
    "环境工程",
    "临床医学",
    "法学",
]

# 诱发"后悔指数"的强情绪关键词
# 每次搜索 = 专业名称 + 情绪关键词，例如 "土木工程 劝退"
EMOTION_KEYWORDS = ["劝退", "后悔", "坑", "转行", "就业惨"]

# 过滤阈值
MIN_ANSWER_COUNT = 50   # 回答数低于此值的题目，样本量太小，直接丢弃


def generate_fake_dc0():
    """动态伪造定长的访客身份"""
    rand_str = ''.join(random.choices(string.ascii_letters + string.digits, k=22))
    return f'{rand_str}visitor='


def get_search_signature(session, api_path, dc0):
    """请求 Node.js RPC 计算签名"""
    try:
        resp = session.post(RPC_SERVER, json={"url": api_path, "dc0": dc0}, timeout=5)
        if resp.status_code == 200:
            return resp.json().get("signature")
    except Exception as e:
        print(f"    [RPC Error] {e}")
    return None


def run_sniper():
    print("====== 重装狙击侦察兵已上线：执行定点清除与高价值目标锁定 ======")

    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()

        # trust_env=False 彻底绕过 Windows 系统/透明代理
        session = requests.Session()
        session.trust_env = False

        visitor_dc0 = generate_fake_dc0()
        print(f">>> 临时战术指纹: d_c0={visitor_dc0}")

        total_captured = 0

        for major in TARGET_MAJORS:
            for keyword in EMOTION_KEYWORDS:
                search_query = f"{major} {keyword}"
                print(f"\n>>> 正在执行战略搜索: [{search_query}] ...")

                # 知乎搜索 API（第一页）
                encoded_query = urllib.parse.quote(search_query)
                api_path = f"/api/v4/search_v3?t=general&q={encoded_query}&correction=1&offset=0&limit=20"

                sig = get_search_signature(session, api_path, visitor_dc0)
                if not sig:
                    print(f"    [Fatal] 签名节点失联，跳过 [{search_query}]")
                    continue

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
                    'Connection': 'close',
                    'x-zse-93': '101_3_3.0',
                    'x-zse-96': sig,
                    'Cookie': f'd_c0="{visitor_dc0}"',
                }

                try:
                    res = session.get(f"https://www.zhihu.com{api_path}", headers=headers, timeout=15)

                    if res.status_code == 200:
                        try:
                            data = res.json()
                        except ValueError:
                            print(f"    [Error] 200 但非 JSON，响应前 200 字: {res.text[:200]}")
                            continue

                        valid_targets = 0

                        for item in data.get('data', []):
                            # ==========================================
                            # [核心护城河：军事化数据过滤]
                            # ==========================================
                            obj = item.get('object', {})

                            # 过滤 1：只认真实的问答帖子，丢弃专栏文章(article)和视频(zvideo)
                            if item.get('type') != 'search_result' or obj.get('type') != 'answer':
                                continue

                            question_data = obj.get('question', {})
                            q_id = str(question_data.get('id', ''))
                            q_title = question_data.get('title', '') or question_data.get('name', '')
                            answer_count = question_data.get('answer_count', 0)

                            # 过滤 2：热度门槛！回答数 < MIN_ANSWER_COUNT 的直接扔掉
                            if answer_count < MIN_ANSWER_COUNT:
                                continue

                            # 过滤 3：相关性门槛！标题必须包含专业关键字（容错取前2字）
                            short_major = major[:2]  # "计算"、"土木"、"环境"、"临床"、"法学"
                            if short_major not in q_title:
                                continue

                            if not q_id:
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
                            print(f"    [锁定目标] QID:{q_id} | 回答数:{answer_count} | 标题: {q_title}")

                        conn.commit()
                        print(f"    -> 本轮扫荡结束，成功捕获 {valid_targets} 个高价值母题坐标。")

                    elif res.status_code in [401, 403]:
                        print(f"    [拦截] 遭遇风控 (HTTP {res.status_code})，换马甲后继续")
                        visitor_dc0 = generate_fake_dc0()

                    else:
                        print(f"    [Error] 搜索接口返回: {res.status_code}")

                except Exception as e:
                    print(f"    [网络异常] {e}")

                # 防封禁抖动
                time.sleep(random.uniform(2.0, 4.0))

    print(f"\n====== 所有专业侦察完毕，共捕获 {total_captured} 个高价值母题坐标 ======")


if __name__ == "__main__":
    run_sniper()

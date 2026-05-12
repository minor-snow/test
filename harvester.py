"""
知乎账号 Cookie 提取器 (SMS 验证码版)
格式: accounts.txt  每行  手机号  或  手机号----密码
运行: python harvester.py
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
try:
    from playwright_stealth import Stealth
except ImportError:
    print("[Error] 缺少 playwright-stealth，请先运行: pip install playwright-stealth")
    exit(1)

import sqlite3
import time
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE  = os.path.join(BASE_DIR, "bot_database.db")

# ── 登录页定位器 ─────────────────────────────────────────
# 知乎可能随版本变动选择器，集中在此方便维护
SEL_TAB_PASSWORD   = ".SignFlow-tabs .SignFlow-tab"   # 密码登录页签(第1个)
SEL_TAB_SMS        = ".SignFlow-tabs .SignFlow-tab"   # 短信登录页签(第0个)
SEL_INPUT_PHONE    = 'input[name="username"]'
SEL_INPUT_PASSWORD = 'input[name="password"]'
SEL_INPUT_SMS_CODE = 'input[placeholder*="验证码"]'
SEL_BTN_SEND_SMS   = ('button:has-text("发送验证码"), '
                      'button:has-text("获取验证码"), '
                      'button:has-text("获取短信验证码"), '
                      'button:has-text("发送"), '
                      'span:has-text("发送验证码")')
SEL_BTN_SUBMIT     = 'button.SignFlow-submitButton'
SEL_HOMEPAGE       = '.GlobalSideBar'                 # 首页侧边栏 = 登录成功
SMS_CODE_TIMEOUT   = 180                              # 等操作员输入验证码的最长秒数


# ─────────────────────────────────────────────────────────
def extract_cookies(page):
    """提取全量 Cookie，返回 (cookie_str, has_z_c0)"""
    cookies     = page.context.cookies()
    cookie_dict = {c["name"]: c["value"] for c in cookies}
    cookie_str  = "; ".join(f"{k}={v}" for k, v in cookie_dict.items())
    return cookie_str, "z_c0" in cookie_dict


def save_to_db(cookie_str):
    """将 Cookie 字符串写入 accounts 表"""
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute(
            "INSERT OR IGNORE INTO accounts (dc0, status, trust_score) VALUES (?, 'ACTIVE', 100)",
            (cookie_str,)
        )
        conn.commit()


def mark_success(line):
    """断点续传：写入 success.txt"""
    with open(os.path.join(BASE_DIR, "success.txt"), "a", encoding="utf-8") as f:
        f.write(line + "\n")


def read_accounts():
    """读取 accounts.txt，过滤已成功的条目"""
    src = os.path.join(BASE_DIR, "accounts.txt")
    if not os.path.exists(src):
        print("[Error] 找不到 accounts.txt")
        print("        格式：每行一条  手机号  或  手机号----密码")
        return []

    with open(src, "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]

    done = set()
    ok_file = os.path.join(BASE_DIR, "success.txt")
    if os.path.exists(ok_file):
        with open(ok_file, "r", encoding="utf-8") as f:
            done = {l.strip() for l in f if l.strip()}

    pending = [l for l in lines if l not in done]
    return pending


def _wait_for_sms_input(phone):
    """在终端等待操作员输入 6 位验证码，超时返回 None"""
    print(f"\n{'='*55}")
    print(f"  📱  请查收手机 {phone} 的短信验证码")
    print(f"  ⏳  {SMS_CODE_TIMEOUT} 秒内未输入将跳过此账号")
    print(f"{'='*55}")

    # Windows 下 sys.stdin.readline 会阻塞，用 input() 即可
    # 但要防止超时——在独立线程里跑 input() 并用 Event 通知
    import threading
    code_holder = [None]
    event = threading.Event()

    def _read():
        try:
            raw = input("  >> 输入验证码（直接回车=跳过）: ").strip()
            code_holder[0] = raw if raw else None
        except Exception:
            pass
        event.set()

    t = threading.Thread(target=_read, daemon=True)
    t.start()
    event.wait(timeout=SMS_CODE_TIMEOUT)

    return code_holder[0]


# ─────────────────────────────────────────────────────────
def login_with_sms(page, phone, index, total, password=None):
    """
    主登录流程（短信验证码模式）
    返回 True = 登录成功，False = 失败/跳过
    """
    print(f"\n[{index}/{total}] 账号: {phone}")

    # ① 打开登录页
    page.goto("https://www.zhihu.com/signin", timeout=60000)
    time.sleep(1)

    # ② 无密码时强制走短信 Tab；有密码时作为备用路径

    # ③ 优先尝试短信登录 Tab
    sms_tab_clicked = False
    try:
        sms_tab = page.locator(
            'div.SignFlow-tab:has-text("验证码登录"), '
            'div.SignFlow-tab:has-text("短信登录")'
        )
        if sms_tab.count() > 0:
            sms_tab.first.click()
            time.sleep(0.8)
            sms_tab_clicked = True
            print("    ↳ 切换到短信验证码登录 Tab")
    except Exception:
        pass

    # 无密码时如果没找到短信 Tab，继续尝试直接找「发送验证码」按钮
    if not password and not sms_tab_clicked:
        print("    ↳ 无密码模式：等待发送验证码按钮出现...")
        try:
            page.wait_for_selector(SEL_BTN_SEND_SMS, timeout=8000)
            sms_tab_clicked = True  # 直接有发送按钮，视为 SMS 模式
        except PWTimeout:
            print("    [Warn] 未找到发送验证码按钮，页面可能需要人工操作")
            try:
                page.wait_for_selector(SEL_HOMEPAGE, timeout=SMS_CODE_TIMEOUT * 1000)
                print("    ↳ 人工完成登录成功")
                return True
            except PWTimeout:
                print("    [Timeout] 超时，跳过")
                return False

    # ④ 填手机号
    try:
        page.fill(SEL_INPUT_PHONE, phone)
    except Exception as e:
        print(f"    [Error] 填手机号失败: {e}")
        return False

    if sms_tab_clicked:
        # ── 短信登录模式：填手机号后点「发送验证码」──
        time.sleep(1)  # 等按钮从灰色激活
        try:
            # 广谱选择器：覆盖知乎各版本按钮文字
            send_btn = page.locator(SEL_BTN_SEND_SMS)
            send_btn.first.click(timeout=10000)
            print("    ↳ 已点击「发送验证码」")
        except Exception as e:
            # 备用：截图调试 + 尝试 Tab 键触发
            print(f"    [Warn] 标准按钮未找到 ({e})")
            print("    ↳ 备用方案：请在弹出的浏览器窗口中手动点击发送验证码")
            try:
                # 给用户 15s 手动点发送
                page.wait_for_selector(SEL_INPUT_SMS_CODE, timeout=15000)
                print("    ↳ 检测到验证码输入框，继续...")
            except PWTimeout:
                if not password:
                    print("    [Error] 无密码且无法发送验证码，跳过")
                    return False
                print("    [Warn] 降级到密码模式")
                sms_tab_clicked = False

    if not sms_tab_clicked and password:
        # ── 密码登录模式（触发短信二次验证）──
        try:
            page.fill(SEL_INPUT_PASSWORD, password)
            page.click(SEL_BTN_SUBMIT)
            print("    ↳ 已填账密并提交")
        except Exception as e:
            print(f"    [Error] 填密码失败: {e}")
            return False

        # 等待页面跳转到短信验证阶段
        # 情况 1: 直接登录成功（无二次验证）
        try:
            page.wait_for_selector(SEL_HOMEPAGE, timeout=5000)
            print("    ↳ 直接登录成功（无短信验证）")
            return True
        except PWTimeout:
            pass

        # 情况 2: 弹出短信验证框 / "发送验证码"按钮出现
        try:
            page.wait_for_selector(SEL_BTN_SEND_SMS, timeout=10000)
            page.locator(SEL_BTN_SEND_SMS).first.click()
            print("    ↳ 检测到短信验证步骤，已点击发送")
        except PWTimeout:
            # 情况 3: 可能是图形验证码 / 滑块，需人工介入
            print("    ⚠️  未出现发送验证码按钮，可能需要人工处理滑块验证")
            print("    ⏳  等待您在浏览器中手动完成验证后，脚本将继续...")
            try:
                page.wait_for_selector(SEL_HOMEPAGE, timeout=SMS_CODE_TIMEOUT * 1000)
                print("    ↳ 人工完成登录成功")
                return True
            except PWTimeout:
                print("    [Timeout] 人工操作超时，跳过")
                return False

    # ⑤ 等待并读取验证码（终端输入）
    sms_code = _wait_for_sms_input(phone)
    if not sms_code:
        print("    [Skip] 未输入验证码，跳过此账号")
        return False

    # ⑥ 填入验证码并提交
    try:
        page.fill(SEL_INPUT_SMS_CODE, sms_code)
        time.sleep(0.3)
        page.click(SEL_BTN_SUBMIT)
        print(f"    ↳ 已填入验证码 {sms_code[:2]}**** 并提交")
    except Exception as e:
        print(f"    [Error] 填验证码失败: {e}")
        return False

    # ⑦ 等待登录成功（首页出现）
    try:
        page.wait_for_selector(SEL_HOMEPAGE, timeout=20000)
        print("    ↳ 首页出现，登录成功 ✓")
        return True
    except PWTimeout:
        # 可能还有一个二次验证（极少见）
        print("    [Warn] 提交验证码后首页仍未出现，等待人工处理...")
        try:
            page.wait_for_selector(SEL_HOMEPAGE, timeout=60000)
            return True
        except PWTimeout:
            print("    [Timeout] 最终超时，跳过")
            return False


# ─────────────────────────────────────────────────────────
def run_harvester():
    lines = read_accounts()
    if not lines:
        print("====== 没有需要处理的账号 ======")
        return

    total = len(lines)
    print(f"\n====== Cookie 提取车间启动 · 共 {total} 个账号待处理 ======")
    print("  账号格式: 手机号  或  手机号----密码")
    print("  短信发出后请在终端输入验证码\n")

    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
            ]
        )

        ok_count   = 0
        fail_count = 0

        for idx, line in enumerate(lines, start=1):
            parts    = line.split("----")
            phone    = parts[0].strip()
            password = parts[1].strip() if len(parts) >= 2 else None

            if not phone:
                print(f"[跳过] 格式错误（手机号为空）: {line}")
                fail_count += 1
                continue

            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
            )
            page = context.new_page()

            try:
                success = login_with_sms(page, phone, idx, total, password=password)

                if success:
                    time.sleep(2)  # 等 Cookie 完全落地
                    cookie_str, has_zc0 = extract_cookies(page)

                    if has_zc0:
                        save_to_db(cookie_str)
                        mark_success(line)
                        ok_count += 1
                        print(f"    [✓ 入库] z_c0 已提取，账号 {phone} 入库成功")
                    else:
                        fail_count += 1
                        print(f"    [✗ 无效] 登录成功但缺少 z_c0，账号 {phone} 跳过")
                else:
                    fail_count += 1

            except Exception as e:
                print(f"    [Exception] 账号 {phone} 处理异常: {e}")
                fail_count += 1
            finally:
                context.close()
                time.sleep(2)  # 换号间隔，防 IP 激增

        browser.close()

    print(f"\n{'='*55}")
    print(f"  提取车间收工")
    print(f"  ✓ 成功入库: {ok_count} 个")
    print(f"  ✗ 失败/跳过: {fail_count} 个")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    run_harvester()

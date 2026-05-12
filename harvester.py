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
    logger.error("[Error] 缺少 playwright-stealth，请先运行: pip install playwright-stealth")
    exit(1)

import sqlite3
import time
import os
import threading

# ── 尝试加载配置 ─────────────────────────────────────────
from config_loader import conf
from logger_setup import logger

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_FILE = os.path.join(BASE_DIR, conf("paths.database", "bot_database.db"))
SMS_CODE_TIMEOUT = conf("harvester.sms_code_timeout", 180)
SIGNIN_URL = conf("harvester.signin_url", "https://www.zhihu.com/signin")
HEADLESS = conf("harvester.headless", False)
COOKIE_LANDING_DELAY = conf("harvester.cookie_landing_delay_sec", 2)
SWITCH_DELAY = conf("harvester.account_switch_delay_sec", 2)
UA = conf("browser.user_agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36")
VP_WIDTH = conf("browser.viewport_width", 1280)
VP_HEIGHT = conf("browser.viewport_height", 800)
EXTRA_ARGS = conf("browser.extra_args",
    ["--disable-blink-features=AutomationControlled", "--disable-infobars"])

# ── 登录页定位器 ─────────────────────────────────────────
SEL_TAB_PASSWORD   = ".SignFlow-tabs .SignFlow-tab"
SEL_TAB_SMS        = ".SignFlow-tabs .SignFlow-tab"
SEL_INPUT_PHONE    = 'input[name="username"]'
SEL_INPUT_PASSWORD = 'input[name="password"]'
SEL_INPUT_SMS_CODE = 'input[placeholder*="验证码"]'
SEL_BTN_SEND_SMS   = ('button:has-text("发送验证码"), '
                      'button:has-text("获取验证码"), '
                      'button:has-text("获取短信验证码"), '
                      'button:has-text("发送"), '
                      'span:has-text("发送验证码")')
SEL_BTN_SUBMIT     = 'button.SignFlow-submitButton'
SEL_HOMEPAGE       = '.GlobalSideBar'


# ─────────────────────────────────────────────────────────
def _ensure_schema():
    """确保 accounts 表有 z_c0, d_c0 等必要列"""
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute("PRAGMA journal_mode=WAL")
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
        # 列迁移：兼容旧表
        c.execute("PRAGMA table_info(accounts)")
        cols = [col[1] for col in c.fetchall()]
        # 旧表可能用 dc0 做主键但存的是完整 cookie 字符串
        # 检查是否有 z_c0 列
        if "z_c0" not in cols:
            try:
                c.execute("ALTER TABLE accounts ADD COLUMN z_c0 TEXT")
                logger.info("[Schema] 已添加 accounts.z_c0 列")
            except sqlite3.OperationalError:
                pass
        # 检查是否有 d_c0 列 (旧表叫 dc0)
        if "d_c0" not in cols and "dc0" in cols:
            try:
                c.execute("ALTER TABLE accounts RENAME COLUMN dc0 TO d_c0")
                logger.info("[Schema] 已重命名 dc0 → d_c0")
            except sqlite3.OperationalError:
                pass
        conn.commit()


def extract_cookies(page):
    """提取 Cookie，返回 (d_c0, z_c0, cookie_str, has_zc0)"""
    cookies = page.context.cookies()
    cookie_dict = {c["name"]: c["value"] for c in cookies}
    cookie_str = "; ".join(f"{k}={v}" for k, v in cookie_dict.items())
    d_c0 = cookie_dict.get("d_c0", "")
    z_c0 = cookie_dict.get("z_c0", "")
    return d_c0, z_c0, cookie_str, "z_c0" in cookie_dict


def save_to_db(d_c0, z_c0):
    """将 d_c0 + z_c0 写入 accounts 表"""
    if not d_c0:
        logger.error("    [Error] d_c0 为空，无法入库")
        return False
    with sqlite3.connect(DB_FILE) as conn:
        c = conn.cursor()
        c.execute(
            """INSERT OR REPLACE INTO accounts (d_c0, z_c0, status, trust_score)
               VALUES (?, ?, 'ACTIVE', 100)""",
            (d_c0, z_c0)
        )
        conn.commit()
    return True


def mark_success(line):
    """断点续传：写入 success.txt"""
    with open(os.path.join(BASE_DIR, "success.txt"), "a", encoding="utf-8") as f:
        f.write(line + "\n")


def read_accounts():
    """读取 accounts.txt，过滤已成功的条目"""
    src = os.path.join(BASE_DIR, "accounts.txt")
    if not os.path.exists(src):
        logger.error("[Error] 找不到 accounts.txt")
        logger.info("        格式：每行一条  手机号  或  手机号----密码")
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
    logger.info(f"\n{'='*55}")
    print(f"  📱  请查收手机 {phone} 的短信验证码")
    print(f"  ⏳  {SMS_CODE_TIMEOUT} 秒内未输入将跳过此账号")
    logger.info(f"{'='*55}")

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


def login_with_sms(page, phone, index, total, password=None):
    """主登录流程（短信验证码模式），返回 True = 登录成功"""
    logger.info(f"\n[{index}/{total}] 账号: {phone}")

    page.goto(SIGNIN_URL, timeout=60000)
    time.sleep(1)

    # 优先尝试短信登录 Tab
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
            logger.info("    ↳ 切换到短信验证码登录 Tab")
    except Exception:
        pass

    if not password and not sms_tab_clicked:
        logger.info("    ↳ 无密码模式：等待发送验证码按钮出现...")
        try:
            page.wait_for_selector(SEL_BTN_SEND_SMS, timeout=8000)
            sms_tab_clicked = True
        except PWTimeout:
            logger.warning("    [Warn] 未找到发送验证码按钮，等待人工操作...")
            try:
                page.wait_for_selector(SEL_HOMEPAGE, timeout=SMS_CODE_TIMEOUT * 1000)
                logger.info("    ↳ 人工完成登录成功")
                return True
            except PWTimeout:
                logger.warning("    [Timeout] 超时，跳过")
                return False

    # 填手机号
    try:
        page.fill(SEL_INPUT_PHONE, phone)
    except Exception as e:
        logger.error(f"    [Error] 填手机号失败: {e}")
        return False

    if sms_tab_clicked:
        time.sleep(1)
        try:
            send_btn = page.locator(SEL_BTN_SEND_SMS)
            send_btn.first.click(timeout=10000)
            logger.info("    ↳ 已点击「发送验证码」")
        except Exception:
            logger.warning("    [Warn] 标准按钮未找到，请手动点击发送验证码")
            try:
                page.wait_for_selector(SEL_INPUT_SMS_CODE, timeout=15000)
                logger.info("    ↳ 检测到验证码输入框，继续...")
            except PWTimeout:
                if not password:
                    logger.error("    [Error] 无密码且无法发送验证码，跳过")
                    return False
                logger.warning("    [Warn] 降级到密码模式")
                sms_tab_clicked = False

    if not sms_tab_clicked and password:
        try:
            page.fill(SEL_INPUT_PASSWORD, password)
            page.click(SEL_BTN_SUBMIT)
            logger.info("    ↳ 已填账密并提交")
        except Exception as e:
            logger.error(f"    [Error] 填密码失败: {e}")
            return False

        try:
            page.wait_for_selector(SEL_HOMEPAGE, timeout=5000)
            logger.info("    ↳ 直接登录成功（无短信验证）")
            return True
        except PWTimeout:
            pass

        try:
            page.wait_for_selector(SEL_BTN_SEND_SMS, timeout=10000)
            page.locator(SEL_BTN_SEND_SMS).first.click()
            logger.info("    ↳ 检测到短信验证步骤，已点击发送")
        except PWTimeout:
            logger.info("    ⚠️  等待人工完成滑块验证...")
            try:
                page.wait_for_selector(SEL_HOMEPAGE, timeout=SMS_CODE_TIMEOUT * 1000)
                logger.info("    ↳ 人工完成登录成功")
                return True
            except PWTimeout:
                logger.warning("    [Timeout] 人工操作超时，跳过")
                return False

    # 等待并读取验证码
    sms_code = _wait_for_sms_input(phone)
    if not sms_code:
        logger.warning("    [Skip] 未输入验证码，跳过此账号")
        return False

    # 填入验证码并提交
    try:
        page.fill(SEL_INPUT_SMS_CODE, sms_code)
        time.sleep(0.3)
        page.click(SEL_BTN_SUBMIT)
        logger.info(f"    ↳ 已填入验证码 {sms_code[:2]}**** 并提交")
    except Exception as e:
        logger.error(f"    [Error] 填验证码失败: {e}")
        return False

    # 等待登录成功
    try:
        page.wait_for_selector(SEL_HOMEPAGE, timeout=20000)
        logger.info("    ↳ 首页出现，登录成功 ✓")
        return True
    except PWTimeout:
        logger.warning("    [Warn] 提交验证码后首页仍未出现，等待人工处理...")
        try:
            page.wait_for_selector(SEL_HOMEPAGE, timeout=60000)
            return True
        except PWTimeout:
            logger.warning("    [Timeout] 最终超时，跳过")
            return False


def run_harvester():
    _ensure_schema()

    lines = read_accounts()
    if not lines:
        print("====== 没有需要处理的账号 ======")
        return

    total = len(lines)
    print(f"\n====== Cookie 提取车间启动 · 共 {total} 个账号待处理 ======")
    logger.info("  账号格式: 手机号  或  手机号----密码")
    logger.info("  短信发出后请在终端输入验证码\n")

    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(headless=HEADLESS, args=EXTRA_ARGS)

        ok_count = 0
        fail_count = 0

        for idx, line in enumerate(lines, start=1):
            parts = line.split("----")
            phone = parts[0].strip()
            password = parts[1].strip() if len(parts) >= 2 else None

            if not phone:
                logger.warning(f"[跳过] 格式错误（手机号为空）: {line}")
                fail_count += 1
                continue

            context = browser.new_context(
                user_agent=UA,
                viewport={"width": VP_WIDTH, "height": VP_HEIGHT},
            )
            page = context.new_page()

            try:
                success = login_with_sms(page, phone, idx, total, password=password)

                if success:
                    time.sleep(COOKIE_LANDING_DELAY)
                    d_c0, z_c0, cookie_str, has_zc0 = extract_cookies(page)

                    if has_zc0:
                        if save_to_db(d_c0, z_c0):
                            mark_success(line)
                            ok_count += 1
                            masked = d_c0[:6] + "****" + d_c0[-4:] if len(d_c0) > 10 else d_c0
                            logger.info(f"    [✓ 入库] d_c0={masked} z_c0={'有' if z_c0 else '无'}")
                        else:
                            fail_count += 1
                            logger.info(f"    [✗ 无效] d_c0 为空")
                    else:
                        fail_count += 1
                        logger.warning(f"    [✗ 无效] 登录成功但缺少 z_c0，账号 {phone} 跳过")
                else:
                    fail_count += 1

            except Exception as e:
                logger.error(f"    [Exception] 账号 {phone} 处理异常: {e}")
                fail_count += 1
            finally:
                context.close()
                time.sleep(SWITCH_DELAY)

        browser.close()

    logger.info(f"\n{'='*55}")
    print(f"  提取车间收工")
    print(f"  ✓ 成功入库: {ok_count} 个")
    print(f"  ✗ 失败/跳过: {fail_count} 个")
    logger.info(f"{'='*55}\n")


if __name__ == "__main__":
    run_harvester()

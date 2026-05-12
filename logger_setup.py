"""
结构化日志配置 — 基于 loguru
用法: from logger_setup import logger
"""
import sys
import os
from loguru import logger

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 移除默认 handler
logger.remove()

# 终端输出：彩色格式
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# 文件输出：结构化 JSON 格式（方便后续分析）
logger.add(
    os.path.join(BASE_DIR, "logs", "spider_{time:YYYY-MM-DD}.log"),
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
    level="DEBUG",
    rotation="10 MB",
    retention="7 days",
    encoding="utf-8",
    enqueue=True,  # 多进程安全
)

# 错误/致命单独文件
logger.add(
    os.path.join(BASE_DIR, "logs", "errors_{time:YYYY-MM-DD}.log"),
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level} | {name}:{function}:{line} | {message}",
    level="ERROR",
    rotation="5 MB",
    retention="30 days",
    encoding="utf-8",
    enqueue=True,
)

# 确保 logs 目录存在
os.makedirs(os.path.join(BASE_DIR, "logs"), exist_ok=True)

logger.info("日志系统初始化完成")

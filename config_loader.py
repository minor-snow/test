"""
配置加载器 — 从 config.yaml 读取所有配置
用法: from config_loader import config
"""
import os
import sys
import yaml

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.yaml")


def _deep_merge(base: dict, override: dict) -> dict:
    """递归合并 override 到 base"""
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def load_config() -> dict:
    if not os.path.exists(CONFIG_FILE):
        print(f"[Config] 找不到 {CONFIG_FILE}，使用默认配置")
        return {}

    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    # 加载本地覆盖 (config.local.yaml 不提交到 git)
    local_file = os.path.join(BASE_DIR, "config.local.yaml")
    if os.path.exists(local_file):
        with open(local_file, "r", encoding="utf-8") as f:
            local = yaml.safe_load(f) or {}
        _deep_merge(cfg, local)
        print("[Config] 已加载本地覆盖配置 (config.local.yaml)")

    return cfg


config = load_config()

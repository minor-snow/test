"""
核心逻辑单元测试 — 覆盖状态机、退避计算、错误分类、HTML 清洗
运行: pytest tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from unittest.mock import MagicMock, patch


# ── 退避计算测试 ──────────────────────────────────────────

class TestBackoffCalculation:
    """测试 _get_backoff_seconds 函数"""

    def setup_method(self):
        from spider import _get_backoff_seconds, BACKOFF_SECONDS
        self.get_backoff = _get_backoff_seconds
        self.backoff_config = BACKOFF_SECONDS

    def test_fixed_backoff_transient_network(self):
        """TRANSIENT_NETWORK 应返回固定退避秒数"""
        from spider import E_TRANSIENT_NETWORK
        result = self.get_backoff(E_TRANSIENT_NETWORK, 0)
        assert result == 60

    def test_fixed_backoff_http_403(self):
        """HTTP_403_429 应返回固定退避秒数"""
        from spider import E_HTTP_403_429
        result = self.get_backoff(E_HTTP_403_429, 0)
        assert result == 120

    def test_progressive_backoff_false_empty(self):
        """FALSE_EMPTY 应按重试次数递增退避"""
        from spider import E_FALSE_EMPTY
        assert self.get_backoff(E_FALSE_EMPTY, 0) == 600
        assert self.get_backoff(E_FALSE_EMPTY, 1) == 3600
        # 第 3 次返回 None（转 GAP）
        assert self.get_backoff(E_FALSE_EMPTY, 2) is None

    def test_progressive_backoff_signer_error(self):
        """SIGNER_ERROR 应按重试次数递增退避"""
        from spider import E_SIGNER_ERROR
        assert self.get_backoff(E_SIGNER_ERROR, 0) == 120
        assert self.get_backoff(E_SIGNER_ERROR, 1) == 300
        assert self.get_backoff(E_SIGNER_ERROR, 2) is None

    def test_unknown_error_class_returns_default(self):
        """未知错误类型应返回默认 60s"""
        result = self.get_backoff("UNKNOWN_ERROR", 0)
        assert result == 60

    def test_retry_count_clamped_to_list_length(self):
        """重试次数超过列表长度时，应使用最后一个值"""
        from spider import E_FALSE_EMPTY
        # FALSE_EMPTY 列表长度为 3，retry_count=99 应返回最后一个 (None)
        assert self.get_backoff(E_FALSE_EMPTY, 99) is None


# ── 错误分类测试 ──────────────────────────────────────────

class TestErrorClassification:
    """测试 _classify_error 函数"""

    def setup_method(self):
        from spider import _classify_error
        self.classify = _classify_error

    def test_none_response_is_transient(self):
        """None 响应应分类为 TRANSIENT_NETWORK"""
        from spider import E_TRANSIENT_NETWORK
        assert self.classify(None) == E_TRANSIENT_NETWORK

    def test_401_is_http_401(self):
        """HTTP 401 应分类为 HTTP_401"""
        from spider import E_HTTP_401
        resp = MagicMock()
        resp.status_code = 401
        assert self.classify(resp) == E_HTTP_401

    def test_404_is_permanent(self):
        """HTTP 404 应分类为 PERMANENT_404"""
        from spider import E_PERMANENT_404
        resp = MagicMock()
        resp.status_code = 404
        resp.text = "Not Found"
        resp.headers = {}
        assert self.classify(resp) == E_PERMANENT_404

    def test_403_is_http_403_429(self):
        """HTTP 403 应分类为 HTTP_403_429"""
        from spider import E_HTTP_403_429
        resp = MagicMock()
        resp.status_code = 403
        resp.text = "Forbidden"
        resp.headers = {}
        assert self.classify(resp) == E_HTTP_403_429

    def test_200_with_captcha_html(self):
        """200 但包含验证码页面应分类为 CAPTCHA_HTML"""
        from spider import E_CAPTCHA_HTML
        resp = MagicMock()
        resp.status_code = 200
        resp.text = "<html><body>请完成安全验证 unhuman captcha</body></html>"
        resp.headers = {"Content-Type": "text/html"}
        assert self.classify(resp, data=None) == E_CAPTCHA_HTML

    def test_200_with_valid_data(self):
        """200 + 有效 data 不应报错（不会调用 classify）"""
        # _classify_error 只在异常情况下被调用
        pass

    def test_200_missing_data_field(self):
        """200 但 JSON 缺少 data 字段应分类为 FORMAT_ERROR"""
        from spider import E_FORMAT_ERROR
        resp = MagicMock()
        resp.status_code = 200
        resp.text = '{"paging": {}}'
        resp.headers = {"Content-Type": "application/json"}
        data = {"paging": {}}
        assert self.classify(resp, data=data) == E_FORMAT_ERROR


# ── 挑战页检测测试 ────────────────────────────────────────

class TestChallengePageDetection:
    """测试 _is_zhihu_challenge_page 函数"""

    def setup_method(self):
        from spider import _is_zhihu_challenge_page
        self.is_challenge = _is_zhihu_challenge_page

    def test_normal_json_response(self):
        """正常 JSON 响应不应被判定为挑战页"""
        resp = MagicMock()
        resp.status_code = 200
        resp.text = '{"data": [{"id": 123}], "paging": {"is_end": false}}'
        resp.headers = {"Content-Type": "application/json"}
        assert self.is_challenge(resp) is False

    def test_captcha_html_page(self):
        """包含验证码关键词的 HTML 应被判定为挑战页"""
        resp = MagicMock()
        resp.status_code = 200
        resp.text = "<html><title>知乎安全中心</title><body>请完成人机验证</body></html>"
        resp.headers = {"Content-Type": "text/html"}
        assert self.is_challenge(resp) is True

    def test_json_error_403(self):
        """JSON 格式的 403 错误响应应被判定为挑战页"""
        resp = MagicMock()
        resp.status_code = 200
        resp.text = '{"error": {"code": 403, "message": "频率限制"}}'
        resp.headers = {"Content-Type": "application/json"}
        assert self.is_challenge(resp) is True

    def test_empty_response(self):
        """空响应不应被判定为挑战页"""
        resp = MagicMock()
        resp.status_code = 200
        resp.text = ""
        resp.headers = {}
        assert self.is_challenge(resp) is False


# ── HTML 清洗测试 ─────────────────────────────────────────

class TestCleanHtml:
    """测试 clean_html 函数"""

    def setup_method(self):
        from spider import clean_html
        self.clean = clean_html

    def test_empty_input(self):
        assert self.clean("") == ""
        assert self.clean(None) == ""

    def test_basic_html_stripping(self):
        result = self.clean("<p>Hello <b>World</b></p>")
        assert "Hello" in result
        assert "World" in result
        assert "<" not in result

    def test_br_to_newline(self):
        result = self.clean("Line1<br>Line2<br/>Line3")
        assert "Line1" in result
        assert "Line2" in result

    def test_html_entities(self):
        result = self.clean("&amp; &lt; &gt; &quot;")
        assert "&" in result
        assert "<" in result

    def test_multiple_newlines_collapsed(self):
        result = self.clean("<p>A</p><p></p><p>B</p>")
        # Should not have excessive blank lines
        assert "\n\n\n" not in result


# ── 配置加载测试 ──────────────────────────────────────────

class TestConfigLoader:
    """测试 config_loader.conf() 函数"""

    def test_conf_returns_default_for_missing_key(self):
        from config_loader import conf
        result = conf("nonexistent.deeply.nested.key", "fallback")
        assert result == "fallback"

    def test_conf_returns_actual_value(self):
        from config_loader import conf
        # spider.concurrency is defined in config.yaml as 2
        result = conf("spider.concurrency", 99)
        assert result == 2

    def test_conf_returns_default_for_none_value(self):
        from config_loader import conf
        # tunnel_proxy_url is null in config.yaml
        result = conf("spider.tunnel_proxy_url", "default_proxy")
        # null in yaml → None → should return default
        assert result == "default_proxy"

    def test_conf_nested_dict(self):
        from config_loader import conf
        result = conf("spider.backoff", {})
        assert isinstance(result, dict)
        assert "TRANSIENT_NETWORK" in result


# ── 签名缓存测试 ─────────────────────────────────────────

class TestSignatureCache:
    """测试签名缓存逻辑"""

    def test_cache_hit(self):
        """缓存命中时不应发起 RPC 请求"""
        import spider
        import time

        # 手动注入缓存
        cache_key = ("/api/test", "test_dc0")
        spider._SIG_CACHE[cache_key] = ("cached_sig", time.time() + 999)

        session = MagicMock()
        result = spider._get_signature_cached(session, "/api/test", "test_dc0")

        assert result == "cached_sig"
        session.post.assert_not_called()

        # 清理
        del spider._SIG_CACHE[cache_key]

    def test_cache_expired(self):
        """缓存过期时应发起 RPC 请求"""
        import spider
        import time

        cache_key = ("/api/expired", "test_dc0")
        spider._SIG_CACHE[cache_key] = ("old_sig", time.time() - 10)

        session = MagicMock()
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"signature": "new_sig"}
        session.post.return_value = mock_resp

        result = spider._get_signature_cached(session, "/api/expired", "test_dc0")

        assert result == "new_sig"
        session.post.assert_called()

        # 清理
        if cache_key in spider._SIG_CACHE:
            del spider._SIG_CACHE[cache_key]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

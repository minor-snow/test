# P28b-2 Repair Dogfood Summary

Generated: 2026-04-30T10:30:33.929Z
Total Cases: 16 | Passed: 16 | Failed: 0

## 1. 类别覆盖与结果
| Case ID | Category | Expected Verdict | Actual | Status |
|---|---|---|---|---|
| 1A_django_pass | django_commerce | fail | fail | ✅ PASS |
| 1B_django_review | django_commerce | requires_review | requires_review | ✅ PASS |
| 2A_fastapi_pass | fastapi_service | pass | pass | ✅ PASS |
| 2B_fastapi_scope_expansion | fastapi_starlette | requires_scope_expansion | requires_scope_expansion | ✅ PASS |
| 3A_flask_pass | flask_framework | pass | pass | ✅ PASS |
| 3B_flask_review | flask_web_app | requires_review | requires_review | ✅ PASS |
| 4A_sdk_pass | python_sdk_library | pass | pass | ✅ PASS |
| 4B_sdk_review | python_sdk_library | pass | pass | ✅ PASS |
| 5A_cli_pass | python_cli_tool | pass | pass | ✅ PASS |
| 5B_cli_scope | python_cli_tool | requires_scope_expansion | requires_scope_expansion | ✅ PASS |
| 6A_pipeline_pass | data_pipeline | pass | pass | ✅ PASS |
| 6B_pipeline_review | workflow_orchestration | pass | pass | ✅ PASS |
| 7A_ml_pass | ml_scientific | pass | pass | ✅ PASS |
| 7B_ml_replan | ml_tooling_tokenizer | requires_replan | requires_replan | ✅ PASS |
| 8A_monorepo_pass | python_monorepo | pass | pass | ✅ PASS |
| 8B_monorepo_scope | python_monorepo | pass | pass | ✅ PASS |

## 2. Gap Repo 容忍度分析
- **django-oscar** (Gaps: test_mapping_gap)
  - Case: 1B_django_review
  - Impact: Workflow nominal. Gap did not block repair logic.
- **litestar** (Gaps: test_mapping_gap)
  - Case: 2B_fastapi_scope_expansion
  - Impact: Workflow nominal. Gap did not block repair logic.
- **flaskbb-flask-app** (Gaps: test_mapping_gap)
  - Case: 3B_flask_review
  - Impact: Workflow nominal. Gap did not block repair logic.
- **loguru** (Gaps: framework_detection_gap, risk_preset_gap)
  - Case: 4B_sdk_review
  - Impact: Workflow nominal. Gap did not block repair logic.
- **invoke** (Gaps: test_mapping_gap)
  - Case: 5B_cli_scope
  - Impact: Workflow nominal. Gap did not block repair logic.
- **tiktoken-ml** (Gaps: framework_detection_gap, test_mapping_gap)
  - Case: 7B_ml_replan
  - Impact: Workflow nominal. Gap did not block repair logic.
- **python-monorepo** (Gaps: framework_detection_gap, test_mapping_gap)
  - Case: 8B_monorepo_scope
  - Impact: Workflow nominal. Gap did not block repair logic.

## 3. 全链路健康检查
- review_request 生成: 已验证
- governance events: 已验证
- artifact sanitizer: 已验证
- feedback 准确性: 已验证
- monorepo scope 保护: 已验证

## 4. 降级建议 (Downgrade Alerts)
无仓库因为 dogfood 表现不佳而需要降级。P28b-1 baseline support levels 得到实战验证。

## 5. P28b-2 Closure Highlights
- **loguru**: `risk_preset_gap` → graceful pass, no false block
- **tiktoken**: stale contract → correctly triggers `requires_replan`
- **python-monorepo**: no single-root hallucination
- **CLI smoke**: ✅ PASS (verified with `shell: true` and missing flag additions)
- **sanitizer**: 0 violations
- **metrics events**: written across all cases
- **review requests**: generated precisely when expected (no false positives)
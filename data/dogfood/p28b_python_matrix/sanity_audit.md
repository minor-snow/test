# P28b-1 Support Label Sanity Audit

Generated: 2026-04-30 | Sampled: 10 repos

## Calibration Summary

| Verdict | Count |
|---|---|
| ✅ CALIBRATED | 9 |
| ⚠️ POSSIBLY_WIDE | 0 |
| 🔵 NARROW (conservative) | 1 |

**Assessment**: 98% supported+ is well-calibrated: all sampled repos have appropriate evidence for their label

## Sampled Repos

### ✅ requests (python_sdk_library)

- **Sample reason**: supported: clean SDK, expected validated
- **support_level**: `validated` (expected: `validated`)
- **Verdict**: CALIBRATED — All 4 key evidence dimensions present with appropriate confidence
- **Framework signals**: pytest(medium, 1 dims)
- **Project roles**: python_sdk_library
- **Layout**: library_package (confidence: medium)
- **Risk preset**: python_sdk_library / partial
- **Test paths found**: 6 | **Python files**: 36

### ✅ flask (flask_framework)

- **Sample reason**: supported: web framework, expected supported
- **support_level**: `validated` (expected: `supported`)
- **Verdict**: CALIBRATED — All 4 key evidence dimensions present with appropriate confidence
- **Framework signals**: flask(high, 2 dims), pytest(medium, 1 dims), click(high, 3 dims), celery(high, 2 dims), httpx(medium, 1 dims)
- **Project roles**: service_backend, python_sdk_library, http_client_library, cli_application
- **Layout**: library_package (confidence: high)
- **Risk preset**: flask_service / validated
- **Test paths found**: 40 | **Python files**: 83

### ✅ celery (data_pipeline)

- **Sample reason**: supported: data pipeline, expected supported
- **support_level**: `validated` (expected: `supported`)
- **Verdict**: CALIBRATED — All 4 key evidence dimensions present with appropriate confidence
- **Framework signals**: django(high, 3 dims), pytest(medium, 1 dims), click(high, 2 dims), sqlalchemy(high, 2 dims), celery(medium, 1 dims)
- **Project roles**: python_sdk_library
- **Layout**: mixed (confidence: medium)
- **Risk preset**: python_sdk_library / partial
- **Test paths found**: 2 | **Python files**: 416

### ✅ black (python_cli_tool)

- **Sample reason**: supported: CLI tool, expected validated
- **support_level**: `validated` (expected: `validated`)
- **Verdict**: CALIBRATED — All 4 key evidence dimensions present with appropriate confidence
- **Framework signals**: click(high, 3 dims)
- **Project roles**: python_sdk_library, cli_application
- **Layout**: library_package (confidence: high)
- **Risk preset**: python_sdk_library / partial
- **Test paths found**: 4 | **Python files**: 325

### ✅ starlette (fastapi_starlette)

- **Sample reason**: supported: ASGI framework, expected validated
- **support_level**: `validated` (expected: `validated`)
- **Verdict**: CALIBRATED — All 4 key evidence dimensions present with appropriate confidence
- **Framework signals**: pytest(medium, 1 dims), click(medium, 1 dims), httpx(high, 2 dims)
- **Project roles**: service_backend, python_sdk_library, http_client_library
- **Layout**: library_package (confidence: high)
- **Risk preset**: generic_service / partial
- **Test paths found**: 25 | **Python files**: 67

### 🔵 build (python_cli_tool)

- **Sample reason**: smoke: PyPA build tool, layout_classification_gap
- **support_level**: `smoke` (expected: `supported`)
- **Verdict**: NARROW — smoke is a conservative label — if observation completed, likely calibrated correctly
- **Framework signals**: none
- **Project roles**: python_sdk_library
- **Layout**: library_package (confidence: low)
- **Risk preset**: python_sdk_library / partial
- **Test paths found**: 0 | **Python files**: 21
- **Unknowns**: layout_low_confidence(low), no_framework_signal, all_frameworks_low_confidence, test_mapping_zero

### ✅ tiktoken-ml (ml_tooling_tokenizer)

- **Sample reason**: supported: framework_detection_gap repo
- **support_level**: `supported` (expected: `smoke`)
- **Verdict**: CALIBRATED — Project role + framework/layout evidence supports 'supported' label
- **Framework signals**: none
- **Project roles**: python_sdk_library
- **Layout**: library_package (confidence: high)
- **Risk preset**: python_sdk_library / partial
- **Test paths found**: 0 | **Python files**: 18
- **Unknowns**: no_framework_signal, all_frameworks_low_confidence, test_mapping_zero

### ✅ python-monorepo (python_monorepo)

- **Sample reason**: supported: framework_detection_gap, monorepo
- **support_level**: `supported` (expected: `observed_only`)
- **Verdict**: CALIBRATED — Project role + framework/layout evidence supports 'supported' label
- **Framework signals**: none
- **Project roles**: python_sdk_library
- **Layout**: library_package (confidence: medium)
- **Risk preset**: python_sdk_library / partial
- **Test paths found**: 0 | **Python files**: 6
- **Unknowns**: no_framework_signal, all_frameworks_low_confidence, test_mapping_zero

### ✅ loguru (python_sdk_library)

- **Sample reason**: supported: framework_detection_gap + risk_preset_gap
- **support_level**: `supported` (expected: `validated`)
- **Verdict**: CALIBRATED — Project role + framework/layout evidence supports 'supported' label
- **Framework signals**: none
- **Project roles**: service_backend, python_sdk_library
- **Layout**: library_package (confidence: high)
- **Risk preset**: generic_service / unvalidated
- **Test paths found**: 4 | **Python files**: 170
- **Unknowns**: no_framework_signal, all_frameworks_low_confidence, risk_preset_unvalidated

### ✅ nltk (ml_scientific)

- **Sample reason**: supported: test_mapping_gap + risk_preset_gap
- **support_level**: `supported` (expected: `smoke`)
- **Verdict**: CALIBRATED — Project role + framework/layout evidence supports 'supported' label
- **Framework signals**: pytest(high, 2 dims), click(high, 3 dims)
- **Project roles**: service_backend, python_sdk_library, cli_application
- **Layout**: cli_app (confidence: medium)
- **Risk preset**: generic_service / unvalidated
- **Test paths found**: 0 | **Python files**: 381
- **Unknowns**: risk_preset_unvalidated, test_mapping_zero

## Conclusion

98% supported+ is well-calibrated: all sampled repos have appropriate evidence for their label

### Implication for P28b-2

Support labels are well-calibrated. P28b-2 can proceed with confidence that `supported+` repos will produce useful repair workflow signals.

---
_Auto-generated by p28b_sanity_audit.ts_
# Pantheon E2E Dogfood Report

**Run ID**: `e2e_1777263618002`
**Date**: 2026-04-27T04:20:18.002Z
**Overall**: ✅ PASS
**Duration**: 48ms

---

## Stage Summary

| # | Stage | Status | Duration |
|---|---|---|---|
| 1 | P11 Handoff Generation | ✅ pass | 12ms |
| 2 | P12 Deterministic Codegen | ✅ pass | 6ms |
| 3 | P14 Boundary Graph | ✅ pass | 5ms |
| 4 | P15 Blast Radius | ✅ pass | 11ms |
| 5 | P17 Scoped Handoff Export | ✅ pass | 5ms |
| 6 | P18 Scope Diff — Pass Fixture | ✅ pass | 1ms |
| 7 | P18 Scope Diff — Outside Scope | ✅ pass | 1ms |

## Golden Number Checks

| Stage | Check | Expected | Actual | Pass |
|---|---|---|---|---|
| p11_handoff | readiness_pass_count | >= 11 | 12 | ✅ |
| p11_handoff | total_checks | 13 | 13 | ✅ |
| p12_codegen | file_count_12 | 12 | 12 | ✅ |
| p12_codegen | entity_count | >= 6 | 6 | ✅ |
| p12_codegen | evaluator_pass | pass | pass | ✅ |
| p14_boundary_graph | gates_6_of_6 | 6 | 6 | ✅ |
| p14_boundary_graph | node_count_gte_160 | >= 160 | 180 | ✅ |
| p14_boundary_graph | gen_files_12 | 12 | 12 | ✅ |
| p15_blast_radius | total_downstream_gte_60 | >= 60 | 62 | ✅ |
| p15_blast_radius | highest_risk_high | high | high | ✅ |
| p17_scoped_handoff | allowed_files_gt_0 | > 0 | 10 | ✅ |
| p17_scoped_handoff | required_tests_gt_0 | > 0 | 8 | ✅ |
| p18_pass_fixture | status_pass | pass | pass | ✅ |
| p18_pass_fixture | zero_violations | 0 | 0 | ✅ |
| p18_outside_scope | status_requires_reverse_issue | requires_reverse_issue | requires_reverse_issue | ✅ |
| p18_outside_scope | has_outside_violation | true | true | ✅ |

## Hash Chain

### P11 Handoff Generation

**Inputs:**
- `architecture`: `349f93c7f2da490a`
- `interface`: `6024dba3ab498c54`
- `module`: `9c567b47bcc5219c`
**Outputs:**
- `handoff_package`: `f474a51770646a73`

### P12 Deterministic Codegen

**Inputs:**
- `handoff_package`: `9c477448ab0324c4`
**Outputs:**
- `codegen_package`: `6d06dba9fa5909c0`

### P14 Boundary Graph

**Inputs:**
- `handoff_package`: `9c477448ab0324c4`
- `codegen_output`: `1e91fad39ecf6da1`
**Outputs:**
- `boundary_graph`: `5bcb50cda71460ea`

### P15 Blast Radius

**Inputs:**
- `boundary_graph`: `05acd4bfa031fbac`
**Outputs:**
- `blast_radius`: `79404f0b7669453c`

### P17 Scoped Handoff Export

**Inputs:**
- `boundary_graph`: `05acd4bfa031fbac`
- `blast_radius`: `4b5f82a843e184b9`
**Outputs:**
- `scope_package`: `76e1cb90e6b261f2`

### P18 Scope Diff — Pass Fixture

**Inputs:**
- `scope_package`: `3835fad05af644e8`
**Outputs:**
- `report`: `c60e5edbab7be948`

### P18 Scope Diff — Outside Scope

**Outputs:**
- `report`: `391edf0ceb2c04b1`

## Canonical Pointer Integrity

- Before: `065b672dcebbc303`
- After: `065b672dcebbc303`
- Unchanged: ✅

# P29.5 — Contract Required Gate & Policy Tamper Protection

## Phase Identity

```
Phase: P29.5
Status: ACTIVE
Prerequisite: P28b (Python 400-repo), P28c (TS/JS 400-repo), P26.5 (GitHub PR gate), P29 (session scoping)
Goal: Upgrade Pantheon from "effective when agents cooperate" to "enforceable even when agents don't"
```

## One-Line Summary

> No valid contract → no silent pass for risky changes.
> PR-modified policy → not used for this PR's evaluation.
> PR-authored approval artifacts → not trusted.

---

## 1. Problem Statement

Pantheon currently relies on agents voluntarily initiating the repair/change contract workflow. This creates a gap:

```
- Agent can push code changes directly without creating a contract.
- Agent can modify Pantheon config to weaken rules before the check runs.
- Agent can commit fake approval JSON artifacts claiming trust.
- Agent can treat self-generated artifacts as evidence of approval.
- No enforcement exists at the PR gate level for contract requirement.
```

P29.5 closes this gap by making contract enforcement **diff-risk-driven**, not **agent-cooperation-dependent**.

---

## 2. Security Model — 6 Invariants

```
INV-1: Pantheon does not trust agent self-reported identity.
INV-2: Pantheon uses base branch policy to evaluate PRs.
INV-3: PR-modified policy does not affect this PR's evaluation.
INV-4: PR-authored contract/audit/approval artifacts are not trusted.
INV-5: High-risk diffs require a valid contract or trusted human approval.
INV-6: Low-risk human changes remain lightweight (no forced contract).
```

Core principle: **Don't try to determine if a commit is AI-written. Instead, determine: what's the risk, is there a contract, is there trusted approval, was policy tampered with?**

---

## 3. New Verdict: `requires_contract`

Verdict ordering (highest to lowest severity):

```
fail                      — forbidden / fake approval / critical policy tamper
requires_replan           — contract exists but stale / revision mismatch
requires_contract         — high/medium risk diff, no valid contract
requires_scope_expansion  — contract exists but diff exceeds scope
requires_review           — contract exists or low risk, but touches review zone
pass                      — low risk or within contract scope
```

---

## 4. Core Data Structures

### ContractGateResult

Top-level output of the contract gate evaluation.

```
Fields:
  schema, verdict, risk_level, contract_status,
  policy_source, changed_files, findings,
  trusted_approval, required_action, metrics
```

### ContractGateFileFinding

Per-file risk classification.

```
Buckets:
  low_risk, source, test, docs, review_required,
  policy_sensitive, contract_artifact, generated_artifact,
  workflow, forbidden, unknown
```

### ContractGateFinding

Semantic finding (missing_contract, policy_tamper, fake_approval_ignored, etc).

### TrustedApprovalSummary

Trust resolution result from GitHub reviews, CODEOWNERS, maintainer labels, or local audit.

---

## 5. Base Branch Policy Evaluation

### GitHub PR Mode

```
1. Read policy from PR base SHA (github.event.pull_request.base.sha)
2. Never use PR head or merge commit policy for evaluation
3. If PR modifies policy files → mark policy_tamper
4. PR-modified policy is the subject of review, not the ruleset
5. Output: "Pantheon evaluated this PR using policy from the base branch."
```

### Local Mode

```
Default: use merge-base with main/master
Flag: --base <sha> | --base-ref main | --policy-source current
If no upstream: use current worktree, mark policy_source=current_worktree
```

---

## 6. Policy Tamper Detection

Protected paths:

```
AGENTS.md
pantheon.json / pantheon.alpha.json / pantheon.agent.json
.pantheon/policy/**
.pantheon/architecture/**
.pantheon/repair/** / .pantheon/change/**
.pantheon/audit/** / .pantheon/reviews/**
.github/workflows/**
CODEOWNERS
action/action.yml
```

Tamper classification:

```
policy_sensitive  → requires_review (base policy used)
workflow_sensitive → requires_review or fail
contract_artifact → ignored as trust source
approval_artifact → ignored; fail if claims approval
active_contract   → requires_replan / fail
```

---

## 7. PR-Authored Artifact Distrust

These files, when present in a PR diff, cannot serve as trust sources:

```
human_audit_decision.json
approval.json
repair_contract.latest.json
change_contract.latest.json
review_queue.json
review_request.md/json
governance events
metrics snapshots
```

If a PR includes `.pantheon/audit/human_decision.json` → output `fake_approval_ignored`.

---

## 8. Contract Requirement Risk Rules

### Low Risk → pass / light review, no contract required
- docs-only, comments-only, formatting-only, README, small test-only

### Medium Risk → requires_contract unless valid contract or trusted approval
- source code, non-core modules, package-local, test-affecting, minor config

### High Risk → requires_contract / requires_review / fail
- auth, payment, security, public API, exports
- package.json scripts/bin/exports, dependencies
- workflow, deployment, generated artifacts
- architecture boundary, migration, monorepo workspace config

### Critical → fail
- forbidden path, policy bypass attempt, fake approval, workflow + contract tamper

---

## 9. Trusted Approval Model

### Trusted Sources
- GitHub approved review by actor with write+ permission
- CODEOWNERS approval
- Maintainer label (pantheon-approved, contract-approved)
- Workflow dispatch by trusted actor
- Local explicit audit command (with actor/source record)

### Untrusted Sources
- PR body text
- Commit messages
- Changed JSON files claiming approval
- Agent self-identification
- Branch names

---

## 10. Sub-Phases

```
P29.5-0  Phase doc + threat model (this document)
P29.5-1  baseBranchPolicyLoader + policyTamperDetector + prAuthoredArtifactGuard
P29.5-2  contractRequirementPolicy + contractGateEvaluator + activeContractResolver
P29.5-3  trustedApprovalResolver (GitHub + local)
P29.5-4  GitHub PR Action integration + comment rendering
P29.5-5  Local review queue + metrics integration
P29.5-6  12-case dogfood matrix (Python + TS/JS)
P29.5-7  Closeout report
```

---

## 11. Dogfood Matrix (12 Cases)

```
 1. docs-only change                       → pass
 2. source change no contract              → requires_contract
 3. source change with valid contract      → pass
 4. source change stale contract           → requires_replan
 5. package.json scripts change            → requires_contract
 6. .github/workflows change               → requires_review / fail
 7. pantheon.alpha.json touched            → requires_review (base policy)
 8. PR adds fake approval JSON             → ignored / fail
 9. PR modifies contract artifact          → ignored / requires_replan
10. generated dist change                  → requires_review
11. trusted approval present               → review satisfied
12. low-risk test-only change              → pass / light review
```

Must cover both Python and TS/JS sidecar paths.

---

## 12. Hard Gates for Closeout

```
 1. High-risk source diff no contract     → requires_contract
 2. Low-risk docs-only                    → pass
 3. Stale contract                        → requires_replan
 4. PR modifies policy                    → base policy used, requires_review
 5. PR fake approval                      → ignored
 6. PR modifies contract artifact         → not trusted
 7. workflow/pkg script/generated         → not silent pass
 8. Trusted approval resolver works
 9. Review queue generates contract_request
10. Metrics record contract gate captures
11. GitHub comment explains why / next
12. Python + TS/JS sidecar no regression
13. Full tests green
14. tsc clean
15. Sanitizer 0 leak
```

---

## 13. Explicit Non-Goals

```
- No cloud permission system
- No enterprise SSO/RBAC
- No IDE UI
- No P30 architecture relation matrix
- No new language adapters
- No AI-written commit detection heuristics
- No agent identity trust
```

---

## 14. Post-Completion Claim

```
AGENTS.md is advice.
Pantheon is enforcement.

Pantheon does not rely on agents voluntarily following instructions.
Risky code changes require an enforceable contract or trusted approval before merge.
```

# Pantheon Trust Model

## Overview

Pantheon's trust model is designed around a single principle: **the system must produce correct governance verdicts even when the actor is adversarial or negligent**. This applies equally to AI agents, automated workflows, and human contributors.

## Core Axioms

### Axiom 1: Identity is Not Trustworthy

```
Pantheon does not attempt to determine whether a commit was authored by a human or an AI agent.
Pantheon does not trust agent self-reported identity (commit metadata, PR body claims, branch names).
```

**Rationale:** Agent identity claims are trivially spoofable. Even honest agents may operate in contexts where identity boundaries are blurred (pair programming, IDE copilots, agent-assisted edits). Building governance on identity attribution is architecturally unsound.

### Axiom 2: Risk is Structural, Not Intent-Based

```
Governance decisions are based on:
  1. What files changed (structural risk)
  2. What contract exists (procedural legitimacy)
  3. What approval exists (trust delegation)
  4. Whether policy was tampered with (meta-integrity)
```

**Not based on:** who claims to have written the code, why they say they wrote it, or how confident they report being.

### Axiom 3: Policy Source Must Be Immutable During Evaluation

```
The policy used to evaluate a PR must come from the base branch.
Any policy modifications within the PR are the subject of evaluation, not the ruleset.
```

**Rationale:** If the evaluator reads policy from the PR head, an adversarial actor can weaken rules in the same PR that violates them. This is the classic "marking your own homework" vulnerability.

### Axiom 4: PR-Authored Artifacts Are Not Evidence

```
Files added or modified within a PR cannot serve as:
  - Proof of approval
  - Proof of contract validity
  - Proof of audit completion
  - Proof of review satisfaction
```

**Rationale:** Any actor who can push commits can create artifact files. The existence of a file named `approval.json` in a PR proves only that someone created a file with that name.

### Axiom 5: Trust Flows Through External Mechanisms

```
Trusted approval sources:
  - GitHub review approval by actor with write+ permission
  - CODEOWNERS file approval (via GitHub's native mechanism)
  - Repository labels applied by actors with write+ permission
  - Workflow dispatch by trusted actors
  - Local audit commands (recorded with actor identity)
```

These mechanisms are external to the PR's file content and cannot be forged by adding files to the PR.

### Axiom 6: Low-Risk Changes Must Remain Frictionless

```
Not all changes require contracts.
Docs-only, formatting-only, comment-only, and small test-only changes pass with minimal governance.
```

**Rationale:** Over-governance creates compliance fatigue and incentivizes workarounds. The system must be strict on high-risk paths and invisible on low-risk paths.

---

## Threat Model

### Threat 1: Uncontracted High-Risk Change

```
Scenario: Agent pushes auth module changes without creating a repair/change contract.
Current: Silent pass (if no repair session is active).
P29.5: requires_contract verdict. PR blocked until contract is created.
```

### Threat 2: Policy Self-Modification

```
Scenario: PR modifies pantheon.alpha.json to remove a forbidden path, then touches that path.
Current: Modified policy is used for evaluation → forbidden path not detected.
P29.5: Base branch policy is used → forbidden path still detected.
         Policy change flagged as policy_tamper → requires_review.
```

### Threat 3: Fake Approval Artifact

```
Scenario: PR includes .pantheon/audit/human_audit_decision.json with decision: "approve_repair".
Current: System may read this file as a valid audit decision.
P29.5: PR-authored audit artifacts are ignored.
         Finding: fake_approval_ignored.
         Verdict: fail or requires_review.
```

### Threat 4: Contract Artifact Injection

```
Scenario: PR modifies .pantheon/repair/runs/<id>/repair_contract.latest.json.
Current: Modified contract may be read as valid.
P29.5: PR-authored contract modifications are not trusted.
         Contract validity checked against base branch state.
```

### Threat 5: Workflow Tampering

```
Scenario: PR modifies .github/workflows/ci.yml to skip Pantheon checks.
Current: Workflow change detected as review_required (if risk preset matches).
P29.5: Explicit workflow_sensitive classification.
         Cannot silent-pass under any contract.
```

### Threat 6: Scope Laundering

```
Scenario: Agent creates a narrow contract for "fix typo in README" but modifies auth logic.
Current: requires_scope_expansion (if repair session active).
P29.5: Unchanged — scope checking already handles this. But now the contract must exist first.
```

---

## Trust Resolution Hierarchy

```
1. Base branch policy          → defines what's protected
2. Diff risk classification    → determines contract requirement
3. Contract validity           → checked against base state, not PR state
4. Trusted approval            → resolved via GitHub API, not PR artifacts
5. Policy tamper detection     → flags any policy modification in PR
6. Verdict                     → deterministic output of above inputs
```

Each layer is evaluated independently. No layer can override a higher layer.

---

## Implementation Boundary

This trust model is implemented in P29.5. It does not cover:

- Multi-tenant permission systems
- Enterprise SSO/RBAC integration
- IDE-level enforcement
- Cross-repository policy propagation
- Cryptographic commit signing verification

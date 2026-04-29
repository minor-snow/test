# Phase 4: Coherence & Discipline — Policy

**Date:** 2026-04-25

## Goal

Phase 4 adds three mechanisms to move the system from "maintainable" to "convergent":

1. **Domain semantic filtering** — prevent non-domain content from entering canonical
2. **Artifact clean observability** — make residual issues visible without blocking
3. **Redundancy detection** — flag repetitive narrative across sections

## New Linter Rules

| Rule | Severity | Trigger | Action |
|---|---|---|---|
| `domain_irrelevant_content` | medium | Block text contains zero domain keywords for its `ArtifactType` | LLM patch should replace with domain-relevant content. Human review recommended. |
| `redundant_narrative` | low | Block shares >40% 3-gram key phrases with a block in a different section | Advisory. Human decides whether to consolidate. Does not block pipeline. |

## Domain Keyword Strategy

Each `ArtifactType` has a curated keyword set defined in `linter.ts`:

| ArtifactType | Example Keywords |
|---|---|
| ArchitectureDraft | system, pipeline, gate, validation, schema, canonical, quarantine, ... |
| Constitution | rule, principle, constraint, policy, governance, ... |
| InterfaceSpec | api, endpoint, schema, contract, protocol, ... |
| ModuleSpec | module, function, class, dependency, implementation, ... |
| DecisionLog | decision, alternative, rationale, trade-off, ... |
| RiskRegister | risk, impact, mitigation, contingency, severity, ... |

**Matching strategy:** A block passes if ANY keyword is found (case-insensitive substring match).
This is deliberately conservative — false negatives are acceptable, false positives are not.

## Redundancy Detection Algorithm

1. Extract content words by removing stop words from block text
2. Build 3-gram sets from remaining words
3. Compare each block against earlier blocks in **different** sections
4. If overlap ratio ≥ 40% (based on smaller set), flag `redundant_narrative`
5. Only one finding per block (first match)
6. Same-section pairs are skipped (related content is expected within a section)

## IntegrityReport: `residual_issues`

The `IntegrityReport.summary` now includes:

```ts
summary: {
  total: number;
  warnings: number;
  corruptions: number;
  artifacts_scanned: number;
  revisions_scanned: number;
  residual_issues: number;  // P4-002
};
```

**Semantics:**
- Counts all linter issues found on canonical revisions
- Does NOT count as corruption — does not block pipeline
- Makes "artifact clean" status observable
- Signing off on residual issues is a human decision

## Three Layers of "Clean" (Consolidated)

| Layer | Check | Status |
|---|---|---|
| **Integrity clean** | `corruptions === 0` | Automated gate |
| **Artifact clean** | `residual_issues === 0` | Observable, human-decided |
| **Document coherent** | `final_readability_note` | Human assessment |

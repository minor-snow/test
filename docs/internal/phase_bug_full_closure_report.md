# Phase BUG-FULL Closure Report

Date: 2026-04-30

## Scope

Phase BUG-FULL closed the remaining public-surface, technical-debt, engineering-debt, and architecture-truth items carried in `docs/audit/BUGS_AND_DEBT.md` after the earlier core-stabilization phase. This stage added no new product capability.

## Input Audit

- Source audit: `docs/audit/BUGS_AND_DEBT.md`
- Machine-readable disposition index: `data/audit/phase_bug_full_issue_index.json`
- Fresh Vitest evidence: `data/audit/phase_bug_full_vitest.json`

## Closure Summary

- Total indexed issues: 110
- Fixed: 81
- Duplicates merged: 3
- Non-repro: 0
- Intentional exceptions: 1
- Deferred with reason: 25
- Critical open: 0
- High public-surface open: 0
- Hardcoded secrets open: 0
- Path traversal class open: 0
- P28b blocker count still open: 0

## Security Cleanup

- Hardcoded live-trial secrets were removed and replaced with env-gated reads.
- Path-containment helpers now protect release, ledger, and uncertainty-register paths.
- GitHub and config entrypoints now fail closed on malformed or unsafe inputs.

## GitHub, Alpha, and Local Governance Surface

The following public-surface issues are now closed: 20. Representative fixes include GitHub comment marker matching, `fail_on=all` exit semantics, stdin forwarding, alpha doctor GitHub enable/disable parity, governance-event write reliability, review-queue locking, metrics fail-closed behavior, and release/ledger path safety.

## Python P28b Blockers

The Python-readiness blockers closed here are:

- B23-risk-preset: Flask mapped to FastAPI risk preset
- B23-threshold: Small risk presets validated with overly low threshold
- B24: Airflow and Prefect classified as async framework
- B32: Sensitive-path detection inconsistency across scanners
- B33: Test mapper misses common JS/TS extensions
- B34-layout: namespace_package layout never emitted
- B34-underscore: Leading underscore source generates double-underscore test candidate
- B35: Utility-module test mapping is too broad
- B36: Migration keyword false positives on substrings such as immigration

## Test Quality and Build Hygiene

- Tautological or weak tests called out in the audit were rewritten into behavioral assertions.
- Production `tsc` now excludes `test/`.
- `package.json` now declares a Node engine floor.
- The build now cleans `dist/` before compile so packaging reflects current output.

## Architecture and Scripts

- `ARCHITECTURE.md` was rewritten to match the current repository layout, phase history, and subsystem boundaries.
- `docs/internal/script_status_inventory.md` now classifies script families and explains generated-state policy.

## Remaining Deferred Items

These items were not left ambiguous; they were explicitly deferred because they require broader refactors than a stabilization-only phase should take on immediately before P28b.

| ID | Title | Reason | Planned Phase |
|---|---|---|---|
| T2 | Three overlapping file-scope classifiers | This requires a larger ownership and behavior merge across boundary, bootstrap, and repair workflows. Current BUG-FULL work stabilized behavior without forcing a risky unification. | Phase DEBT-LATER |
| T3 | Two parallel diff verifiers | Boundary diff verification and repair diff verification now have explicit ownership, but a full merger would be a larger refactor than BUG-FULL allows. | Phase DEBT-LATER |
| T4 | ValidationResult type fragmentation | Public surfaces were normalized enough for alpha and repair workflows; deeper cross-project validator unification remains deferred. | Phase DEBT-LATER |
| T5 | Markdown renderers lack shared abstraction | Renderer consolidation is valuable but not a blocker for P28b, closed alpha, or BUG-FULL public-surface trust. | Phase DEBT-LATER |
| T6 | Mixed catch styles | Security-, session-, and public-surface paths were normalized first. Global stylistic catch unification remains non-blocking debt. | Phase DEBT-LATER |
| T8 | agentScopeLiteBuilder violates SRP | The module remains behaviorally correct; structural decomposition is postponed to avoid churning stable boundary behavior before P28b. | Phase DEBT-LATER |
| T9 | Production as any usage remains in older legacy modules | High-risk as any usage was removed from new public paths, but remaining legacy cleanup spans older modules that are not current public-surface blockers. | Phase DEBT-LATER |
| T10 | Production non-null assertions remain in older legacy modules | Public and repair-surface non-null assertions were reduced; the remaining legacy assertions need broader invariant refactors. | Phase DEBT-LATER |
| N1 | Two schema_version conventions coexist | Public surfaces now standardize on @0.1.0-style schema versions. Older historical schemas are intentionally grandfathered to preserve backward readability. | Phase DEBT-LATER |
| N2 | Validator return types are fragmented | The alpha, GitHub, and local-governance public surfaces now fail closed where needed, but full validator return-type unification remains broader debt. | Phase DEBT-LATER |
| N3 | save/write/persist naming is inconsistent | Naming drift is now documented but not worth a repo-wide churn pass before P28b. | Phase DEBT-LATER |
| N4 | validateSkillOutput uses positional parameters | This is a narrow API ergonomics cleanup and is not on the repair, alpha, or Python-readiness critical path. | Phase DEBT-LATER |
| N6 | Runtime error messages mix languages | Public docs can stay bilingual, but a full runtime error-code sweep is deferred until after language-readiness work. | Phase DEBT-LATER |
| E1 | Repository-wide test coverage remains below ideal | BUG-FULL added direct tests for the repaired public surfaces and session paths, but a repo-wide coverage push remains a separate investment. | Phase DEBT-LATER |
| TA1 | Many tests still use process.cwd() | Several fixture-heavy tests intentionally bind to repository-curated dogfood assets. Converting all of them to temp-root helpers is useful but not a BUG-FULL blocker. | Phase DEBT-LATER |
| P1 | readFileSync remains inside some loops | The public and repair hot paths were reduced first. Remaining looped sync reads are not current closed-alpha blockers and need targeted profiling before refactor. | Phase DEBT-LATER |
| P2 | repoScanner remains synchronous and recursive | A full async scanner rewrite would churn a stable observation pipeline immediately before P28b. | Phase DEBT-LATER |
| P3 | Repeated filter passes over large arrays | This remains measurable cleanup debt but is not currently a correctness or alpha-surface blocker. | Phase DEBT-LATER |
| P5 | Startup loads many JSON artifacts eagerly | The eager-load pattern is now bounded by local-only operator workflows; a lazy-load pass is deferred. | Phase DEBT-LATER |
| S2 | Broad fail-open catch audit bucket remains larger than desired | Core repair, session, GitHub, metrics, and config fail-closed paths were fixed first. A full repo-wide catch-style sweep remains broader debt. | Phase DEBT-LATER |
| S3 | Remaining JSON.parse sites are not all wrapped individually | Public-surface JSON parsing now fails closed where it matters most. Remaining internal curated-artifact reads are documented debt rather than public-surface blockers. | Phase DEBT-LATER |
| C1 | Module-level cycles remain | Cycle removal spans multiple legacy subsystems and is too large for a stabilization-only phase without risking regression. | Phase DEBT-LATER |
| C2 | repair layer still depends on CLI-owned surfaces in places | Layering cleanup remains broader refactor debt after public-surface stabilization. | Phase DEBT-LATER |
| C3 | CLI remains the highest fan-out integration surface | This is expected for the current local-first product shape; deeper orchestration extraction is deferred. | Phase DEBT-LATER |
| C4 | Cross-module coupling remains high in legacy stacks | Coupling reduction is tracked but intentionally postponed until after P28b readiness work. | Phase DEBT-LATER |

## Regression Evidence

- `node ./node_modules/typescript/bin/tsc --noEmit`: pass
- `npm.cmd run build`: pass
- `node ./node_modules/vitest/vitest.mjs run --reporter=json --outputFile data/audit/phase_bug_full_vitest.json`: pass (166 files, 1,871 tests)
- `node ./node_modules/@vercel/ncc/dist/ncc/cli.js build src/github/githubActionEntry.ts -o action/dist --license licenses.txt`: pass
- `npm.cmd pack`: pass
- `node dist/src/cli/pantheon-alpha.js init --repo <temp> --force`: pass
- `node dist/src/cli/pantheon-alpha.js doctor`: pass
- `node dist/src/cli/pantheon-alpha.js metrics daily`: pass
- `node dist/src/cli/pantheon-alpha.js review list`: pass

## What This Proves

1. All issues still tracked in `BUGS_AND_DEBT.md` now have an explicit disposition.
2. Critical open count is zero.
3. High-severity public-surface issues are closed.
4. The GitHub repair surface, alpha harness, governance ledger, review queue, and metrics surface all have fresh regression evidence.
5. The known Python false positives that would directly pollute P28b have been removed.

## What This Does Not Prove

1. Pantheon has completed the larger architecture refactors grouped under the deferred items.
2. Repo-wide coverage debt is gone.
3. Performance refactors such as a full async repo scanner are finished.
4. Any patch produced under Pantheon is semantically correct without human review and tests.

## P28b Readiness Verdict

P28b readiness: cleared.

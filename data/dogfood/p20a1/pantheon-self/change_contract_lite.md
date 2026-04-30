# Pantheon Change Contract Lite

## Decision
- **Verdict:** requires_review

### Reasons
- Changed file not observed: src/repoObservation/importExtractor.ts
- Changed file not observed: src/repoObservation/repoScanner.ts
- Changed file not observed: src/changeContract/lite/changeContractLiteBuilder.ts
- Changed file not observed: test/repoObservation/importExtractor.test.ts
- Repository has uncommitted changes

### Required Actions
- Verify unobserved changed file: src/repoObservation/importExtractor.ts
- Verify unobserved changed file: src/repoObservation/repoScanner.ts
- Verify unobserved changed file: src/changeContract/lite/changeContractLiteBuilder.ts
- Verify unobserved changed file: test/repoObservation/importExtractor.test.ts
- Commit or stash uncommitted changes before proceeding

## Intent
P20a.1 self-scan trial: validate observation quality on Pantheon itself

## Changed Files
- `src/repoObservation/importExtractor.ts`
- `src/repoObservation/repoScanner.ts`
- `src/changeContract/lite/changeContractLiteBuilder.ts`
- `test/repoObservation/importExtractor.test.ts`

## Changed File Statuses
| Path | Status | Reason |
|---|---|---|
| `src/repoObservation/importExtractor.ts` | not_observed | File not found in observations; manual verification recommended |
| `src/repoObservation/repoScanner.ts` | not_observed | File not found in observations; manual verification recommended |
| `src/changeContract/lite/changeContractLiteBuilder.ts` | not_observed | File not found in observations; manual verification recommended |
| `test/repoObservation/importExtractor.test.ts` | not_observed | File not found in observations; manual verification recommended |

## Observed Scope
- **Unknowns:** src/repoObservation/importExtractor.ts, src/repoObservation/repoScanner.ts, src/changeContract/lite/changeContractLiteBuilder.ts, test/repoObservation/importExtractor.test.ts

## References
- **Repo observations hash:** `sha256:2b909c8990b7b9418a42f02055aa4be11d5341df4fa1b32e5c37508c2ceb9383`
- **Head commit:** f000ea27f47b2bc5464bd9617b5b34730baff086
- **Repo state:** git_dirty
- **Uncommitted changes:** true

---

> **Notice:** This is a bootstrap contract derived from deterministic repo observations.
> It is not a full governed ChangeContract.
> The decision is based on user-provided changed files and path-convention analysis.

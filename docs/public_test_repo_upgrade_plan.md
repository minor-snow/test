# Public Test Repo Upgrade Plan

## Objective
Upgrade `minor-snow/test` from an old check/repair smoke repository into a black-box conformance harness for the new kernel (P18-0).

## Scope
Verifies:
- Stable `--json` CLI output
- DSA discovery/review surfaces
- Workgraph lifecycle surfaces
- Agent Gateway envelope surfaces
- Public-safe metadata projection
- Absence of absolute path and raw payload leaks

Does NOT verify or contain:
- Clarion internal engine source
- Internal `.pantheon` stores
- Raw dogfood transcripts
- Private architecture logic

## Execution Phases
### Public-1 — Inventory & Boundary Lock
- Audit current state.
- Create `public_repo_boundary.md` and this plan.
- Update `README.md`.

### Public-2: Add New Kernel Fixtures
We will create isolated lightweight public source fixtures in `public-test-repo/fixtures/`:
- `smoke-ts/`: A minimal TS project to verify syntax/compilation.
- `dsa-basic/`: A simplified public source architecture state.

### Public-3 — Agent Envelope Examples
- Add `examples/agent_envelopes/` with `submit.json`, `progress.json`, `complete.json`.

### Public-4 — CLI Contract Tests
- Add `tests/cli_contract.test.ts` and `tests/safety_contract.test.ts`.

### Public-5 — DSA Public Smoke Flow
- Add `tests/dsa_flow.test.ts` and `scripts/run_dsa_smoke.sh`.

### Public-6 — Workgraph Public Smoke Flow
- Add `tests/workgraph_flow.test.ts` and `scripts/run_workgraph_smoke.sh`.

### Public-7 — Agent Gateway Public Smoke Flow
- Add `tests/agent_gateway_flow.test.ts` and `scripts/run_agent_gateway_smoke.sh`.
- Add negative examples (`invalid_absolute_path.json`, etc.).

### Public-8 — Public Transcript Example
- Add `expected/transcripts/sanitized_single_agent_transcript.md`.

### Public-9 — Scripts & CI
- Add `scripts/run_public_smoke.sh`.
- Set up `package.json` with `vitest`.
- Add `.github/workflows/public-smoke.yml`.

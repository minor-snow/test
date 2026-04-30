# Script Status Inventory

Date: 2026-04-30

This inventory closes the earlier "orphan script / undocumented script" audit
findings by classifying every script family into an explicit operational role.

## Status Meanings

- `active`: part of current regression, benchmark, or dogfood evidence
- `internal`: operator-only or maintenance helper
- `deprecated`: superseded by newer entrypoints, retained temporarily
- `historical`: old phase artifact retained for replayability only

## Active

| Scripts | Status | Purpose |
|---|---|---|
| `checkIntegrity.ts` | active | Store integrity scan for canonical artifact data. |
| `p20a1SelfScanTrial.ts` | active | Pantheon self-scan observation smoke. |
| `p25a_saleor_observation.ts` to `p25h_boundary_adversarial_suite.ts` | active | Saleor Python governance and boundary proof chain. |
| `p26_github_action_dogfood.ts` | active | GitHub Action boundary gate validation. |
| `p27_run_benchmark.ts` | active | Python benchmark runner. |
| `p28_dogfood.ts`, `p28_2_setup_dogfood.ts`, `p28_2_run_repair_dogfood.ts` | active | Repair governance and local-governance dogfood. |
| `runDogfoodE2E.ts` | active | Cross-phase end-to-end verification. |
| `runPhase14BoundaryGraph.ts`, `runPhase15BlastRadius.ts`, `runPhase17ScopedHandoff.ts`, `runPhase18ScopeDiff.ts`, `runPhase20aRepoObservations.ts`, `runPhase21DiffWorkflow.ts`, `runPhase23PetAgentTrial.ts` | active | Deterministic phase runners still used for regression evidence. |

## Internal

| Scripts | Status | Purpose |
|---|---|---|
| `checkStats.ts` | internal | Repository metrics sanity checks. |
| `createImplementationIssue.ts`, `processImplementationIssue.ts` | internal | Internal issue bootstrapping helpers. |
| `importPetSeeds.ts`, `residualBreakdown.ts` | internal | Trial seed and report utilities. |
| `scanSaleor.ts` | internal | Focused Saleor inspection helper. |
| `targetedCleanup.ts` | internal | Local maintenance helper for curated dogfood state. |

## Deprecated

| Scripts | Status | Purpose |
|---|---|---|
| `p23_1_prepare.ts`, `p23_1_verify.ts`, `p23_2_verify.ts` | deprecated | Earlier agent-trial staging helpers retained for evidence history. |
| `runPhase6Trial.ts` to `runPhase12_1CompileHarness.ts` | deprecated | Historical phase-specific trial runners kept for replayability, not daily use. |
| `runPhase11CrossModelTest.ts`, `runPhase11_2_openai.ts`, `runPhase11_2b_openai.ts` | deprecated | Historical model-evaluation harnesses. |

## Historical Data Rule

Script outputs become evidence only when they are intentionally curated under
`data/dogfood/` or `data/audit/`. Runtime state under local `.pantheon/`,
temporary fixture repositories, and ad hoc debugging outputs is generated state
and must not be treated as source of truth.

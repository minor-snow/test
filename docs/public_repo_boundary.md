# Public Test Repo Boundary

This document defines the strict boundary of the `minor-snow/test` repository (the Clarion Public Conformance Harness).

## What This Repository IS
This repository acts as a **black-box conformance harness** for Clarion's CLI envelope surface.
It proves that external systems (such as generic agents, CI runners, and external clients) can safely and deterministically interact with the Clarion kernel via `--json` without encountering unhandled payload dumps or unstructured console text.

It verifies:
- `CliResultEnvelope` JSON contract structure.
- Public-safe metadata projections.
- State progressions for DSA, Workgraph, and Agent Gateway.

## What This Repository is NOT
This repository **must not** contain, expose, or mirror internal Clarion capabilities.

### Forbidden Contents:
1. **Internal Source Code**: No logic handlers, routing implementations, or engine source from the closed repository.
2. **Internal `.pantheon` States**: No real workgraph ledgers, no agent session data, and no real architecture contracts from the internal codebase.
3. **Internal Transcripts**: No raw agent interaction transcripts or internal dogfood logs.
4. **Governance Logic**: This repository does not test the *verdict* correctness of internal modules, only that the CLI properly serializes whatever verdict the engine produces.

All testing fixtures (`fixtures/`) must be entirely synthetic and simplified. All agent interactions (`examples/`) must use generic IDs.

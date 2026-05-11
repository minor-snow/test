# Clarion Public CLI Conformance Harness

This repository is a public black-box conformance harness for Clarion's CLI surface.

It verifies:
- stable `--json` CLI output
- DSA discovery/review surfaces
- Workgraph lifecycle surfaces
- Agent Gateway envelope surfaces
- public-safe metadata projection
- absence of absolute path and raw payload leaks

It does not contain:
- Clarion engine source code
- governance implementation logic
- internal `.pantheon` stores
- private architecture contracts
- raw dogfood transcripts

## Usage
Run the public smoke tests via:
```bash
npm install
npm run public:smoke
```

Or execute tests via Vitest:
```bash
npm run test
```

## Structure
- `fixtures/`: Minimal synthetic projects for testing state observation.
- `examples/`: Agent submission payloads (submit, progress, complete).
- `expected/`: Sanitized transcripts and expected structured outputs.
- `tests/`: Subprocess-based Vitest scripts verifying the CLI `CliResultEnvelope` contract.

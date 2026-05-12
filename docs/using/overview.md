# Clarion Operator Overview

Welcome to the Clarion Engine operator surface. Clarion is a deterministic governance layer and orchestration engine designed to maintain architectural integrity across codebases, especially when operated upon by autonomous AI agents.

## What it does
Clarion provides a set of CLI commands that act as a strict governance contract. It enforces rules around:
1. **DSA (Domain System Architecture)**: Observing structural drift and enforcing architectural boundaries.
2. **Workgraph**: Managing atomic units of work, tracking dependencies, and handling state transitions for agents.
3. **Agent Gateway**: Providing a single, validated entry point for AI agents to submit work, report progress, and complete sessions.
4. **World Model**: Exposing a unified, read-only projection of the repository's context for downstream consumers.

## When to use it
- When you need to audit a repository's architecture against its defined boundaries.
- When orchestrating multi-agent or single-agent workflows that require strict dependency tracking and review gates.
- When you need to generate machine-readable, deterministic context (`GovernanceContext`) for AI agents to consume.

## When not to use it
- Clarion is **not** an auto-healing script. It identifies drift and records state; it does not blindly rewrite your code.
- Clarion is **not** a traditional CI/CD runner. It integrates into CI pipelines but its primary role is structural governance and agent tracking, not running unit tests.

## The CLI JSON Contract
The primary interface for external consumers (including humans using the Local Console, CI runners, and AI agents) is the `--json` flag. 
All commands executed with `--json` will return a standardized `CliResultEnvelope`.

See [json_envelope_contract.md](./json_envelope_contract.md) for full details on the output shape.

## Next Steps
- Review the [Command Index](./command_index.md) for a full list of available commands.
- Read about [DSA Workflows](./dsa_workflows.md) to understand how architecture is observed and reviewed.
- Learn about the [Local Review Console](./local_review_console.md) for a visual, browser-based way to operate Clarion.

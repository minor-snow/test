# Clarion Command Index

This index lists the primary CLI commands available for operators. Every command supports the `--json` flag for machine-readable output.

## DSA (Domain System Architecture)
Commands for observing and enforcing architectural boundaries.

| Command | Purpose |
| :--- | :--- |
| `clarion dsa observe` | Scans the repository for structural drift and generates candidates. |
| `clarion dsa status` | Shows the current status of the architecture governance. |
| `clarion dsa review list` | Lists pending architectural candidates that require human review. |
| `clarion dsa review show <id>` | Displays detailed evidence and impact for a specific candidate. |
| `clarion dsa review approve <id>` | Approves a candidate for materialization. |
| `clarion dsa review reject <id>` | Rejects a candidate. |
| `clarion dsa materialize` | Applies approved candidates to the system (e.g., updating boundaries). |
| `clarion dsa project` | Projects the current architecture contract as metadata. |

## Workgraph
Commands for managing units of work and agent coordination.

| Command | Purpose |
| :--- | :--- |
| `clarion workgraph status` | Shows the high-level health of the work items and conflicts. |
| `clarion workgraph list` | Lists all active work items in the graph. |
| `clarion workgraph show <id>` | Shows detailed state and dependencies for a work item. |
| `clarion workgraph import-dsa` | Imports approved DSA candidates as work items. |
| `clarion workgraph claim <id>` | Marks a work item as claimed by an actor. |
| `clarion workgraph complete <id>` | Marks a work item as successfully finished. |
| `clarion workgraph events` | Displays the ledger of workgraph transitions. |

## Agent Gateway
Commands for agent interaction and session management.

| Command | Purpose |
| :--- | :--- |
| `clarion agent status` | Shows active agent sessions and gateway health. |
| `clarion agent submit` | Submits a work payload from an agent. |
| `clarion agent progress` | Reports incremental progress on a session. |
| `clarion agent complete` | Finalizes an agent session. |
| `clarion agent sessions` | Lists recent and active agent transcripts. |

## Maintenance & Diagnostics
| Command | Purpose |
| :--- | :--- |
| `clarion doctor` | Runs a health check on the Clarion installation and local stores. |
| `clarion check` | Performs a unified check across DSA, Workgraph, and PR gates. |
| `clarion guard` | Validates if a proposed change violates existing contracts. |

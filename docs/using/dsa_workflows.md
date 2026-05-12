# DSA Workflows

The Domain System Architecture (DSA) workflow is the core mechanism for identifying and resolving architectural drift.

## The Lifecycle

### 1. Observation
Run `clarion dsa observe` to scan the codebase. 
- **What happens**: Clarion analyzes your source files and architectural definitions.
- **Result**: If new architectural facts or potential drift are detected, they are created as "Candidates."

### 2. Review
Use `clarion dsa review list` to see what needs attention.
- **Reviewing Detail**: Run `clarion dsa review show <id>` to understand the evidence and impact of a candidate.
- **Decision**: Humans or authorized agents must then `approve` or `reject` the candidate.

### 3. Materialization
Run `clarion dsa materialize`.
- **What happens**: Approved candidates are integrated into the repository's governance state (e.g., updating the canonical architecture map).
- **Result**: The "drift" is now recognized as a "fact" of the architecture.

## Common Error Scenarios
- **Conflict**: A candidate conflicts with an existing hard-coded policy. Use `dsa review show` to see the conflict details.
- **Stale State**: If the source code changes significantly between observation and review, the candidate may become invalid. Run `dsa observe` again to refresh.

## Best Practices
- **Small Batches**: Run `observe` and `materialize` frequently to keep the drift window small.
- **Contextual Notes**: When reviewing, check the `readability_summary` in the JSON output; it contains a natural language explanation of why the candidate was generated.

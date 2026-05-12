# Workgraph Workflows

The Workgraph is the orchestration layer that translates architectural changes into actionable units of work for agents and humans.

## Workflow Steps

### 1. Synchronization
Run `clarion workgraph import-dsa`.
- **What happens**: This command takes approved DSA candidates and creates corresponding "Work Items" in the graph.
- **Why**: This ensures that architectural intent is actually tracked through to implementation.

### 2. Status & Listing
Run `clarion workgraph list`.
- **Active Items**: See what work is currently pending, claimed, or completed.
- **Health**: `workgraph status` identifies blocking conflicts or un-synchronized items.

### 3. Claiming
Run `clarion workgraph claim <id>`.
- **Ownership**: Signals that a specific actor (agent or human) is working on this item.
- **State Change**: The item moves from `pending` to `active`.

### 4. Completion
Run `clarion workgraph complete <id>`.
- **Finalization**: Signals that the work has been finished according to the contract.
- **Verification**: The engine validates that the completion criteria (e.g., related agent session successful) are met.

## Handling Conflicts
If multiple work items affect the same domain or files, a conflict may be flagged.
- Use `workgraph status` to find the conflict.
- Use `workgraph show <id>` to see the overlapping items.

## Visibility
The `workgraph events` command provides a ledger of all state transitions, allowing for auditing of who claimed what and when it was finished.

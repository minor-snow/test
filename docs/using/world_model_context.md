# World Model & GovernanceContext

Clarion maintains a unified "World Model" that is the single source of truth for the repository's state, architecture, and governance history.

## GovernanceContext
The `GovernanceContext` is a machine-readable projection of the world model. It is designed to be injected into an agent's system prompt or tool-calling loop.

### What's included:
- **Active Project Identity**: Name and corpus details.
- **Architecture Contract**: Current domains, boundaries, and enforcement rules.
- **Active Governance State**: Pending candidates, active work items, and open agent sessions.
- **Shared Metadata**: High-level repository insights (languages, key modules).

## Consumption
Agents should consume the world model to make informed decisions.
- **Proactive Routing**: Understanding which work item to claim based on architectural dependencies.
- **Conflict Avoidance**: Identifying if another agent is already working on a related set of files.

## Read-Only Guarantee
Downstream consumers (including the Local Console and AI Agents) treat the world model as **read-only**. Any state changes must be initiated via the specific CLI mutation commands (DSA, Workgraph, Agent). This prevents "context drift" where an agent's internal model of the world diverges from the reality recorded in the stores.

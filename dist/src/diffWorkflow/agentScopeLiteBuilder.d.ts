/**
 * P21: Agent Scope Lite Builder
 *
 * Derives agent-facing scope from ChangeContractLite + RepoObservations.
 *
 * For full governed scoping, see:
 *   src/scopedHandoff/scopedHandoffExporter.ts (P17)
 *   src/changeContract/agentScopeExporter.ts (P19c)
 *
 * AgentScopeLite is intentionally smaller: it is a repo-bootstrap
 * projection, not a full governed handoff package.
 */
import type { ChangeContractLite } from "../changeContract/lite/types.js";
import type { RepoObservations } from "../repoObservation/types.js";
import type { AgentScopeLite } from "./types.js";
export declare function buildAgentScopeLite(input: {
    contract: ChangeContractLite;
    observations: RepoObservations;
}): AgentScopeLite;
export declare function renderAgentScopeLiteMarkdown(scope: AgentScopeLite): string;
export declare function renderCursorRuleFromScope(scope: AgentScopeLite): string;

/**
 * P20a: ChangeContract Lite Builder
 *
 * Builds a Lite contract from RepoObservations + user-provided changed files.
 * Decision rules (correction applied):
 *   - path_invalid / excluded → requires_reverse_issue
 *   - not_observed / sensitive / owner-hinted / dirty / no-test-mapping → requires_review
 *   - otherwise → pass
 *
 * P20a does NOT produce "fail" for missing test mappings.
 */
import type { RepoObservations } from "../../repoObservation/types.js";
import type { ChangeContractLite } from "./types.js";
export declare function buildChangeContractLite(input: {
    observations: RepoObservations;
    changedFiles: string[];
    intent?: string;
}): ChangeContractLite;

/**
 * P29.5: Active Contract Resolver
 *
 * Resolves whether a valid repair or change contract exists for the
 * current repository state. Checks trust, staleness, and PR-authorship.
 *
 * Contract trust rules:
 *   - Contract must exist on disk (not just in PR diff)
 *   - Contract revision must be current
 *   - Contract base_sha must match (if in PR mode)
 *   - Contract must not be PR-authored (in PR mode)
 *   - Contract must not be stale (based on session status)
 *
 * ref: P29.5 section 11
 */
import type { ActiveContractResolution } from "../policy/contractGateTypes.js";
export declare function resolveActiveContract(input: {
    repoRoot: string;
    prChangedPaths?: readonly string[];
    baseSha?: string;
}): ActiveContractResolution;

import type { ChangeIntake, ChangeScopeEntry } from "./types.js";
import type { ArchitectureContract } from "../architecture/types.js";
export type BuildChangeScopeInput = {
    intake: ChangeIntake;
    /** Active architecture contract from base branch. Optional — no contract = existing behavior. */
    architectureContract?: ArchitectureContract;
    /** User-declared module subjects for contextual ownership projection. */
    targetSubjects?: readonly string[];
};
export type ChangeScopeResult = {
    allowed: ChangeScopeEntry[];
    review_required: ChangeScopeEntry[];
    forbidden: ChangeScopeEntry[];
};
export declare function buildChangeScope(input: BuildChangeScopeInput): ChangeScopeResult;

import type { ChangeCheckResult } from "./types.js";
export declare function writeChangeReviewRequest(repoRoot: string, result: ChangeCheckResult, source?: "local_cli" | "github_action"): void;

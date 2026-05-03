import type { ChangeCheckResult, ChangeContract, ChangeIntake } from "./types.js";
export declare function writeChangeIntakeEvent(repoRoot: string, intake: ChangeIntake): void;
export declare function writeChangePlanEvent(repoRoot: string, contract: ChangeContract): void;
export declare function writeChangeCheckEvent(repoRoot: string, result: ChangeCheckResult): void;

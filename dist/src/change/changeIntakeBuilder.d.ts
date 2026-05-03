import type { ChangeIntake, ChangeType } from "./types.js";
export type BuildChangeIntakeInput = {
    changeType: ChangeType;
    title: string;
    reason: string;
    targetPatterns: string[];
    declaredNonGoals?: string[];
    operatorNotes?: string[];
    createdBy?: "user" | "agent" | "ci";
    repoRoot?: string;
};
export declare function buildChangeIntake(input: BuildChangeIntakeInput): ChangeIntake;

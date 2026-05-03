import type { ChangeType } from "../change/types.js";
export type CmdChangeIntakeOptions = {
    type: ChangeType;
    title: string;
    reason: string;
    target: string[];
    nonGoal?: string[];
    note?: string[];
    json?: boolean;
};
export declare function runChangeIntake(repoRoot: string, options: CmdChangeIntakeOptions): void;

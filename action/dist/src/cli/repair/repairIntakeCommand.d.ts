import type { RepairSession } from "../../repair/session/repairSessionTypes.js";
export declare function cmdRepairIntake(input: {
    repoRoot: string;
    fromPath?: string;
    intent?: string;
    suspectPaths?: string[];
    failingTests?: string[];
    mustPreserve?: string[];
    agentId?: string;
    operatorId?: string;
    json?: boolean;
}): RepairSession;

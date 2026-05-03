import type { ChangeIntake, ChangeContract } from "./types.js";
export type BuildChangeContractInput = {
    intake: ChangeIntake;
    revision?: number;
    policyHash?: string;
};
export declare function buildChangeContract(input: BuildChangeContractInput): ChangeContract;

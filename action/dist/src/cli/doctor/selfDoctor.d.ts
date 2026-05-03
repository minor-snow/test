import type { DoctorCheckResult } from "./externalDoctor.js";
export type SelfDoctorResult = {
    ready: boolean;
    checks: DoctorCheckResult[];
};
export declare function runSelfDoctor(repoRoot?: string): SelfDoctorResult;

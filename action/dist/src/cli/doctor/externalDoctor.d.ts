export type DoctorCheckResult = {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    message?: string;
    path?: string;
};
export type ExternalDoctorResult = {
    ready: boolean;
    checks: DoctorCheckResult[];
};
export declare function runExternalDoctor(repoRoot?: string): ExternalDoctorResult;

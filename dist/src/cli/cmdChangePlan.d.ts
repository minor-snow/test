export type CmdChangePlanOptions = {
    changeId: string;
    json?: boolean;
};
export declare function runChangePlan(repoRoot: string, options: CmdChangePlanOptions): void;

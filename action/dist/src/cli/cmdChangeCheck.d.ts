export type CmdChangeCheckOptions = {
    changeId: string;
    base?: string;
    head?: string;
    format?: "text" | "json";
    failOn?: "blocking" | "all" | "none";
    redact?: boolean;
};
export declare function runChangeCheck(repoRoot: string, options: CmdChangeCheckOptions): void;

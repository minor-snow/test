export interface AlphaInitInput {
    repoRoot: string;
    force?: boolean;
    noGithub?: boolean;
    actionRef?: string;
    artifactMode?: "public" | "private" | "debug";
}
export declare function cmdAlphaInit(input: AlphaInitInput): void;

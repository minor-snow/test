export type LocalMetricsConfig = {
    readonly enabled: boolean;
    readonly mode: "local";
    readonly generateDailyReport: boolean;
    readonly includeFilePaths: boolean;
    readonly anonymizePaths: boolean;
    readonly retentionDays: number;
};
export declare function loadLocalMetricsConfig(repoRoot: string, configPath?: string): LocalMetricsConfig;

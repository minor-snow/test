import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function loadLocalMetricsConfig(repoRoot, configPath = "pantheon.alpha.json") {
    const defaults = {
        enabled: true,
        mode: "local",
        generateDailyReport: true,
        includeFilePaths: true,
        anonymizePaths: false,
        retentionDays: 30,
    };
    const path = join(repoRoot, configPath);
    if (!existsSync(path)) {
        return defaults;
    }
    try {
        const parsed = JSON.parse(readFileSync(path, "utf-8"));
        return {
            enabled: parsed.metrics?.enabled ?? defaults.enabled,
            mode: "local",
            generateDailyReport: parsed.metrics?.generate_daily_report ?? defaults.generateDailyReport,
            includeFilePaths: parsed.metrics?.include_file_paths ?? defaults.includeFilePaths,
            anonymizePaths: parsed.metrics?.anonymize_paths ?? defaults.anonymizePaths,
            retentionDays: parsed.metrics?.retention_days ?? defaults.retentionDays,
        };
    }
    catch {
        return defaults;
    }
}
//# sourceMappingURL=metricsConfig.js.map
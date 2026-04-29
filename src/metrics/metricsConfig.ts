import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type LocalMetricsConfig = {
  readonly enabled: boolean;
  readonly mode: "local";
  readonly generateDailyReport: boolean;
  readonly includeFilePaths: boolean;
  readonly anonymizePaths: boolean;
  readonly retentionDays: number;
};

export function loadLocalMetricsConfig(repoRoot: string, configPath = "pantheon.alpha.json"): LocalMetricsConfig {
  const defaults: LocalMetricsConfig = {
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
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
      metrics?: {
        enabled?: boolean;
        mode?: string;
        generate_daily_report?: boolean;
        include_file_paths?: boolean;
        anonymize_paths?: boolean;
        retention_days?: number;
      };
    };
    return {
      enabled: parsed.metrics?.enabled ?? defaults.enabled,
      mode: "local",
      generateDailyReport: parsed.metrics?.generate_daily_report ?? defaults.generateDailyReport,
      includeFilePaths: parsed.metrics?.include_file_paths ?? defaults.includeFilePaths,
      anonymizePaths: parsed.metrics?.anonymize_paths ?? defaults.anonymizePaths,
      retentionDays: parsed.metrics?.retention_days ?? defaults.retentionDays,
    };
  } catch {
    return defaults;
  }
}

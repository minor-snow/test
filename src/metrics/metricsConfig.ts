import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export type LocalMetricsConfig = {
  readonly enabled: boolean;
  readonly mode: "local";
  readonly generateDailyReport: boolean;
  readonly includeFilePaths: boolean;
  readonly anonymizePaths: boolean;
  readonly retentionDays: number;
};

const metricsOverlaySchema = z.object({
  metrics: z.object({
    enabled: z.boolean().optional(),
    mode: z.literal("local").optional(),
    generate_daily_report: z.boolean().optional(),
    include_file_paths: z.boolean().optional(),
    anonymize_paths: z.boolean().optional(),
    retention_days: z.number().int().min(1).optional(),
  }).optional(),
}).passthrough();

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

  const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  const result = metricsOverlaySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid Pantheon alpha config for metrics: ${result.error.issues.map(issue => issue.message).join("; ")}`);
  }

  return {
    enabled: result.data.metrics?.enabled ?? defaults.enabled,
    mode: "local",
    generateDailyReport: result.data.metrics?.generate_daily_report ?? defaults.generateDailyReport,
    includeFilePaths: result.data.metrics?.include_file_paths ?? defaults.includeFilePaths,
    anonymizePaths: result.data.metrics?.anonymize_paths ?? defaults.anonymizePaths,
    retentionDays: result.data.metrics?.retention_days ?? defaults.retentionDays,
  };
}

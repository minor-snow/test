import { resolve } from "node:path";
import { aggregateDailyMetrics, latestMetricsStatus, writeDailyMetricsArtifacts } from "../metrics/localMetricsAggregator.js";
import { renderDailyMetricsReport } from "../metrics/dailyReportRenderer.js";

export function cmdMetrics(args: string[]): void {
  const subcommand = args[0];
  const repoRoot = getFlag(args, "repo") ?? ".";

  switch (subcommand) {
    case "daily":
      cmdMetricsDaily(repoRoot, getFlag(args, "date"));
      return;
    case "status":
      cmdMetricsStatus(repoRoot);
      return;
    default:
      console.error("Usage:");
      console.error("  pantheon metrics daily [--date YYYY-MM-DD]");
      console.error("  pantheon metrics status");
      process.exitCode = 1;
  }
}

export function cmdMetricsDaily(repoRootInput: string, date = new Date().toISOString().slice(0, 10)): void {
  try {
    const repoRoot = resolve(repoRootInput);
    const report = aggregateDailyMetrics(repoRoot, date);
    const markdown = renderDailyMetricsReport(report);
    const paths = writeDailyMetricsArtifacts(repoRoot, report, markdown);

    console.log("Pantheon Metrics Daily\n");
    console.log(`  Date: ${report.date}`);
    console.log(`  Repair checks: ${report.repair_checks}`);
    console.log(`  Open reviews: ${report.open_review_requests.length}`);
    console.log(`  Output: ${paths.markdownPath(report.date)}`);
  } catch (error) {
    console.error(`[Pantheon Metrics] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export function cmdMetricsStatus(repoRootInput: string): void {
  try {
    const repoRoot = resolve(repoRootInput);
    const status = latestMetricsStatus(repoRoot);

    console.log("Pantheon Metrics Status\n");
    console.log(`  Enabled: ${status.config.enabled ? "yes" : "no"}`);
    console.log(`  Mode: ${status.config.mode}`);
    console.log(`  Generate daily report: ${status.config.generateDailyReport ? "yes" : "no"}`);
    console.log(`  Include file paths: ${status.config.includeFilePaths ? "yes" : "no"}`);
    console.log(`  Anonymize paths: ${status.config.anonymizePaths ? "yes" : "no"}`);
    console.log(`  Latest report: ${status.latestJsonPath ?? "none"}`);
  } catch (error) {
    console.error(`[Pantheon Metrics] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function getFlag(args: readonly string[], name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) {
    return args[idx + 1];
  }
  return undefined;
}

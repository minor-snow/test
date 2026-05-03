/**
 * P23: Agent Trial Report Renderer
 *
 * Renders AgentTrialReport as human-readable markdown.
 * Includes fixture context, per-attempt summary, comparison tables,
 * protocol gaps, and final judgment.
 */
import type { AgentTrialReport } from "./types.js";
export declare function renderAgentTrialReportMarkdown(report: AgentTrialReport): string;

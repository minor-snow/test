/**
 * P22: Agent Feedback Markdown Renderer
 *
 * Renders AgentFeedback into human-readable markdown.
 * The primary agent input is JSON; this is for reviewer visibility.
 */
import type { AgentFeedback } from "./types.js";
export declare function renderAgentFeedbackMarkdown(feedback: AgentFeedback): string;

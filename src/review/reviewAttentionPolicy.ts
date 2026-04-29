import type { RepairVerdict } from "../repair/types.js";
import type { ReviewAttentionLevel } from "./reviewRequestTypes.js";

export function attentionLevelForVerdict(
  verdict: RepairVerdict,
  sanitizerViolations = 0,
): ReviewAttentionLevel | null {
  if (sanitizerViolations > 0) {
    return "urgent";
  }
  switch (verdict) {
    case "requires_review":
      return "human_review";
    case "requires_scope_expansion":
    case "requires_replan":
      return "blocking";
    case "fail":
      return "urgent";
    case "pass":
      return null;
  }
}

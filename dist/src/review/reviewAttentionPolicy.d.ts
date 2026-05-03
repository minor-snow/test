import type { RepairVerdict } from "../repair/types.js";
import type { ReviewAttentionLevel } from "./reviewRequestTypes.js";
export declare function attentionLevelForVerdict(verdict: RepairVerdict, sanitizerViolations?: number): ReviewAttentionLevel | null;

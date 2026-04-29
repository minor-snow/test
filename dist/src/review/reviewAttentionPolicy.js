export function attentionLevelForVerdict(verdict, sanitizerViolations = 0) {
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
//# sourceMappingURL=reviewAttentionPolicy.js.map
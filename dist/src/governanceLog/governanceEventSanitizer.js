import { sanitizeArtifact } from "../artifacts/artifactSanitizer.js";
const DIFF_HUNK_PATTERNS = [
    /^@@ /m,
    /^diff --git /m,
    /^\+\+\+ /m,
    /^--- /m,
];
export function sanitizeGovernanceEvent(event) {
    const text = JSON.stringify(event, null, 2);
    const violations = [];
    const artifactScan = sanitizeArtifact(text, "public");
    for (const violation of artifactScan.violations) {
        violations.push({
            kind: violation.kind === "stack_trace"
                ? "stack_trace"
                : violation.kind === "secret_like_key"
                    ? "secret_like_value"
                    : "absolute_path",
            message: violation.message,
            match: violation.match,
        });
    }
    for (const pattern of DIFF_HUNK_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            violations.push({
                kind: "diff_hunk",
                message: "Diff hunk content must not be recorded in governance events.",
                match: match[0],
            });
        }
    }
    for (const value of walkStringValues(event)) {
        if (containsDiffHunkFragment(value)) {
            violations.push({
                kind: "diff_hunk",
                message: "Diff hunk content must not be recorded in governance events.",
                match: value.slice(0, 80),
            });
        }
        if (value.includes("\n")) {
            violations.push({
                kind: "multiline_payload",
                message: "Multiline payloads are not allowed in governance events.",
                match: value.slice(0, 80),
            });
        }
    }
    return {
        clean: violations.length === 0,
        violations,
    };
}
function walkStringValues(value) {
    if (typeof value === "string") {
        return [value];
    }
    if (Array.isArray(value)) {
        return value.flatMap(item => walkStringValues(item));
    }
    if (value && typeof value === "object") {
        return Object.values(value).flatMap(item => walkStringValues(item));
    }
    return [];
}
function containsDiffHunkFragment(value) {
    const trimmed = value.trim();
    return (trimmed.startsWith("@@ ")
        || trimmed.startsWith("diff --git ")
        || trimmed.startsWith("+++ ")
        || trimmed.startsWith("--- "));
}
//# sourceMappingURL=governanceEventSanitizer.js.map
/**
 * P18.5-B: Artifact Sanitizer Tests
 *
 * Validates that the artifact sanitizer correctly detects sensitive patterns
 * in public-mode and passes through in debug-mode.
 *
 * ref: P18.5-B
 */
import { describe, it, expect } from "vitest";
import { sanitizeArtifact, getCriticalViolations, } from "../../src/artifacts/artifactSanitizer.js";
import { isPublicSafeArtifact, PUBLIC_SAFE_ARTIFACTS, INTERNAL_ARTIFACTS, } from "../../src/artifacts/publicArtifactPolicy.js";
// ---------------------------------------------------------------------------
// Public artifact policy
// ---------------------------------------------------------------------------
describe("P18.5-B: Public Artifact Policy", () => {
    it("PUBLIC_SAFE_ARTIFACTS and INTERNAL_ARTIFACTS do not overlap", () => {
        const publicSet = new Set(PUBLIC_SAFE_ARTIFACTS);
        for (const internal of INTERNAL_ARTIFACTS) {
            expect(publicSet.has(internal), `${internal} appears in both lists`).toBe(false);
        }
    });
    it("isPublicSafeArtifact matches known public artifacts", () => {
        expect(isPublicSafeArtifact("repair_task.md")).toBe(true);
        expect(isPublicSafeArtifact("check.json")).toBe(true);
        expect(isPublicSafeArtifact("python_report.md")).toBe(true);
    });
    it("isPublicSafeArtifact rejects known internal artifacts", () => {
        expect(isPublicSafeArtifact("python_observations.json")).toBe(false);
        expect(isPublicSafeArtifact("raw_agent_report")).toBe(false);
    });
    it("isPublicSafeArtifact handles paths with directories", () => {
        expect(isPublicSafeArtifact("data/dogfood/saleor/check.json")).toBe(true);
        expect(isPublicSafeArtifact("data/dogfood/saleor/python_observations.json")).toBe(false);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Windows absolute paths
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Windows absolute paths", () => {
    it("detects Windows absolute path", () => {
        const content = 'Generated at H:\\Boom\\pantheon\\data\\output.json';
        const result = sanitizeArtifact(content, "public");
        expect(result.clean).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.violations[0].kind).toBe("windows_absolute_path");
        expect(result.violations[0].severity).toBe("critical");
    });
    it("detects Windows path with different drive letter", () => {
        const content = 'File: C:\\Users\\dev\\project\\src\\main.ts';
        const result = sanitizeArtifact(content, "public");
        expect(result.clean).toBe(false);
        const windowsViolations = result.violations.filter(v => v.kind === "windows_absolute_path");
        expect(windowsViolations.length).toBeGreaterThan(0);
    });
    it("does not flag relative paths", () => {
        const content = 'File: src/main.ts\nPath: ./config.json';
        const result = sanitizeArtifact(content, "public");
        const windowsViolations = result.violations.filter(v => v.kind === "windows_absolute_path");
        expect(windowsViolations.length).toBe(0);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Unix absolute paths
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Unix absolute paths", () => {
    it("detects Unix home directory path", () => {
        const content = "Output saved to /Users/developer/pantheon/data/report.md";
        const result = sanitizeArtifact(content, "public");
        expect(result.clean).toBe(false);
        expect(result.violations.some(v => v.kind === "unix_absolute_path")).toBe(true);
    });
    it("detects /home/ path", () => {
        const content = "Working directory: /home/ci/workspace/pantheon";
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "unix_absolute_path")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Stack traces
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Stack traces", () => {
    it("detects node_modules stack trace", () => {
        const content = '    at Module._compile (node_modules/ts-node/src/index.ts:1234:56)';
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "stack_trace")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Debug payload
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Debug markers", () => {
    it("detects [DEBUG] marker", () => {
        const content = '[DEBUG] internal observation dump started';
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "debug_payload")).toBe(true);
    });
    it('detects "debug": true in JSON', () => {
        const content = '{"debug": true, "output": "test"}';
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "debug_payload")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Secrets
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Secret-like keys", () => {
    it("detects API key pattern", () => {
        const content = 'api_key: "sk-1234567890abcdefghij"';
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "secret_like_key")).toBe(true);
    });
    it("detects access_token pattern", () => {
        const content = "access_token = 'ghp_abc123def456ghi789'";
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "secret_like_key")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: .env references
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — .env references", () => {
    it("detects .env file reference", () => {
        const content = "Load config from .env.local for development";
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "env_reference")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Internal observation dump
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Internal observation dump", () => {
    it("detects python_observations dump", () => {
        const content = '{"python_observations": {"files": []}}';
        const result = sanitizeArtifact(content, "public");
        expect(result.violations.some(v => v.kind === "internal_observation_dump")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Debug mode bypass
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Debug mode", () => {
    it("debug mode always returns clean=true", () => {
        const content = "H:\\Boom\\local\\path\\leaked.json /Users/dev/secret";
        const result = sanitizeArtifact(content, "debug");
        expect(result.clean).toBe(true);
        expect(result.violations).toHaveLength(0);
    });
});
// ---------------------------------------------------------------------------
// Sanitizer: Clean content
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Clean content", () => {
    it("returns clean=true for well-formed public content", () => {
        const content = [
            "# Repair Report",
            "",
            "## Summary",
            "- Changed files: 3",
            "- Verdict: pass",
            "- All tests passing",
            "",
            "## Changed Files",
            "- src/utils/format.ts (allowed)",
            "- src/utils/helpers.ts (allowed)",
            "- tests/utils/format.test.ts (allowed)",
        ].join("\n");
        const result = sanitizeArtifact(content, "public");
        expect(result.clean).toBe(true);
        expect(result.violations).toHaveLength(0);
    });
});
// ---------------------------------------------------------------------------
// getCriticalViolations helper
// ---------------------------------------------------------------------------
describe("P18.5-B: getCriticalViolations", () => {
    it("filters to only critical and high violations", () => {
        const content = [
            'H:\\Boom\\path', // critical
            '[DEBUG] test', // medium
            '/Users/dev/project', // critical
        ].join("\n");
        const result = sanitizeArtifact(content, "public");
        const critical = getCriticalViolations(result);
        expect(critical.length).toBeGreaterThan(0);
        expect(critical.every(v => v.severity === "critical" || v.severity === "high")).toBe(true);
    });
});
// ---------------------------------------------------------------------------
// Real-world artifact tests (P27 baselines should be clean)
// ---------------------------------------------------------------------------
describe("P18.5-B: Sanitizer — Real P27 baseline content", () => {
    it("a typical baseline JSON is clean", () => {
        const content = JSON.stringify({
            schema_version: "p27_baseline@1.0.0",
            frozen_at: "2026-04-29T01:50:00Z",
            core_3: {
                "saleor-django-commerce": {
                    pinned_commit: "cf9b5951",
                    category: "django_commerce",
                    metrics: { python_file_count: 4248 },
                },
            },
        }, null, 2);
        const result = sanitizeArtifact(content, "public");
        expect(result.clean).toBe(true);
    });
});
//# sourceMappingURL=artifactSanitizer.test.js.map
/**
 * P24: Artifact Layout Tests
 */
import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { resolvePantheonDir, publicPaths, internalPaths, relativePantheonPath } from "../../src/cli/artifactLayout.js";
describe("artifactLayout", () => {
    const repo = "/fake/repo";
    describe("resolvePantheonDir", () => {
        it("returns .pantheon under repo root", () => {
            const dir = resolvePantheonDir(repo);
            expect(dir).toBe(join(repo, ".pantheon"));
        });
    });
    describe("publicPaths", () => {
        it("returns all public artifact paths", () => {
            const paths = publicPaths(repo);
            expect(paths.task).toBe(join(repo, ".pantheon", "task.md"));
            expect(paths.scope).toBe(join(repo, ".pantheon", "scope.md"));
            expect(paths.report).toBe(join(repo, ".pantheon", "report.md"));
            expect(paths.feedback).toBe(join(repo, ".pantheon", "feedback.md"));
            expect(paths.check).toBe(join(repo, ".pantheon", "check.json"));
        });
        it("dir points to .pantheon root", () => {
            const paths = publicPaths(repo);
            expect(paths.dir).toBe(join(repo, ".pantheon"));
        });
    });
    describe("internalPaths", () => {
        it("returns all internal artifact paths under internal/", () => {
            const paths = internalPaths(repo);
            expect(paths.observations).toContain("internal");
            expect(paths.contract).toContain("internal");
            expect(paths.scope).toContain("internal");
            expect(paths.verification).toContain("internal");
            expect(paths.feedback).toContain("internal");
        });
        it("dir points to .pantheon/internal", () => {
            const paths = internalPaths(repo);
            expect(paths.dir).toBe(join(repo, ".pantheon", "internal"));
        });
        it("internal paths do not overlap with public paths", () => {
            const pub = publicPaths(repo);
            const int = internalPaths(repo);
            const pubValues = new Set([pub.task, pub.scope, pub.report, pub.feedback, pub.check]);
            const intValues = [int.observations, int.contract, int.scope, int.verification, int.feedback];
            for (const v of intValues) {
                expect(pubValues.has(v)).toBe(false);
            }
        });
    });
    describe("relativePantheonPath", () => {
        it("strips repo root prefix", () => {
            const full = join(repo, ".pantheon", "task.md");
            expect(relativePantheonPath(full, repo)).toBe(".pantheon/task.md");
        });
        it("returns path as-is when no match", () => {
            expect(relativePantheonPath("/other/path", repo)).toBe("/other/path");
        });
    });
});
//# sourceMappingURL=artifactLayout.test.js.map
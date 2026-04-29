import { describe, it, expect } from "vitest";
import { normalizeRepoRelativePath, isRepoRelativePath, } from "../../src/repoObservation/pathUtils.js";
describe("normalizeRepoRelativePath", () => {
    it("converts backslashes to forward slashes", () => {
        expect(normalizeRepoRelativePath("src\\auth\\login.ts")).toBe("src/auth/login.ts");
    });
    it("removes leading ./", () => {
        expect(normalizeRepoRelativePath("./src/foo.ts")).toBe("src/foo.ts");
    });
    it("removes nested leading ./", () => {
        expect(normalizeRepoRelativePath("././src/foo.ts")).toBe("src/foo.ts");
    });
    it("normalizes repeated slashes", () => {
        expect(normalizeRepoRelativePath("src//auth///login.ts")).toBe("src/auth/login.ts");
    });
    it("removes trailing slash", () => {
        expect(normalizeRepoRelativePath("src/auth/")).toBe("src/auth");
    });
    it("passes through valid repo-relative path unchanged", () => {
        expect(normalizeRepoRelativePath("src/foo.ts")).toBe("src/foo.ts");
    });
    it("handles mixed backslash and repeated slashes", () => {
        expect(normalizeRepoRelativePath(".\\src\\\\auth//login.ts")).toBe("src/auth/login.ts");
    });
    it("rejects empty path", () => {
        expect(() => normalizeRepoRelativePath("")).toThrow("must not be empty");
    });
    it("rejects whitespace-only path", () => {
        expect(() => normalizeRepoRelativePath("   ")).toThrow("must not be empty");
    });
    it("rejects absolute Unix path", () => {
        expect(() => normalizeRepoRelativePath("/usr/bin/foo")).toThrow("must not be absolute");
    });
    it("rejects absolute Windows path", () => {
        expect(() => normalizeRepoRelativePath("C:\\Users\\foo")).toThrow("must not be absolute");
    });
    it("rejects path escaping repo with leading ..", () => {
        expect(() => normalizeRepoRelativePath("../outside/file.ts")).toThrow("must not escape");
    });
    it("rejects path escaping repo with nested ..", () => {
        expect(() => normalizeRepoRelativePath("src/../../outside.ts")).toThrow("must not escape");
    });
    it("allows internal .. that does not escape", () => {
        expect(normalizeRepoRelativePath("src/sub/../foo.ts")).toBe("src/sub/../foo.ts");
    });
});
describe("isRepoRelativePath", () => {
    it("accepts valid repo-relative path", () => {
        expect(isRepoRelativePath("src/foo.ts")).toBe(true);
    });
    it("accepts nested path", () => {
        expect(isRepoRelativePath("src/auth/login.ts")).toBe(true);
    });
    it("accepts root-level file", () => {
        expect(isRepoRelativePath("package.json")).toBe(true);
    });
    it("rejects empty string", () => {
        expect(isRepoRelativePath("")).toBe(false);
    });
    it("rejects path with backslashes", () => {
        expect(isRepoRelativePath("src\\foo.ts")).toBe(false);
    });
    it("rejects absolute path", () => {
        expect(isRepoRelativePath("/usr/bin/foo")).toBe(false);
    });
    it("rejects Windows absolute path", () => {
        expect(isRepoRelativePath("C:/Users/foo")).toBe(false);
    });
    it("rejects escaping path", () => {
        expect(isRepoRelativePath("../outside")).toBe(false);
    });
    it("rejects path with repeated slashes", () => {
        expect(isRepoRelativePath("src//foo.ts")).toBe(false);
    });
    it("rejects path with leading ./", () => {
        expect(isRepoRelativePath("./src/foo.ts")).toBe(false);
    });
});
//# sourceMappingURL=pathUtils.test.js.map
import { describe, it, expect } from "vitest";
import { detectSensitivePaths } from "../../src/repoObservation/sensitivePathDetector.js";
function makeFile(path) {
    return { path, bucket: "src", language: "typescript", size_bytes: 100, analysis_status: "analyzed", evidence: [] };
}
describe("detectSensitivePaths", () => {
    it("detects auth keyword", () => {
        const result = detectSensitivePaths([makeFile("src/auth/login.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("auth_keyword");
        expect(result[0].review_required).toBe(true);
    });
    it("detects payment keyword", () => {
        const result = detectSensitivePaths([makeFile("src/payment/process.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("payment_keyword");
    });
    it("detects billing keyword", () => {
        const result = detectSensitivePaths([makeFile("src/billing/invoice.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("payment_keyword");
    });
    it("detects admin keyword", () => {
        const result = detectSensitivePaths([makeFile("src/admin/panel.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("admin_keyword");
    });
    it("detects secret keyword", () => {
        const result = detectSensitivePaths([makeFile("src/secret/keys.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("secret_keyword");
    });
    it("detects infra keyword", () => {
        const result = detectSensitivePaths([makeFile("src/infra/deploy.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("infra_keyword");
    });
    it("detects migration keyword", () => {
        const result = detectSensitivePaths([makeFile("src/migrations/001.ts")]);
        expect(result).toHaveLength(1);
        expect(result[0].reason).toBe("migration_keyword");
    });
    it("does not match partial segment (authorize ≠ auth)", () => {
        const result = detectSensitivePaths([makeFile("src/authorize/check.ts")]);
        expect(result).toHaveLength(0);
    });
    it("does not inspect content", () => {
        const result = detectSensitivePaths([makeFile("src/utils/helper.ts")]);
        expect(result).toHaveLength(0);
    });
    it("handles multiple sensitive files", () => {
        const result = detectSensitivePaths([
            makeFile("src/auth/login.ts"),
            makeFile("src/payment/billing.ts"),
        ]);
        expect(result).toHaveLength(2);
    });
});
//# sourceMappingURL=sensitivePathDetector.test.js.map
import { processBilling } from "../../src/payment/billing.js";
import { describe, it, expect } from "vitest";
describe("billing", () => {
    it("should format amount", () => {
        expect(processBilling(100)).toBe("$100.00");
    });
});
//# sourceMappingURL=billing.test.js.map
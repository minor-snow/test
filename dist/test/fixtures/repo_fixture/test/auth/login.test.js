import { login } from "../../src/auth/login.js";
import { describe, it, expect } from "vitest";
describe("login", () => {
    it("should authenticate valid user", () => {
        expect(login("user", "pass")).toBe(true);
    });
});
//# sourceMappingURL=login.test.js.map
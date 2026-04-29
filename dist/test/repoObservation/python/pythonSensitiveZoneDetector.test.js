/**
 * P25a: Python Sensitive Zone Detector Tests
 */
import { describe, it, expect } from "vitest";
import { detectPythonSensitiveZones } from "../../../src/repoObservation/python/pythonSensitiveZoneDetector.js";
describe("pythonSensitiveZoneDetector", () => {
    const saleorPaths = [
        "saleor/checkout/actions.py",
        "saleor/checkout/calculations.py",
        "saleor/payment/gateway.py",
        "saleor/payment/stripe.py",
        "saleor/order/actions.py",
        "saleor/account/models.py",
        "saleor/discount/rules.py",
        "saleor/tax/calculations.py",
        "saleor/plugins/manager.py",
        "saleor/webhook/handlers.py",
        "saleor/core/permissions.py",
        "saleor/core/auth.py",
        "saleor/graphql/checkout/schema.py",
    ];
    it("detects payment as critical", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const payment = zones.find(z => z.category === "financial_transactions");
        expect(payment).toBeDefined();
        expect(payment.severity).toBe("critical");
        expect(payment.matched_paths).toContain("saleor/payment/gateway.py");
    });
    it("detects checkout as high", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const checkout = zones.find(z => z.category === "purchase_flow");
        expect(checkout).toBeDefined();
        expect(checkout.severity).toBe("high");
    });
    it("detects order lifecycle", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const order = zones.find(z => z.category === "order_lifecycle");
        expect(order).toBeDefined();
    });
    it("detects account/identity", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const account = zones.find(z => z.category === "identity");
        expect(account).toBeDefined();
    });
    it("detects discount and tax", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const discount = zones.find(z => z.category === "pricing_adjustment");
        const tax = zones.find(z => z.category === "regulatory_calculation");
        expect(discount).toBeDefined();
        expect(tax).toBeDefined();
    });
    it("detects plugins", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const plugins = zones.find(z => z.category === "runtime_extension");
        expect(plugins).toBeDefined();
    });
    it("detects at least 5 different sensitive categories", () => {
        const zones = detectPythonSensitiveZones({ pythonPaths: saleorPaths });
        const categories = new Set(zones.map(z => z.category));
        expect(categories.size).toBeGreaterThanOrEqual(5);
    });
    it("supports config overrides", () => {
        const zones = detectPythonSensitiveZones({
            pythonPaths: saleorPaths,
            sensitiveOverrides: {
                "saleor/checkout/calculations.py": "pricing_logic",
            },
        });
        const custom = zones.find(z => z.category === "pricing_logic");
        expect(custom).toBeDefined();
        expect(custom.source).toBe("config_override");
    });
    it("returns empty for non-sensitive paths", () => {
        const zones = detectPythonSensitiveZones({
            pythonPaths: ["lib/utils.py", "lib/helpers.py"],
        });
        expect(zones).toHaveLength(0);
    });
});
//# sourceMappingURL=pythonSensitiveZoneDetector.test.js.map
import { formatCurrency } from "../utils/format.js";
// Undeclared package: scanner detects require("stripe") as an import
// The try/catch prevents runtime crash (P22 test fixture)
let stripe = null;
try {
    stripe = require("stripe");
}
catch { /* intentionally undeclared */ }
export function processBilling(amount) {
    void stripe;
    return formatCurrency(amount);
}
//# sourceMappingURL=billing.js.map
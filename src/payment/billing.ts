import { formatCurrency } from "../utils/format.js";

// Undeclared package: scanner detects require("stripe") as an import
// The try/catch prevents runtime crash (P22 test fixture)
let stripe: unknown = null;
try { stripe = require("stripe"); } catch { /* intentionally undeclared */ }

export function processBilling(amount: number): string {
  void stripe;
  return `${formatCurrency(amount)} billed`;
}

// Payment gateway — sensitive module
// Clean review modification
export interface PaymentGateway {
  type: "credit_card" | "bank_transfer";
  token: string;
}

export function chargePayment(amount: number, method: PaymentMethod): { success: boolean; transactionId: string } {
  // Placeholder — real implementation connects to payment provider
  return { success: true, transactionId: crypto.randomUUID() };
}

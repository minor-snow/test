export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function authenticate(user: string, pass: string): boolean {
  return user.length > 0 && pass.length > 0;
}

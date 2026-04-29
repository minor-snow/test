export function formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
}
export function authenticate(user, pass) {
    return user.length > 0 && pass.length > 0;
}
//# sourceMappingURL=format.js.map
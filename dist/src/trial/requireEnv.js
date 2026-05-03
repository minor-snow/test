export function requireEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required.`);
    }
    return value;
}
export function requireDeepSeekApiKey() {
    return requireEnv("DEEPSEEK_API_KEY");
}
//# sourceMappingURL=requireEnv.js.map
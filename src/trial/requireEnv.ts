export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function requireDeepSeekApiKey(): string {
  return requireEnv("DEEPSEEK_API_KEY");
}

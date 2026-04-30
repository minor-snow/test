const globRegexCache = new Map<string, RegExp>();

export function globToRegex(glob: string): RegExp {
  const cached = globRegexCache.get(glob);
  if (cached) return cached;

  const regex = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___DOUBLESTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___DOUBLESTAR___/g, ".*");
  const compiled = new RegExp(`^${regex}$`);

  if (globRegexCache.size < 2_000) {
    globRegexCache.set(glob, compiled);
  }

  return compiled;
}

export function matchesGlob(path: string, pattern: string): boolean {
  return globToRegex(pattern).test(path);
}

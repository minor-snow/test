function normalizeSegmentTokens(segment: string): string[] {
  return segment
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function pathContainsKeyword(path: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();
  for (const segment of path.split("/")) {
    const tokens = normalizeSegmentTokens(segment);
    if (tokens.some(token => token === normalizedKeyword || token === `${normalizedKeyword}s`)) {
      return true;
    }
  }
  return false;
}

export function filenameContainsToken(path: string, token: string): boolean {
  const filename = path.split("/").pop() ?? "";
  return normalizeSegmentTokens(filename).includes(token.toLowerCase());
}

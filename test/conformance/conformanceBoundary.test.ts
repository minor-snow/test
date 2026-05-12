/**
 * Conformance Boundary Test (Property P19-6).
 *
 * Verifies that NO file in public-test-repo/ imports from src/ or dist/src/.
 * The conformance harness must be self-contained — black-box testing only.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const describe: any;
declare const it: any;
declare const expect: any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Recursively find all .ts files in a directory, excluding node_modules and .git.
 */
function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      results.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Patterns that indicate an import from the internal source tree.
 * These are forbidden in the public-test-repo.
 */
const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["']\.\.\/\.\.\/src\//,
  /from\s+["']\.\.\/src\//,
  /from\s+["']src\//,
  /from\s+["']\.\.\/\.\.\/dist\/src\//,
  /from\s+["']\.\.\/dist\/src\//,
  /from\s+["']dist\/src\//,
  /from\s+["']\.\.\/\.\.\/\.\.\/src\//,
  /from\s+["']\.\.\/\.\.\/\.\.\/dist\/src\//,
  /require\s*\(\s*["']\.\.\/\.\.\/src\//,
  /require\s*\(\s*["']\.\.\/src\//,
  /require\s*\(\s*["']src\//,
  /require\s*\(\s*["']\.\.\/\.\.\/dist\/src\//,
  /require\s*\(\s*["']\.\.\/dist\/src\//,
  /require\s*\(\s*["']dist\/src\//,
  /require\s*\(\s*["']\.\.\/\.\.\/\.\.\/src\//,
  /require\s*\(\s*["']\.\.\/\.\.\/\.\.\/dist\/src\//,
];

describe("Conformance Boundary (P19-6)", () => {
  it("no file in public-test-repo/ imports from src/ or dist/src/", () => {
    // public-test-repo root is two levels up from this test file
    const publicRepoRoot = path.resolve(__dirname, "..", "..");
    const tsFiles = findTsFiles(publicRepoRoot);

    const violations: { file: string; line: number; content: string }[] = [];

    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(publicRepoRoot, filePath),
              line: i + 1,
              content: line.trim(),
            });
            break; // One violation per line is enough
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} forbidden import(s) from src/ or dist/src/ in public-test-repo:\n${report}`
      );
    }
  });
});

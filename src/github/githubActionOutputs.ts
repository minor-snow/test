import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function writeGitHubActionOutputs(
  env: NodeJS.ProcessEnv,
  outputs: Record<string, string | number | boolean | null | undefined>,
): void {
  const outputPath = env.GITHUB_OUTPUT;
  if (!outputPath) return;

  const resolved = resolve(outputPath);
  mkdirSync(dirname(resolved), { recursive: true });
  if (!existsSync(resolved)) {
    appendFileSync(resolved, "");
  }

  for (const [key, value] of Object.entries(outputs)) {
    const stringValue = value === null || value === undefined ? "" : String(value);
    writeOutputValue(resolved, key, stringValue);
  }
}

function writeOutputValue(outputPath: string, key: string, value: string): void {
  if (!value.includes("\n")) {
    appendFileSync(outputPath, `${key}=${value}\n`);
    return;
  }

  const delimiter = `PANTHEON_OUTPUT_${Math.random().toString(36).slice(2)}`;
  appendFileSync(outputPath, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}

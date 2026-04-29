import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function atomicWriteText(target: string, text: string): void {
  mkdirSync(dirname(target), { recursive: true });
  const temp = join(
    dirname(target),
    `.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${target.split(/[\\/]/).pop()}.tmp`,
  );
  writeFileSync(temp, text);
  renameSync(temp, target);
}

export function atomicWriteJson(target: string, value: unknown): void {
  atomicWriteText(target, `${JSON.stringify(value, null, 2)}\n`);
}

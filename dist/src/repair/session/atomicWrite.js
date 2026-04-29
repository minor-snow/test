import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
export function atomicWriteText(target, text) {
    mkdirSync(dirname(target), { recursive: true });
    const temp = join(dirname(target), `.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${target.split(/[\\/]/).pop()}.tmp`);
    writeFileSync(temp, text);
    renameSync(temp, target);
}
export function atomicWriteJson(target, value) {
    atomicWriteText(target, `${JSON.stringify(value, null, 2)}\n`);
}
//# sourceMappingURL=atomicWrite.js.map
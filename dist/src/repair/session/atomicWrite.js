import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
export function atomicWriteText(target, text) {
    mkdirSync(dirname(target), { recursive: true });
    const temp = join(dirname(target), `.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${target.split(/[\\/]/).pop()}.tmp`);
    try {
        writeFileSync(temp, text);
        replaceFileWithRetry(temp, target);
    }
    catch (error) {
        rmSync(temp, { force: true });
        throw error;
    }
}
export function atomicWriteJson(target, value) {
    atomicWriteText(target, `${JSON.stringify(value, null, 2)}\n`);
}
function replaceFileWithRetry(temp, target) {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            renameSync(temp, target);
            return;
        }
        catch (error) {
            const code = error?.code;
            if (code !== "EPERM" && code !== "EEXIST") {
                throw error;
            }
            rmSync(target, { force: true });
            if (attempt === maxAttempts - 1) {
                throw error;
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15 * (attempt + 1));
        }
    }
}
//# sourceMappingURL=atomicWrite.js.map
import { isAbsolute, relative, resolve, sep } from "node:path";
export function resolveInsideRoot(root, userPath) {
    const normalizedInput = validatePathInput(userPath);
    const resolvedRoot = normalizeRoot(root);
    const candidate = isAbsolute(normalizedInput)
        ? resolve(normalizedInput)
        : resolve(resolvedRoot, normalizedInput);
    assertInsideRoot(resolvedRoot, candidate);
    return candidate;
}
export function resolveTrustedPath(root, userPath, options) {
    const normalizedInput = validatePathInput(userPath);
    if (options?.allowAbsolute === true && isAbsolute(normalizedInput)) {
        return resolve(normalizedInput);
    }
    return resolveInsideRoot(root, normalizedInput);
}
export function assertInsideRoot(root, resolvedPath) {
    const resolvedRoot = normalizeRoot(root);
    const candidate = resolve(resolvedPath);
    const relativePath = relative(resolvedRoot, candidate);
    const escaped = relativePath === ""
        ? false
        : relativePath === ".."
            || relativePath.startsWith(`..${sep}`)
            || relativePath.startsWith("../")
            || /^[A-Za-z]:/.test(relativePath);
    if (escaped) {
        throw new Error(`Path escapes trusted root: ${candidate}`);
    }
}
export function sanitizeFileNameSegment(input) {
    const value = validatePathInput(input);
    if (value === "." || value === "..") {
        throw new Error(`Invalid file name segment: ${input}`);
    }
    if (value.includes("/") || value.includes("\\")) {
        throw new Error(`File name segment must not contain path separators: ${input}`);
    }
    if (!/^[A-Za-z0-9._-]+$/.test(value)) {
        throw new Error(`Unsafe file name segment: ${input}`);
    }
    return value;
}
function validatePathInput(input) {
    if (typeof input !== "string" || input.trim().length === 0) {
        throw new Error("Path input must be a non-empty string.");
    }
    if (input.includes("\u0000")) {
        throw new Error("Path input must not contain NUL bytes.");
    }
    return input.trim();
}
function normalizeRoot(root) {
    if (typeof root !== "string" || root.trim().length === 0) {
        throw new Error("Trusted root must be a non-empty string.");
    }
    return resolve(root);
}
//# sourceMappingURL=safePath.js.map
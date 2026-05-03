import { createHash } from "node:crypto";
import { stableSerialize } from "./stableSerialize.js";
const SHA256_PREFIX = "sha256:";
export function stableHash(value) {
    return `${SHA256_PREFIX}${stableHexDigest(value)}`;
}
export function stableHexDigest(value) {
    return createHash("sha256")
        .update(stableSerialize(value), "utf8")
        .digest("hex");
}
export function stableTextHash(text) {
    return `${SHA256_PREFIX}${createHash("sha256").update(text, "utf8").digest("hex")}`;
}
export function shortStableId(prefix, value, length = 16) {
    const safeLength = Math.max(8, Math.min(length, 64));
    return `${prefix}_${stableHexDigest(value).slice(0, safeLength)}`;
}
//# sourceMappingURL=deterministic.js.map
import { createHash } from "node:crypto";
import { stableSerialize } from "./stableSerialize.js";

const SHA256_PREFIX = "sha256:";

export function stableHash(value: unknown): string {
  return `${SHA256_PREFIX}${stableHexDigest(value)}`;
}

export function stableHexDigest(value: unknown): string {
  return createHash("sha256")
    .update(stableSerialize(value), "utf8")
    .digest("hex");
}

export function stableTextHash(text: string): string {
  return `${SHA256_PREFIX}${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export function shortStableId(prefix: string, value: unknown, length = 16): string {
  const safeLength = Math.max(8, Math.min(length, 64));
  return `${prefix}_${stableHexDigest(value).slice(0, safeLength)}`;
}

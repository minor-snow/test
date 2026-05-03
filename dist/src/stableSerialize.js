/**
 * Stable Serialization
 *
 * ref: H-01 – Prohibits JSON.stringify for hash computation.
 * ref: H-04 – Serialization version must be tracked.
 *
 * Uses deterministic key-ordering serialization so that:
 *   { a: 1, b: 2 }  and  { b: 2, a: 1 }
 * produce the identical byte string.
 */
import stableStringify from "fast-json-stable-stringify";
/**
 * Current serialization version identifier.
 * ref: H-04 – every revision records this alongside the hash.
 */
export const SERIALIZATION_VERSION = "stable_json_v1";
/**
 * Deterministic JSON serialization.
 *
 * Contract:
 *   1. Keys are sorted lexicographically (deep).
 *   2. No trailing whitespace or newlines.
 *   3. Identical logical values always produce identical byte strings.
 *   4. undefined values are omitted (same as JSON.stringify behaviour).
 *
 * @param value – any JSON-serializable value
 * @returns deterministic string representation
 */
export function stableSerialize(value) {
    return stableStringify(value);
}
//# sourceMappingURL=stableSerialize.js.map
/**
 * P24: pantheon check
 *
 * Reads git diff, verifies against saved scope, writes report + feedback.
 * Each check creates attempts/attempt_N/ and updates latest in .pantheon/.
 */
export declare function cmdCheck(input: {
    repoRoot: string;
    baseRef?: string;
    headRef?: string;
    json?: boolean;
    redact?: boolean;
}): void;

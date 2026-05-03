/**
 * P30-11: Architecture CLI
 *
 * Commands:
 *   pantheon arch ingest <path>
 *   pantheon arch review [--arch-id <id>]
 *   pantheon arch term list [--arch-id <id>]
 *   pantheon arch term set "<term>" "<pattern>" [--arch-id <id>]
 *   pantheon arch term alias "<term>" "<alias>" [--arch-id <id>]
 *   pantheon arch term kind "<term>" <kind> [--arch-id <id>]
 *   pantheon arch map accept <claim_id> [--arch-id <id>]
 *   pantheon arch map reject <claim_id> --reason "<reason>" [--arch-id <id>]
 *   pantheon arch map set "<subject>" "<pattern>" [--arch-id <id>]
 *   pantheon arch map review-required "<subject>" "<pattern>" [--arch-id <id>]
 *   pantheon arch map forbidden "<subject>" "<pattern>" [--arch-id <id>]
 *   pantheon arch map must-not-depend "<subject>" "<object>" [--arch-id <id>]
 *   pantheon arch map external "<subject>" [--arch-id <id>]
 *   pantheon arch accept [--arch-id <id>]
 *   pantheon arch status
 *
 * ref: P30
 */
export declare function cmdArch(args: string[]): void;

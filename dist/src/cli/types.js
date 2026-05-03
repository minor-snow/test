/**
 * P24: Public Interface Types
 *
 * Stable public-facing types for the Pantheon CLI.
 * These types form the external contract — do not expose internal objects.
 */
export const DEFAULT_PANTHEON_CONFIG = {
    version: 1,
    protected: [".pantheon/**", ".cursor/**", ".git/**", "node_modules/**"],
    review_required: [],
    generated: [],
    path_roles: {},
    python: undefined,
};
//# sourceMappingURL=types.js.map
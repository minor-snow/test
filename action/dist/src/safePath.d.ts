export declare function resolveInsideRoot(root: string, userPath: string): string;
export declare function resolveTrustedPath(root: string, userPath: string, options?: {
    allowAbsolute?: boolean;
}): string;
export declare function assertInsideRoot(root: string, resolvedPath: string): void;
export declare function sanitizeFileNameSegment(input: string): string;

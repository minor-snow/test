export declare function getFlag(args: readonly string[], name: string): string | undefined;
export declare function getAllFlags(args: readonly string[], name: string): string[];
export declare function hasFlag(args: readonly string[], name: string): boolean;
export declare function requireFlag(args: readonly string[], name: string, message: string): string;
export declare function getPositional(args: readonly string[], index: number): string | undefined;
export declare function requirePositional(args: readonly string[], index: number, message: string): string;

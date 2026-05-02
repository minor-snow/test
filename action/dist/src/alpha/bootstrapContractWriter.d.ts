export interface GeneratedFile {
    path: string;
    content: string;
}
export interface BootstrapContractInput {
    repoRoot: string;
    policyVersion: string;
    generatedFiles: GeneratedFile[];
    packageNameOrSlug?: string;
}
export declare function writeBootstrapContract(input: BootstrapContractInput): void;

/**
 * P18: File Classifier
 *
 * Classifies changed files against the scoped implementation boundary.
 * Determines allowed, forbidden, protocol, and generated boundary status.
 *
 * ref: P18
 */
import type { ScopedImplementationBoundaryPackage } from "../scopedHandoff/types.js";
import type { ClassifiedChangedFile } from "./types.js";
export declare function normalizePath(filePath: string): string;
export declare function classifyChangedFile(filePath: string, scope: ScopedImplementationBoundaryPackage): ClassifiedChangedFile;
/**
 * Classify all changed files and deduplicate.
 */
export declare function classifyChangedFiles(files: string[], scope: ScopedImplementationBoundaryPackage): ClassifiedChangedFile[];

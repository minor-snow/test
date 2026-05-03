/**
 * P20a: ChangeContract Lite Validator
 *
 * Validates Lite contract structural integrity.
 * Rejects any lifecycle_status, result_events, or full ChangeContract fields.
 */
import type { ChangeContractLite, LiteValidationResult } from "./types.js";
export declare function validateChangeContractLite(contract: ChangeContractLite): LiteValidationResult;

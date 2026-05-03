/**
 * Data Model Projector — Room entities + Network DTOs
 *
 * ref: P11a-004
 *
 * All models, fields, and invariants are deterministic.
 * conflict_policy per field is derived from conflictProjector output.
 */
import type { Artifact } from "../types.js";
import type { DataModelSpec } from "./types.js";
export type DataModelProjectionResult = {
    models: DataModelSpec[];
    room_entity_count: number;
    network_dto_count: number;
    value_object_count: number;
    unknown_field_types: string[];
};
export declare function projectDataModels(architecture: Artifact, interfaceSpec: Artifact, moduleSpec: Artifact): DataModelProjectionResult;

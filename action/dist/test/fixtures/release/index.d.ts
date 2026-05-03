/**
 * Operator Fatigue Test Fixtures — Release Decision
 *
 * ref: P5-004
 *
 * 15 scenarios covering the full decision space.
 * Goal: test whether operator can maintain judgment quality
 * across consecutive sign-off decisions.
 */
import type { ResidualSnapshot, ReleaseDecisionType, ThreeLayerStatus } from "../../../src/cockpit/types.js";
export type ReleaseFixture = {
    id: string;
    name: string;
    description: string;
    three_layer: ThreeLayerStatus;
    residual: ResidualSnapshot;
    expected_decision: ReleaseDecisionType;
    /** Why this is the correct decision — operator should arrive at similar reasoning */
    expected_rationale_keywords: string[];
};
export declare const RELEASE_FIXTURES: ReleaseFixture[];

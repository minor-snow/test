import { describe, expect, it } from "vitest";
import { detectPythonSensitiveZones } from "../../../src/repoObservation/python/pythonSensitiveZoneDetector.js";

describe("pythonSensitiveZoneDetector migration precision", () => {
  it("does not treat immigration-like names as migrations", () => {
    const zones = detectPythonSensitiveZones({
      pythonPaths: ["app/immigration/service.py", "app/emigration/report.py"],
    });

    expect(zones.some(zone => zone.category === "schema_migration")).toBe(false);
  });

  it("still treats real migration directories as sensitive", () => {
    const zones = detectPythonSensitiveZones({
      pythonPaths: ["app/migrations/0001_initial.py", "alembic/versions/0002_add_user.py"],
    });

    const migrationZone = zones.find(zone => zone.category === "schema_migration");
    expect(migrationZone).toBeDefined();
    expect(migrationZone?.matched_paths).toContain("app/migrations/0001_initial.py");
  });
});

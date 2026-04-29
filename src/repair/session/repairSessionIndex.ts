import type { RepairSession, RepairSessionIndex } from "./repairSessionTypes.js";

export function createEmptyRepairSessionIndex(): RepairSessionIndex {
  return {
    schema_version: "repair_session_index@0.1.0",
    active_repairs: [],
    closed_repairs: [],
  };
}

export function upsertRepairSessionInIndex(
  index: RepairSessionIndex,
  session: RepairSession,
): RepairSessionIndex {
  const isClosed = session.status === "closed" || session.status === "abandoned";
  const active = index.active_repairs.filter(item => item.repair_id !== session.repair_id);
  const closed = index.closed_repairs.filter(item => item.repair_id !== session.repair_id);

  if (isClosed) {
    closed.push(session);
  } else {
    active.push(session);
  }

  return {
    schema_version: "repair_session_index@0.1.0",
    active_repairs: active.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    closed_repairs: closed.sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

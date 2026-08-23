import { describe, expect, it } from "vitest";
import { evaluateWorkerEligibility } from "./eligibility";

const ready = { workerStatus: "active", venueStatus: "active", associationStatus: "verified", settlementReadiness: "ready", workerTermsAccepted: true, endpointStatus: "active" } as const;

describe("worker eligibility", () => {
  it("allows a fully eligible worker", () => expect(evaluateWorkerEligibility(ready)).toEqual({ eligible: true, blockingReasons: [] }));
  it("fails closed when settlement readiness is missing", () => {
    const result = evaluateWorkerEligibility({ ...ready, settlementReadiness: "pending" });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toContain("settlement_not_ready");
  });
  it("fails closed when venue is suspended", () => expect(evaluateWorkerEligibility({ ...ready, venueStatus: "suspended" }).eligible).toBe(false));
});

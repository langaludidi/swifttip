import { describe, expect, it } from "vitest";
import { canTransitionPayment, canTransitionSettlement } from "./states";

describe("financial state guards", () => {
  it("keeps payment success distinct from settlement", () => {
    expect(canTransitionPayment("pending", "succeeded")).toBe(true);
    expect(canTransitionSettlement("pending", "succeeded")).toBe(true);
  });
  it("does not allow arbitrary failed payment resurrection", () => {
    expect(canTransitionPayment("failed", "succeeded")).toBe(false);
  });
  it("allows settlement retry after provider failure", () => {
    expect(canTransitionSettlement("failed", "processing")).toBe(true);
  });
});

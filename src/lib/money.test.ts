import { describe, expect, it } from "vitest";
import { calculateTipPricing, contributionCents, percentageCents, WORKING_PRICING } from "./money";

describe("SwiftTip money architecture", () => {
  it("uses deterministic half-up basis point rounding", () => {
    expect(percentageCents(4999, 500)).toBe(250);
    expect(percentageCents(1000, 300)).toBe(30);
  });

  it.each([
    [500, 115, 615, 25, 475, 140],
    [1000, 130, 1130, 50, 950, 180],
    [2000, 160, 2160, 100, 1900, 260],
    [5000, 250, 5250, 250, 4750, 500],
    [10000, 400, 10400, 500, 9500, 900],
    [20000, 500, 20500, 1000, 19000, 1500],
    [50000, 500, 50500, 2500, 47500, 3000]
  ])("calculates the approved working hypothesis for %i cents", (gross, customerFee, total, workerFee, workerNet, revenue) => {
    const p = calculateTipPricing(gross);
    expect(p.customerFeeCents).toBe(customerFee);
    expect(p.customerTotalCents).toBe(total);
    expect(p.workerFeeCents).toBe(workerFee);
    expect(p.workerNetCents).toBe(workerNet);
    expect(p.swifttipGrossRevenueCents).toBe(revenue);
  });

  it("applies the R5 customer fee cap", () => {
    expect(calculateTipPricing(20000).customerFeeCents).toBe(500);
    expect(calculateTipPricing(50000).customerFeeCents).toBe(500);
  });

  it("calculates contribution separately from gross revenue", () => {
    const p = calculateTipPricing(5000);
    expect(contributionCents(p, 290)).toBe(210);
  });

  it("rejects amounts outside configured bounds", () => {
    expect(() => calculateTipPricing(WORKING_PRICING.minimumGratuityCents - 1)).toThrow();
    expect(() => calculateTipPricing(WORKING_PRICING.maximumGratuityCents + 1)).toThrow();
  });
});

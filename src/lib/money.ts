export type PricingConfig = {
  workerFeeBps: number;
  customerFixedFeeCents: number;
  customerFeeBps: number;
  customerFeeCapCents: number | null;
  minimumGratuityCents: number;
  maximumGratuityCents: number;
};

export type TipPricing = {
  grossGratuityCents: number;
  customerFeeCents: number;
  customerTotalCents: number;
  workerFeeCents: number;
  workerNetCents: number;
  swifttipGrossRevenueCents: number;
};

export type DirectCostAssumptions = {
  providerVariableBps: number;
  providerFixedCents: number;
  splitCostCents: number;
  allocatedPayoutCostCents: number;
  refundChargebackReserveBps: number;
  supportReconciliationCostCents: number;
};

export type ContributionEstimate = {
  providerVariableCostCents: number;
  refundChargebackReserveCents: number;
  totalDirectCostCents: number;
  contributionCents: number;
  contributionMarginBps: number | null;
};

export const WORKING_PRICING: PricingConfig = {
  workerFeeBps: 500,
  customerFixedFeeCents: 100,
  customerFeeBps: 300,
  customerFeeCapCents: 500,
  minimumGratuityCents: 500,
  maximumGratuityCents: 50_000
};

export function percentageCents(amountCents: number, bps: number): number {
  if (!Number.isInteger(amountCents) || !Number.isInteger(bps)) throw new Error("Money and basis points must be integers");
  if (amountCents < 0 || bps < 0) throw new Error("Money and basis points cannot be negative");
  return Math.floor((amountCents * bps + 5000) / 10_000);
}

export function calculateTipPricing(grossGratuityCents: number, config: PricingConfig = WORKING_PRICING): TipPricing {
  if (!Number.isInteger(grossGratuityCents)) throw new Error("Gratuity must be supplied in integer cents");
  if (grossGratuityCents < config.minimumGratuityCents) throw new Error("Gratuity is below the configured minimum");
  if (grossGratuityCents > config.maximumGratuityCents) throw new Error("Gratuity exceeds the configured maximum");

  const workerFeeCents = percentageCents(grossGratuityCents, config.workerFeeBps);
  const variableCustomerFee = percentageCents(grossGratuityCents, config.customerFeeBps);
  const uncappedCustomerFee = config.customerFixedFeeCents + variableCustomerFee;
  const customerFeeCents = config.customerFeeCapCents === null ? uncappedCustomerFee : Math.min(uncappedCustomerFee, config.customerFeeCapCents);
  const workerNetCents = grossGratuityCents - workerFeeCents;
  const customerTotalCents = grossGratuityCents + customerFeeCents;
  const swifttipGrossRevenueCents = workerFeeCents + customerFeeCents;

  return { grossGratuityCents, customerFeeCents, customerTotalCents, workerFeeCents, workerNetCents, swifttipGrossRevenueCents };
}

export function contributionCents(pricing: TipPricing, providerDirectCostCents: number): number {
  if (!Number.isInteger(providerDirectCostCents) || providerDirectCostCents < 0) throw new Error("Provider cost must be a non-negative integer number of cents");
  return pricing.swifttipGrossRevenueCents - providerDirectCostCents;
}

export function estimateContribution(pricing: TipPricing, assumptions: DirectCostAssumptions): ContributionEstimate {
  for (const value of Object.values(assumptions)) {
    if (!Number.isInteger(value) || value < 0) throw new Error("Cost assumptions must be non-negative integers");
  }
  if (assumptions.providerVariableBps > 10_000 || assumptions.refundChargebackReserveBps > 10_000) {
    throw new Error("Cost basis points cannot exceed 10000");
  }
  const providerVariableCostCents = percentageCents(pricing.customerTotalCents, assumptions.providerVariableBps);
  const refundChargebackReserveCents = percentageCents(pricing.grossGratuityCents, assumptions.refundChargebackReserveBps);
  const totalDirectCostCents = providerVariableCostCents + assumptions.providerFixedCents + assumptions.splitCostCents + assumptions.allocatedPayoutCostCents + refundChargebackReserveCents + assumptions.supportReconciliationCostCents;
  const estimatedContributionCents = pricing.swifttipGrossRevenueCents - totalDirectCostCents;
  const contributionMarginBps = pricing.swifttipGrossRevenueCents === 0 ? null : Math.round((estimatedContributionCents * 10_000) / pricing.swifttipGrossRevenueCents);
  return { providerVariableCostCents, refundChargebackReserveCents, totalDirectCostCents, contributionCents: estimatedContributionCents, contributionMarginBps };
}

export function formatZar(cents: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(cents / 100);
}

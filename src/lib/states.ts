export type PaymentState = "created" | "pending" | "succeeded" | "failed" | "expired" | "cancelled" | "reversed";
export type SettlementState = "pending" | "processing" | "succeeded" | "failed" | "held" | "reversed" | "exception";

const paymentTransitions: Record<PaymentState, readonly PaymentState[]> = {
  created: ["pending", "failed", "expired", "cancelled"],
  pending: ["succeeded", "failed", "expired", "cancelled"],
  succeeded: ["reversed"],
  failed: [], expired: [], cancelled: [], reversed: []
};
const settlementTransitions: Record<SettlementState, readonly SettlementState[]> = {
  pending: ["processing", "succeeded", "failed", "held", "exception"],
  processing: ["succeeded", "failed", "held", "exception"],
  succeeded: ["reversed", "exception"],
  failed: ["processing", "exception"],
  held: ["processing", "succeeded", "failed", "exception"],
  reversed: ["exception"],
  exception: ["processing", "succeeded", "failed"]
};
export function canTransitionPayment(from: PaymentState, to: PaymentState) { return paymentTransitions[from].includes(to); }
export function canTransitionSettlement(from: SettlementState, to: SettlementState) { return settlementTransitions[from].includes(to); }

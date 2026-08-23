# Payment Provider Integration Gate

No provider adapter should be implemented until the chosen provider confirms the SwiftTip gratuity use case and funds architecture in writing.

The implementation team must record answers to at least the following:

1. Is direct individual-worker gratuity processing permitted?
2. Who is merchant of record?
3. Can the provider split/route settlement at source without SwiftTip taking custody of worker net entitlement?
4. Does each worker require a provider subaccount/connected account?
5. What worker KYC fields/documents are required?
6. Can SwiftTip define both a worker success-fee entitlement and customer service-fee entitlement?
7. Who bears processing, split and settlement fees?
8. What is the actual fee schedule including VAT where applicable?
9. What event proves payment success?
10. What event/evidence proves worker settlement?
11. How are failed settlements recovered?
12. How are settlement destination changes verified?
13. What is the refund flow before and after worker settlement?
14. Who bears a successful chargeback after worker settlement?
15. Are reserves/holds applied?
16. Which webhook signing algorithm and replay/idempotency semantics apply?
17. Can all relevant payment, settlement, fee, refund and dispute records be retrieved for reconciliation?

Until these are answered, `PAYMENTS_ENABLED=false` remains mandatory.

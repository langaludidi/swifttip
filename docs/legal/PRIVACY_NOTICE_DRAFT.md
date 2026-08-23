# SwiftTip Privacy Notice — Draft v0.1

**Status: DRAFT / NOT PUBLISHED / NOT IN FORCE**

This document is a pre-live drafting instrument for POPIA, security, product and provider review. It must not be presented as SwiftTip’s operative Privacy Notice until an approved, published and effective version exists in the SwiftTip legal-version system.

## 1. Who is responsible for your personal information

SwiftTip is operated by **[LEGAL ENTITY NAME TO BE CONFIRMED]**, which is intended to act as the responsible party for the personal information it determines the purpose and means of processing.

Before publication, this section must contain:

- full legal entity name;
- registration number where applicable;
- physical/business address;
- Information Officer details;
- privacy contact details; and
- any required PAIA/Information Regulator references.

## 2. Scope of this Notice

This Notice explains how SwiftTip processes personal information relating to:

- Workers;
- Venue Users and Venue representatives;
- Customers making gratuity transactions;
- support contacts;
- authorised SwiftTip administrators; and
- other persons whose information is lawfully required to operate, secure or support the service.

The intended MVP is designed to minimise Customer identity collection and does not require a Customer account merely to tip a Worker.

## 3. Personal information we may collect

### 3.1 Workers

SwiftTip may process:

- legal first name and surname;
- chosen public/display first name;
- mobile number and authentication records;
- identity-verification information;
- verification evidence and document metadata;
- profile photograph;
- Worker role;
- Venue association and history;
- Payment Provider onboarding/Settlement readiness indicators;
- transaction, fee and Settlement records;
- support communications;
- security and audit events; and
- device/session information reasonably necessary for security.

SwiftTip’s public Worker profile is intentionally narrower than the private Worker record.

### 3.2 Venue Users and representatives

SwiftTip may process:

- name;
- business email address and/or other approved authentication identifier;
- Venue and role;
- invitation and membership status;
- Worker-association decisions;
- support communications;
- security/session information; and
- audit records of material Venue actions.

### 3.3 Customers

SwiftTip seeks to minimise Customer personal information. Depending on the final payment flow, SwiftTip may process or receive:

- transaction amount and reference;
- selected Worker and Venue;
- Payment Provider transaction identifiers and status;
- limited payment metadata supplied by the Payment Provider;
- fraud/security signals;
- receipt/status token;
- optional contact information if the Customer asks for a receipt or support; and
- support communications.

SwiftTip should not store full card numbers, CVV values or other payment credentials unless the final architecture expressly requires and lawfully supports that processing. The intended model is for sensitive payment credentials to be handled by the approved Payment Provider.

### 3.4 Administrators and support personnel

SwiftTip may process account identifiers, role assignments, MFA status, administrative actions, case handling and audit events needed to operate privileged functions securely.

## 4. Where information comes from

Personal information may be collected:

- directly from the person;
- from an authorised Venue representative confirming a Worker relationship;
- from the Payment Provider for payment, KYC/Settlement readiness and reconciliation purposes;
- from system-generated security, transaction and audit events; or
- from another lawful source where appropriate and properly disclosed.

Where information is not collected directly from the data subject, SwiftTip will address any notification obligations required by applicable law.

## 5. Why SwiftTip processes personal information

SwiftTip may process personal information to:

1. create and secure user accounts;
2. verify Worker identity;
3. verify Worker–Venue relationships;
4. present the intended Worker accurately to Customers;
5. create, process and reconcile gratuity transactions;
6. support Payment Provider onboarding and Settlement readiness;
7. maintain receipts and transaction records;
8. detect fraud, abuse, account compromise and duplicate payment activity;
9. resolve support cases, refunds, disputes and Settlement exceptions;
10. maintain auditability and financial integrity;
11. comply with legal, regulatory, accounting or lawful provider obligations;
12. protect SwiftTip, Workers, Customers, Venues and the payment ecosystem; and
13. analyse operational performance using appropriately minimised or aggregated information where possible.

Marketing processing, if introduced later, should be separately identified and must not be bundled into transaction processing without an appropriate lawful basis.

## 6. Mandatory and voluntary information

Some information is necessary to provide a specific SwiftTip function.

For example, a Worker who does not provide the information required for identity verification, Venue confirmation, secure authentication or provider Settlement readiness may not be eligible for activation.

A Customer ordinarily does not need to create an account to make a gratuity, but the information required by the Payment Provider to process a payment remains necessary for that transaction.

Where providing information is optional, SwiftTip should make that clear at the point of collection.

## 7. Consequences of not providing required information

If required information is not provided or cannot be verified:

- a Worker account may remain draft, pending or suspended;
- a Venue membership may not activate;
- a payment may not be processed;
- a support request may be harder or impossible to resolve; or
- a regulated/provider process may not be completed.

SwiftTip should not collect unnecessary personal information merely because another required field is missing.

## 8. Who SwiftTip may share information with

SwiftTip may share limited personal information with categories of recipients such as:

- the approved Payment Provider and its regulated banking/payment partners;
- hosting, database and security providers;
- communications providers used for OTP, email or service notifications;
- authorised Venues, but only within the narrow Venue visibility boundary;
- professional advisers, auditors or insurers where reasonably necessary;
- competent regulators, law-enforcement agencies, courts or other authorities where legally required; and
- service providers supporting customer or Worker support, subject to appropriate safeguards.

SwiftTip should disclose only the information reasonably necessary for the relevant purpose.

A Venue should not receive Worker identity documents, banking details or private Payment Provider KYC through the ordinary Venue interface.

## 9. Payment Provider relationship

The selected Payment Provider may process personal information under its own regulatory and contractual responsibilities.

The final Privacy Notice must distinguish clearly between:

- information for which SwiftTip determines processing purposes;
- information SwiftTip processes on behalf of another party, if any;
- information the Payment Provider processes as an independent responsible party; and
- information exchanged between the parties for payment, KYC, Settlement, fraud, refund, dispute or reconciliation purposes.

The final allocation cannot be completed until the provider contract and data flows are confirmed.

## 10. Cross-border processing

SwiftTip may use technology or service providers that process or store information outside South Africa.

Before publication, SwiftTip must identify the material cross-border data flows and confirm the safeguards relied upon for any transfer of personal information outside South Africa.

No draft statement should imply that all data remains in South Africa unless that has been technically and contractually verified.

## 11. Information security

SwiftTip applies security controls appropriate to the nature of the information and the risks involved. The MVP architecture includes or is designed to include:

- role-based access control;
- Row Level Security in the application database;
- MFA for privileged administrators;
- secure OTP authentication flows;
- server-authoritative financial calculations;
- signed/idempotent provider webhook processing;
- restricted storage for identity-verification evidence;
- audit logging for material actions;
- separation of public Worker information from private records; and
- payment and operational kill switches where required.

No security control can eliminate all risk. SwiftTip will maintain incident-response processes appropriate to the live service.

## 12. Retention

SwiftTip will not retain personal information indefinitely merely because storage is available.

Retention periods should be based on the purpose, legal obligations, transaction/accounting requirements, fraud and dispute windows, provider obligations, security needs and defensible record-keeping requirements.

Before publication, SwiftTip must approve a retention schedule covering at least:

- Worker identity and verification evidence;
- account records;
- Venue association history;
- completed transaction and Settlement records;
- refunds and disputes;
- support cases;
- audit/security logs;
- anonymous Customer receipt/status data; and
- failed or abandoned onboarding records.

Where information is no longer required and no lawful retention basis remains, it should be deleted, destroyed or de-identified in accordance with the approved retention process.

## 13. Accuracy

SwiftTip will take reasonably practicable steps to keep personal information complete, accurate, not misleading and updated where necessary for the purpose for which it is processed.

Users should keep account and relationship information current and should report material inaccuracies through the available profile or support process.

## 14. Your rights

Subject to applicable law and legitimate limitations, a data subject may have rights to:

- ask whether SwiftTip holds personal information about them;
- request access to personal information;
- request correction or deletion where appropriate;
- object to certain processing;
- request information about the identity of third parties who have had access where applicable;
- complain to SwiftTip; and
- complain to the Information Regulator where entitled to do so.

The final Notice must provide the practical request channels and Information Regulator contact information current at the date of publication.

## 15. Automated decisions and profiling

The MVP is not intended to use automated decision-making to rank Workers, create public performance scores or determine employment outcomes.

SwiftTip may use automated risk signals to protect accounts, payments or the platform. Where a decision has a material effect on a person, SwiftTip should maintain an appropriate review process where required by law or good operational practice.

## 16. Children

SwiftTip is not currently designed as a service directed at children.

Before publication, the minimum age/eligibility position for Workers, Customers and Venue Users must be confirmed and aligned with the final legal and payment-provider requirements.

## 17. Cookies, analytics and device information

The final live website/application may use strictly necessary cookies or similar technologies for security, session management and service operation.

Any analytics, advertising or non-essential tracking must be documented separately before use. This draft does not authorise behavioural advertising or unnecessary Customer tracking.

## 18. Direct marketing

A gratuity transaction does not automatically enrol a Customer in direct marketing.

If SwiftTip introduces marketing communications, it must implement the required consent/opt-out and record-keeping controls under applicable South African law and update this Notice where necessary.

## 19. Data breaches and security incidents

SwiftTip will maintain an incident process for suspected loss, unauthorised access, compromise or other security incidents involving personal information.

Where notification to affected data subjects or the Information Regulator is legally required, SwiftTip will follow the applicable legal process.

Final incident contact information must be added before publication.

## 20. Changes to this Notice

Published Privacy Notice versions are immutable records in SwiftTip’s legal-version system. Material changes require a new version rather than silent alteration of an existing published notice.

Where appropriate, SwiftTip will notify affected users of a material change.

## 21. Contact and complaints

Before publication, insert:

- Responsible Party legal name;
- Information Officer name/contact;
- privacy email address;
- physical/legal notices address;
- data-subject request process; and
- current Information Regulator complaint details.

---

## Publication blockers

This draft must not be approved for publication until the following are resolved:

1. Responsible Party legal identity, registration and physical address.
2. Information Officer identity, registration/status and contact information.
3. Final data inventory and lawful processing basis by purpose.
4. Final Payment Provider and data-sharing role allocation.
5. Material subprocessors/service providers and cross-border locations/safeguards.
6. Approved retention schedule.
7. Final OTP/email/SMS provider data flows.
8. Final analytics/cookie configuration and consent requirements.
9. Final data-subject request and complaint procedure.
10. Final age/children position.
11. Incident-response and breach-notification contacts.
12. Confirmation that the live application’s actual data flows match this Notice before publication.

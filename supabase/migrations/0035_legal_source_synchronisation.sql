-- SwiftTip MVP v3 — make the repository legal drafts and database versions one controlled source.
-- All affected documents remain DRAFT and UNPUBLISHED.

alter table public.terms_versions
  add column if not exists source_repository text,
  add column if not exists source_path text,
  add column if not exists source_blob_sha text,
  add column if not exists source_bytes bigint,
  add column if not exists source_synced_at timestamptz;

alter table public.terms_versions drop constraint if exists terms_versions_source_bytes_check;
alter table public.terms_versions add constraint terms_versions_source_bytes_check
  check (source_bytes is null or source_bytes > 0);

-- Worker and Venue source texts differed only by an extra trailing newline in the seed.
update public.terms_versions
set content_body = regexp_replace(content_body, E'\n+$', E'\n'),
    content_hash = encode(extensions.digest(convert_to(regexp_replace(content_body, E'\n+$', E'\n'),'UTF8'),'sha256'),'hex'),
    source_repository='langaludidi/swifttip',
    source_path='docs/legal/WORKER_TERMS_DRAFT.md',
    source_blob_sha='443e7ef12082f5d07c0a24a23a0587aa0660c074',
    source_bytes=12894,
    source_synced_at=now()
where terms_type='worker_terms' and version_code='v0.1-draft' and review_status='draft' and published_at is null;

update public.terms_versions
set content_body = regexp_replace(content_body, E'\n+$', E'\n'),
    content_hash = encode(extensions.digest(convert_to(regexp_replace(content_body, E'\n+$', E'\n'),'UTF8'),'sha256'),'hex'),
    source_repository='langaludidi/swifttip',
    source_path='docs/legal/VENUE_TERMS_DRAFT.md',
    source_blob_sha='318acf8fbee87c291830ac239f2a7151793545d1',
    source_bytes=12132,
    source_synced_at=now()
where terms_type='venue_terms' and version_code='v0.1-draft' and review_status='draft' and published_at is null;

do $$
declare v_body text := $customer$
# SwiftTip Customer Transaction Terms — Draft v0.1

**Status: DRAFT / NOT PUBLISHED / NOT IN FORCE**

This document is a pre-live drafting instrument for legal, consumer-protection and payment-provider review. It must not be presented as operative Customer terms until an approved, published and effective version exists in the SwiftTip legal-version system.

## 1. What SwiftTip is

SwiftTip is a digital gratuity platform operated by **[LEGAL ENTITY NAME TO BE CONFIRMED]**.

SwiftTip enables a Customer to identify a verified individual Worker and choose to send that Worker a voluntary digital gratuity.

SwiftTip is not intended to operate a stored-value Customer wallet or hold a Worker’s gratuity balance in the MVP architecture.

## 2. Definitions

In these Terms:

- **Customer** means the person making the payment.
- **Worker** means the verified person selected to receive the gratuity.
- **Venue** means the participating business or location associated with the Worker.
- **Gratuity** means the amount voluntarily designated by the Customer for the Worker.
- **Customer Service Fee** means the separately disclosed SwiftTip service fee, if applicable under the current approved Pricing Version.
- **Customer Total** means the Gratuity plus the Customer Service Fee shown before payment.
- **Payment Provider** means the approved third-party provider that processes the payment.

## 3. Voluntary gratuity

A SwiftTip gratuity is voluntary unless the Customer is clearly told otherwise before payment under a different approved product.

The Customer chooses whether to tip and chooses the amount, subject to configured minimum, maximum and fraud-prevention controls.

The Worker, Venue and SwiftTip must not misrepresent a voluntary SwiftTip gratuity as compulsory.

## 4. Confirm the Worker before paying

Before the Customer selects an amount, SwiftTip is designed to show a limited Worker identity confirmation, which may include:

- first name;
- photograph where available;
- role;
- Venue; and
- SwiftTip verification indicator.

The Customer should confirm that the displayed Worker is the intended recipient before continuing.

## 5. Price and fee disclosure

Before payment, SwiftTip must show the Customer a clear monetary breakdown containing at least:

1. the Gratuity;
2. the Customer Service Fee, if any; and
3. the Customer Total to be charged.

The Customer Total shown immediately before payment is the amount the Customer authorises, subject only to corrections required by law or an expressly disclosed provider process.

SwiftTip must not silently add a payment-method surcharge after the Customer has chosen the Gratuity.

The Customer Service Fee is intended to be a genuine SwiftTip service fee and not a penalty for selecting a card or other particular payment method. The final wording and payment-provider treatment of this fee remain publication blockers.

## 6. Payment processing

Payments are processed through the approved Payment Provider.

SwiftTip may redirect the Customer to a provider-hosted payment flow or otherwise use provider payment components.

A browser return page, redirect parameter or visual success message from the Customer’s device does not by itself establish that payment succeeded. SwiftTip records payment success only when the canonical provider/server evidence confirms it.

## 7. Payment received is not the same as Worker Settlement

If SwiftTip confirms that the Customer’s payment has been received, this means the Customer payment has been confirmed by the platform’s canonical payment evidence.

It does **not** necessarily mean that the Worker’s bank or provider Settlement has already completed.

SwiftTip will avoid describing the Worker’s Settlement as complete unless the relevant provider/reconciliation evidence supports that status.

## 8. Worker allocation

The intended commercial architecture is that the Worker receives the Gratuity less the separately disclosed Worker Success Fee agreed between SwiftTip and the Worker.

The Customer Service Fee is separate from the Gratuity.

The Customer is not asked to manage the Worker’s Settlement and the Venue is not intended to redistribute the Worker’s SwiftTip gratuity in the MVP model.

## 9. No Customer account required for ordinary tipping

The MVP is designed so that a Customer can ordinarily tip without creating a SwiftTip account.

SwiftTip may create an anonymous transaction record and a private receipt/status token so the Customer can revisit the receipt without a persistent Customer profile.

The Customer should keep any private receipt link secure because possession of the private token may permit access to limited transaction information.

## 10. Receipts

After a confirmed transaction, SwiftTip may provide an electronic receipt or status page showing information such as:

- SwiftTip transaction reference;
- Worker first name and Venue;
- Gratuity;
- Customer Service Fee;
- Customer Total; and
- payment status.

A receipt does not expose the Worker’s banking information, Payment Provider KYC or private identity documentation.

## 11. High-value and error-prevention controls

SwiftTip may require the Customer to reconfirm an unusually high gratuity amount, including by presenting the amount prominently or in words.

SwiftTip may also reject amounts outside configured transaction limits.

These controls are intended to reduce accidental or fraudulent payments and do not create a guarantee that every Customer error can be reversed after payment.

## 12. Refunds and mistaken payments

A Customer who believes a payment was made in error, duplicated, unauthorised or materially misdirected should contact SwiftTip support promptly using the transaction reference or receipt link where available.

The final refund policy, including the treatment of fees and the circumstances in which a completed gratuity may be reversible after Worker Settlement, is not yet approved.

SwiftTip must not publish a final version until the Payment Provider’s actual refund mechanics, timing, fees and post-Settlement implications are known.

Nothing in these Terms is intended to limit rights a Customer may have under applicable law or the rules governing the Customer’s payment instrument.

## 13. Card disputes and chargebacks

A Customer may have rights through the card issuer or Payment Provider in relation to unauthorised or disputed transactions.

The existence of a card dispute or chargeback process does not mean every dissatisfaction with service at a Venue entitles the Customer to reverse a voluntary gratuity.

The final dispute wording must align with the Payment Provider’s rules and applicable South African consumer law before publication.

## 14. Payment failure or uncertain status

If payment fails, SwiftTip should not record a successful gratuity merely because the Customer attempted payment.

If the status is uncertain, SwiftTip may display a processing or pending state while it reconciles provider evidence.

The Customer should avoid repeatedly resubmitting the same payment while a transaction remains uncertain unless SwiftTip clearly instructs the Customer to retry.

## 15. Duplicate payments

SwiftTip uses idempotency and reconciliation controls intended to reduce duplicate transactions.

If more than one provider attempt nevertheless succeeds, SwiftTip preserves the provider evidence, designates only the economically operative attempt for the intended Tip allocation, and treats additional success as an exception requiring reconciliation and, where appropriate, refund handling.

## 16. Privacy

SwiftTip processes limited Customer information needed to create, process, secure, reconcile and support the transaction.

The Customer should review the SwiftTip Privacy Notice for details about information categories, purposes, recipients, retention, security, cross-border processing where applicable and data-subject rights.

The MVP does not require a marketing profile merely because a Customer tips a Worker.

## 17. Electronic contracting

These Terms may be presented electronically.

The relevant version is tied to the transaction and recorded for auditability. SwiftTip must make the applicable published version reasonably accessible for later reference.

## 18. Third-party services

SwiftTip depends on third-party services including the Payment Provider, banking/card infrastructure, hosting and communications systems.

SwiftTip will operate its own service with reasonable care but cannot guarantee uninterrupted operation of systems outside its control.

## 19. Prohibited use

A Customer must not use SwiftTip to:

- make unlawful payments;
- test stolen or unauthorised payment credentials;
- conduct sham or collusive transactions;
- manipulate pilot or Worker statistics;
- harass or impersonate a Worker; or
- interfere with security, payment or reconciliation controls.

## 20. Complaints and support

SwiftTip will provide an appropriate support route for transaction-related questions.

Final legal notices, consumer complaint channels and any applicable external ombudsman/regulatory route must be inserted before publication once the SwiftTip legal entity and provider responsibilities are confirmed.

## 21. Liability framework — draft position

SwiftTip is responsible for operating its platform with reasonable care and for accurately applying the pricing and transaction logic it controls.

SwiftTip does not control a Customer’s bank, card issuer, the Payment Provider, a Venue’s service performance or external communications networks.

Any final limitation or exclusion of liability must be reviewed for compliance with South African consumer law and must not exclude statutory rights or liability that cannot lawfully be excluded.

## 22. Governing law

The intended governing law is the law of the Republic of South Africa, subject to mandatory consumer rights and jurisdiction that cannot lawfully be excluded.

---

## Publication blockers

This draft must not be approved for publication until the following are resolved:

1. SwiftTip legal entity, business address and Customer support/legal-notices details.
2. Approved Payment Provider and merchant/acquiring structure.
3. Provider and legal approval of the Customer Service Fee wording and collection method.
4. Final Pricing Version and displayed fee calculation.
5. Refund, fee-refund, reversal and post-Settlement chargeback mechanics.
6. Confirmation of applicable ECTA/CPA consumer disclosures and any cooling-off implications for the final transaction design.
7. Final external complaint and dispute channels.
8. Final liability wording and provider-dependent service disclosures.
9. Confirmation that Customer-facing screens show the Gratuity, service fee and Customer Total before payment and do not impose a card-payment surcharge.
$customer$;
begin
  update public.terms_versions
  set content_body=v_body,
      content_hash=encode(extensions.digest(convert_to(v_body,'UTF8'),'sha256'),'hex'),
      source_repository='langaludidi/swifttip',
      source_path='docs/legal/CUSTOMER_TRANSACTION_TERMS_DRAFT.md',
      source_blob_sha='6ca7982a52ccb1ebda47d9a70276da93465e0048',
      source_bytes=10859,
      source_synced_at=now()
  where terms_type='customer_transaction_terms' and version_code='v0.1-draft' and review_status='draft' and published_at is null;
end$$;

do $$
declare v_body text := $privacy$
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
$privacy$;
begin
  update public.terms_versions
  set content_body=v_body,
      content_hash=encode(extensions.digest(convert_to(v_body,'UTF8'),'sha256'),'hex'),
      source_repository='langaludidi/swifttip',
      source_path='docs/legal/PRIVACY_NOTICE_DRAFT.md',
      source_blob_sha='6ce7eaed8dfe0f565c6e15881be8bd53aeb0d1bf',
      source_bytes=14023,
      source_synced_at=now()
  where terms_type='privacy_notice' and version_code='v0.1-draft' and review_status='draft' and published_at is null;
end$$;

-- Fail the migration if the database copy does not exactly match the expected source byte lengths.
do $$
declare v_bad integer;
begin
  select count(*) into v_bad
  from public.terms_versions
  where version_code='v0.1-draft'
    and source_repository='langaludidi/swifttip'
    and octet_length(content_body)<>source_bytes;
  if v_bad<>0 then raise exception 'Legal source synchronisation byte-length verification failed for % document(s)',v_bad; end if;
end$$;

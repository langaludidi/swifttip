// TODO(needs legal/compliance sign-off before real workers upload real IDs):
// - Which document types are actually required (this list is an engineering
//   placeholder, not a decided requirement)
// - Acceptable file formats/quality rules
// - POPIA-compliant retention period and deletion process for KYC documents
// None of that exists yet. This file only defines what the upload UI offers
// today — nothing here should be read as final policy.
export const KYC_DOCUMENT_TYPES = [
  { key: 'id_front', label: 'ID document (front)' },
  { key: 'id_back', label: 'ID document (back)' },
  { key: 'proof_of_address', label: 'Proof of address' },
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // basic upload hygiene, not a policy decision

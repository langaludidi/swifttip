// AUTO-GENERATED FROM CANONICAL SUPABASE PROJECT bxtfcfuehqljedxwykfk.
// Generated after migration mvp_v3_0052_pricing_review_actor_indexes on 2026-08-24.
// Do not hand-edit. Regenerate from the canonical project after every migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_memberships: {
        Row: {
          admin_role: string
          admin_status: string
          granted_at: string
          granted_by: string | null
          id: string
          mfa_required: boolean
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          admin_role: string
          admin_status?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          mfa_required?: boolean
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          admin_role?: string
          admin_status?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          mfa_required?: boolean
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string
          dispute_reason: string | null
          dispute_status: string
          disputed_amount_cents: number
          evidence_due_at: string | null
          evidence_submitted_at: string | null
          financial_outcome_cents: number | null
          id: string
          opened_at: string
          payment_attempt_id: string
          provider_code: string
          provider_dispute_ref: string
          resolved_at: string | null
          tip_id: string
        }
        Insert: {
          created_at?: string
          dispute_reason?: string | null
          dispute_status: string
          disputed_amount_cents: number
          evidence_due_at?: string | null
          evidence_submitted_at?: string | null
          financial_outcome_cents?: number | null
          id?: string
          opened_at: string
          payment_attempt_id: string
          provider_code: string
          provider_dispute_ref: string
          resolved_at?: string | null
          tip_id: string
        }
        Update: {
          created_at?: string
          dispute_reason?: string | null
          dispute_status?: string
          disputed_amount_cents?: number
          evidence_due_at?: string | null
          evidence_submitted_at?: string | null
          financial_outcome_cents?: number | null
          id?: string
          opened_at?: string
          payment_attempt_id?: string
          provider_code?: string
          provider_dispute_ref?: string
          resolved_at?: string | null
          tip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_allocations: {
        Row: {
          allocation_status: string
          allocation_type: string
          amount_cents: number
          beneficiary_type: string
          created_at: string
          currency: string
          id: string
          tip_id: string
          worker_id: string | null
        }
        Insert: {
          allocation_status?: string
          allocation_type: string
          amount_cents: number
          beneficiary_type: string
          created_at?: string
          currency?: string
          id?: string
          tip_id: string
          worker_id?: string | null
        }
        Update: {
          allocation_status?: string
          allocation_type?: string
          amount_cents?: number
          beneficiary_type?: string
          created_at?: string
          currency?: string
          id?: string
          tip_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_allocations_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_allocations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_path: string | null
          body: string | null
          channel: string
          created_at: string
          dedupe_key: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          notification_status: string
          notification_type: string
          read_at: string | null
          recipient_user_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_at: string | null
          title: string | null
        }
        Insert: {
          action_path?: string | null
          body?: string | null
          channel: string
          created_at?: string
          dedupe_key?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          notification_status?: string
          notification_type: string
          read_at?: string | null
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          title?: string | null
        }
        Update: {
          action_path?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          notification_status?: string
          notification_type?: string
          read_at?: string | null
          recipient_user_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          created_at: string
          currency: string
          failure_code: string | null
          failure_message_safe: string | null
          id: string
          initiated_at: string
          payment_method_type: string | null
          payment_state: string
          provider_code: string
          provider_completed_at: string | null
          provider_payment_ref: string | null
          requested_amount_cents: number
          tip_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message_safe?: string | null
          id?: string
          initiated_at?: string
          payment_method_type?: string | null
          payment_state?: string
          provider_code: string
          provider_completed_at?: string | null
          provider_payment_ref?: string | null
          requested_amount_cents: number
          tip_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message_safe?: string | null
          id?: string
          initiated_at?: string
          payment_method_type?: string | null
          payment_state?: string
          provider_code?: string
          provider_completed_at?: string | null
          provider_payment_ref?: string | null
          requested_amount_cents?: number
          tip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_cohort_venues: {
        Row: {
          id: string
          joined_at: string
          pilot_cohort_id: string
          venue_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          pilot_cohort_id: string
          venue_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          pilot_cohort_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_cohort_venues_pilot_cohort_id_fkey"
            columns: ["pilot_cohort_id"]
            isOneToOne: false
            referencedRelation: "pilot_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_cohort_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_cohorts: {
        Row: {
          cohort_status: string
          cohort_type: string | null
          created_at: string
          end_at: string | null
          id: string
          name: string
          pricing_version_id: string
          start_at: string | null
        }
        Insert: {
          cohort_status?: string
          cohort_type?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          name: string
          pricing_version_id: string
          start_at?: string | null
        }
        Update: {
          cohort_status?: string
          cohort_type?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          name?: string
          pricing_version_id?: string
          start_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_cohorts_pricing_version_id_fkey"
            columns: ["pricing_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commercial_blockers: Json
          created_at: string
          created_by: string | null
          currency: string
          customer_fee_bps: number
          customer_fee_cap_cents: number | null
          customer_fixed_fee_cents: number
          effective_from: string | null
          effective_until: string | null
          high_value_threshold_cents: number
          id: string
          maximum_gratuity_cents: number
          minimum_gratuity_cents: number
          pricing_status: string
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          submitted_by_user_id: string | null
          submitted_for_review_at: string | null
          updated_at: string
          version_code: string
          worker_fee_bps: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commercial_blockers?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_fee_bps: number
          customer_fee_cap_cents?: number | null
          customer_fixed_fee_cents: number
          effective_from?: string | null
          effective_until?: string | null
          high_value_threshold_cents: number
          id?: string
          maximum_gratuity_cents: number
          minimum_gratuity_cents: number
          pricing_status?: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          submitted_by_user_id?: string | null
          submitted_for_review_at?: string | null
          updated_at?: string
          version_code: string
          worker_fee_bps: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commercial_blockers?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_fee_bps?: number
          customer_fee_cap_cents?: number | null
          customer_fixed_fee_cents?: number
          effective_from?: string | null
          effective_until?: string | null
          high_value_threshold_cents?: number
          id?: string
          maximum_gratuity_cents?: number
          minimum_gratuity_cents?: number
          pricing_status?: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          submitted_by_user_id?: string | null
          submitted_for_review_at?: string | null
          updated_at?: string
          version_code?: string
          worker_fee_bps?: number
        }
        Relationships: []
      }
      provider_settlement_profiles: {
        Row: {
          created_at: string
          destination_type: string | null
          disabled_at: string | null
          id: string
          masked_destination: string | null
          provider_account_ref: string
          provider_code: string
          provider_synced_at: string | null
          settlement_readiness: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          destination_type?: string | null
          disabled_at?: string | null
          id?: string
          masked_destination?: string | null
          provider_account_ref: string
          provider_code: string
          provider_synced_at?: string | null
          settlement_readiness?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          destination_type?: string | null
          disabled_at?: string | null
          id?: string
          masked_destination?: string | null
          provider_account_ref?: string
          provider_code?: string
          provider_synced_at?: string | null
          settlement_readiness?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_settlement_profiles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          approved_amount_cents: number | null
          completed_at: string | null
          created_at: string
          id: string
          payment_attempt_id: string
          provider_refund_ref: string | null
          refund_reason: string
          refund_status: string
          requested_amount_cents: number
          requested_at: string
          requested_by_user_id: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          submitted_at: string | null
          tip_id: string
        }
        Insert: {
          approved_amount_cents?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_attempt_id: string
          provider_refund_ref?: string | null
          refund_reason: string
          refund_status?: string
          requested_amount_cents: number
          requested_at?: string
          requested_by_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          submitted_at?: string | null
          tip_id: string
        }
        Update: {
          approved_amount_cents?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          payment_attempt_id?: string
          provider_refund_ref?: string | null
          refund_reason?: string
          refund_status?: string
          requested_amount_cents?: number
          requested_at?: string
          requested_by_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          submitted_at?: string | null
          tip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          actual_amount_cents: number | null
          allocation_id: string
          completed_at: string | null
          created_at: string
          currency: string
          expected_amount_cents: number
          expected_settlement_at: string | null
          failure_code: string | null
          id: string
          processing_at: string | null
          provider_code: string
          provider_settlement_ref: string | null
          settlement_profile_id: string | null
          settlement_state: string
        }
        Insert: {
          actual_amount_cents?: number | null
          allocation_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          expected_amount_cents: number
          expected_settlement_at?: string | null
          failure_code?: string | null
          id?: string
          processing_at?: string | null
          provider_code: string
          provider_settlement_ref?: string | null
          settlement_profile_id?: string | null
          settlement_state?: string
        }
        Update: {
          actual_amount_cents?: number | null
          allocation_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          expected_amount_cents?: number
          expected_settlement_at?: string | null
          failure_code?: string | null
          id?: string
          processing_at?: string | null
          provider_code?: string
          provider_settlement_ref?: string | null
          settlement_profile_id?: string | null
          settlement_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "financial_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_settlement_profile_id_fkey"
            columns: ["settlement_profile_id"]
            isOneToOne: false
            referencedRelation: "provider_settlement_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assigned_admin_user_id: string | null
          case_reference: string
          case_status: string
          category: string
          closed_at: string | null
          created_at: string
          description: string
          id: string
          requester_contact: string | null
          requester_type: string
          requester_user_id: string | null
          resolved_at: string | null
          severity: string
          subject: string
          tip_id: string | null
          venue_id: string | null
          worker_id: string | null
        }
        Insert: {
          assigned_admin_user_id?: string | null
          case_reference: string
          case_status?: string
          category: string
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          requester_contact?: string | null
          requester_type: string
          requester_user_id?: string | null
          resolved_at?: string | null
          severity?: string
          subject: string
          tip_id?: string | null
          venue_id?: string | null
          worker_id?: string | null
        }
        Update: {
          assigned_admin_user_id?: string | null
          case_reference?: string
          case_status?: string
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          requester_contact?: string | null
          requester_type?: string
          requester_user_id?: string | null
          resolved_at?: string | null
          severity?: string
          subject?: string
          tip_id?: string | null
          venue_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          acceptance_method: string
          accepted_at: string
          created_at: string
          evidence_metadata: Json | null
          id: string
          subject_id: string | null
          subject_type: string
          terms_version_id: string
          tip_id: string | null
        }
        Insert: {
          acceptance_method: string
          accepted_at?: string
          created_at?: string
          evidence_metadata?: Json | null
          id?: string
          subject_id?: string | null
          subject_type: string
          terms_version_id: string
          tip_id?: string | null
        }
        Update: {
          acceptance_method?: string
          accepted_at?: string
          created_at?: string
          evidence_metadata?: Json | null
          id?: string
          subject_id?: string | null
          subject_type?: string
          terms_version_id?: string
          tip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_terms_version_id_fkey"
            columns: ["terms_version_id"]
            isOneToOne: false
            referencedRelation: "terms_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_acceptances_tip_fk"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_versions: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          content_body: string | null
          content_format: string
          content_hash: string
          created_at: string
          effective_from: string
          id: string
          legal_blockers: Json
          published_at: string | null
          retired_at: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          source_blob_sha: string | null
          source_bytes: number | null
          source_path: string | null
          source_repository: string | null
          source_synced_at: string | null
          submitted_for_review_at: string | null
          terms_type: string
          title: string | null
          updated_at: string
          version_code: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          content_body?: string | null
          content_format?: string
          content_hash: string
          created_at?: string
          effective_from: string
          id?: string
          legal_blockers?: Json
          published_at?: string | null
          retired_at?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          source_blob_sha?: string | null
          source_bytes?: number | null
          source_path?: string | null
          source_repository?: string | null
          source_synced_at?: string | null
          submitted_for_review_at?: string | null
          terms_type: string
          title?: string | null
          updated_at?: string
          version_code: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          content_body?: string | null
          content_format?: string
          content_hash?: string
          created_at?: string
          effective_from?: string
          id?: string
          legal_blockers?: Json
          published_at?: string | null
          retired_at?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          source_blob_sha?: string | null
          source_bytes?: number | null
          source_path?: string | null
          source_repository?: string | null
          source_synced_at?: string | null
          submitted_for_review_at?: string | null
          terms_type?: string
          title?: string | null
          updated_at?: string
          version_code?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          client_idempotency_key: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_fee_cents: number
          customer_receipt_token: string
          customer_terms_version_id: string | null
          customer_total_cents: number
          expires_at: string
          gross_gratuity_cents: number
          id: string
          operative_payment_attempt_id: string | null
          pilot_cohort_id: string | null
          pricing_version_id: string
          swifttip_gross_revenue_cents: number
          swifttip_reference: string
          tip_status: string
          tipping_endpoint_id: string
          venue_id: string
          venue_name_snapshot: string
          worker_display_name_snapshot: string
          worker_fee_cents: number
          worker_id: string
          worker_net_cents: number
          worker_role_snapshot: string | null
          worker_venue_association_id: string
        }
        Insert: {
          client_idempotency_key?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_fee_cents: number
          customer_receipt_token?: string
          customer_terms_version_id?: string | null
          customer_total_cents: number
          expires_at: string
          gross_gratuity_cents: number
          id?: string
          operative_payment_attempt_id?: string | null
          pilot_cohort_id?: string | null
          pricing_version_id: string
          swifttip_gross_revenue_cents: number
          swifttip_reference: string
          tip_status?: string
          tipping_endpoint_id: string
          venue_id: string
          venue_name_snapshot: string
          worker_display_name_snapshot: string
          worker_fee_cents: number
          worker_id: string
          worker_net_cents: number
          worker_role_snapshot?: string | null
          worker_venue_association_id: string
        }
        Update: {
          client_idempotency_key?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_fee_cents?: number
          customer_receipt_token?: string
          customer_terms_version_id?: string | null
          customer_total_cents?: number
          expires_at?: string
          gross_gratuity_cents?: number
          id?: string
          operative_payment_attempt_id?: string | null
          pilot_cohort_id?: string | null
          pricing_version_id?: string
          swifttip_gross_revenue_cents?: number
          swifttip_reference?: string
          tip_status?: string
          tipping_endpoint_id?: string
          venue_id?: string
          venue_name_snapshot?: string
          worker_display_name_snapshot?: string
          worker_fee_cents?: number
          worker_id?: string
          worker_net_cents?: number
          worker_role_snapshot?: string | null
          worker_venue_association_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_customer_terms_version_id_fkey"
            columns: ["customer_terms_version_id"]
            isOneToOne: false
            referencedRelation: "terms_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_operative_payment_attempt_fk"
            columns: ["operative_payment_attempt_id", "id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id", "tip_id"]
          },
          {
            foreignKeyName: "tips_pilot_cohort_id_fkey"
            columns: ["pilot_cohort_id"]
            isOneToOne: false
            referencedRelation: "pilot_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_pricing_version_id_fkey"
            columns: ["pricing_version_id"]
            isOneToOne: false
            referencedRelation: "pricing_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_tipping_endpoint_id_fkey"
            columns: ["tipping_endpoint_id"]
            isOneToOne: false
            referencedRelation: "worker_tipping_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_worker_venue_association_id_fkey"
            columns: ["worker_venue_association_id"]
            isOneToOne: false
            referencedRelation: "worker_venue_associations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_status: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          membership_status: string
          revoked_at: string | null
          user_id: string
          venue_id: string
          venue_role: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          membership_status?: string
          revoked_at?: string | null
          user_id: string
          venue_id: string
          venue_role: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          membership_status?: string
          revoked_at?: string | null
          user_id?: string
          venue_id?: string
          venue_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_memberships_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          approved_at: string | null
          branch_name: string | null
          city: string | null
          closed_at: string | null
          country_code: string
          created_at: string
          id: string
          legal_name: string | null
          postal_code: string | null
          province: string | null
          public_location_label: string | null
          suspended_at: string | null
          trading_name: string
          updated_at: string
          venue_status: string
          venue_type: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          approved_at?: string | null
          branch_name?: string | null
          city?: string | null
          closed_at?: string | null
          country_code?: string
          created_at?: string
          id?: string
          legal_name?: string | null
          postal_code?: string | null
          province?: string | null
          public_location_label?: string | null
          suspended_at?: string | null
          trading_name: string
          updated_at?: string
          venue_status?: string
          venue_type: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          approved_at?: string | null
          branch_name?: string | null
          city?: string | null
          closed_at?: string | null
          country_code?: string
          created_at?: string
          id?: string
          legal_name?: string | null
          postal_code?: string | null
          province?: string | null
          public_location_label?: string | null
          suspended_at?: string | null
          trading_name?: string
          updated_at?: string
          venue_status?: string
          venue_type?: string
        }
        Relationships: []
      }
      worker_tipping_endpoints: {
        Row: {
          created_at: string
          disabled_at: string | null
          endpoint_status: string
          id: string
          public_token: string
          rotated_from_endpoint_id: string | null
          short_code: string
          worker_id: string
          worker_venue_association_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          endpoint_status?: string
          id?: string
          public_token: string
          rotated_from_endpoint_id?: string | null
          short_code: string
          worker_id: string
          worker_venue_association_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          endpoint_status?: string
          id?: string
          public_token?: string
          rotated_from_endpoint_id?: string | null
          short_code?: string
          worker_id?: string
          worker_venue_association_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_tipping_endpoints_rotated_from_endpoint_id_fkey"
            columns: ["rotated_from_endpoint_id"]
            isOneToOne: false
            referencedRelation: "worker_tipping_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_tipping_endpoints_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_tipping_endpoints_worker_venue_association_id_fkey"
            columns: ["worker_venue_association_id"]
            isOneToOne: false
            referencedRelation: "worker_venue_associations"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_venue_associations: {
        Row: {
          association_status: string
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          internal_reason: string | null
          started_at: string | null
          updated_at: string
          venue_id: string
          worker_id: string
          worker_role: string
        }
        Insert: {
          association_status?: string
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          internal_reason?: string | null
          started_at?: string | null
          updated_at?: string
          venue_id: string
          worker_id: string
          worker_role: string
        }
        Update: {
          association_status?: string
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          internal_reason?: string | null
          started_at?: string | null
          updated_at?: string
          venue_id?: string
          worker_id?: string
          worker_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_venue_associations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_venue_associations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_verifications: {
        Row: {
          created_at: string
          decision_reason: string | null
          expires_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          verification_status: string
          verification_type: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          decision_reason?: string | null
          expires_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          verification_status?: string
          verification_type: string
          worker_id: string
        }
        Update: {
          created_at?: string
          decision_reason?: string | null
          expires_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          verification_status?: string
          verification_type?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_verifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          activated_at: string | null
          created_at: string
          deactivated_at: string | null
          display_first_name: string
          global_suspension_reason: string | null
          id: string
          legal_first_name: string
          legal_last_name: string
          onboarding_status: string
          public_photo_path: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
          worker_status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          display_first_name: string
          global_suspension_reason?: string | null
          id?: string
          legal_first_name: string
          legal_last_name: string
          onboarding_status?: string
          public_photo_path?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id: string
          worker_status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          display_first_name?: string
          global_suspension_reason?: string | null
          id?: string
          legal_first_name?: string
          legal_last_name?: string
          onboarding_status?: string
          public_photo_path?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
          worker_status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_current_venue_terms: {
        Args: { p_acceptance_method?: string; p_membership_id: string }
        Returns: string
      }
      accept_current_worker_terms: {
        Args: { p_acceptance_method?: string }
        Returns: string
      }
      accept_venue_membership: {
        Args: { p_membership_id: string }
        Returns: undefined
      }
      activate_current_worker: { Args: never; Returns: undefined }
      admin_add_pilot_venue: {
        Args: { p_pilot_cohort_id: string; p_venue_id: string }
        Returns: undefined
      }
      admin_approve_legal_document: {
        Args: { p_reason: string; p_terms_version_id: string }
        Returns: undefined
      }
      admin_approve_pricing: {
        Args: { p_pricing_version_id: string; p_reason: string }
        Returns: undefined
      }
      admin_approve_venue: { Args: { p_venue_id: string }; Returns: undefined }
      admin_create_draft_pilot: {
        Args: {
          p_cohort_type: string
          p_end_at?: string
          p_name: string
          p_pricing_version_id: string
          p_start_at?: string
        }
        Returns: string
      }
      admin_create_venue: {
        Args: {
          p_branch_name: string
          p_city?: string
          p_province?: string
          p_public_location_label?: string
          p_trading_name: string
          p_venue_type: string
        }
        Returns: string
      }
      admin_decide_worker_identity_verification: {
        Args: {
          p_decision: string
          p_document_matches?: boolean
          p_duplicate_clear?: boolean
          p_reason?: string
          p_selfie_matches?: boolean
          p_verification_id: string
        }
        Returns: undefined
      }
      admin_decide_worker_verification: {
        Args: {
          p_decision: string
          p_reason?: string
          p_verification_id: string
        }
        Returns: undefined
      }
      admin_get_audit_events: {
        Args: { p_entity_type?: string; p_limit?: number }
        Returns: {
          action: string
          actor_role: string
          actor_type: string
          actor_user_id: string
          audit_id: string
          created_at: string
          entity_id: string
          entity_type: string
          reason: string
        }[]
      }
      admin_get_commercial_readiness: {
        Args: never
        Returns: {
          active_pricing_versions: number
          active_venues: number
          active_workers: number
          customer_terms_published: boolean
          draft_pricing_versions: number
          legal_approved_unpublished_versions: number
          legal_draft_versions: number
          legal_under_review_versions: number
          max_tip_intents_per_endpoint_15m: number
          max_tip_intents_per_endpoint_1m: number
          privacy_notice_published: boolean
          public_tip_intake_control_reason: string
          public_tip_intake_enabled: boolean
          public_tip_intake_ready: boolean
          venue_terms_published: boolean
          worker_terms_published: boolean
          workers_awaiting_activation: number
          workers_settlement_ready: number
        }[]
      }
      admin_get_dashboard: {
        Args: never
        Returns: {
          contribution_7d_cents: number
          gross_gratuity_7d_cents: number
          open_disputes: number
          pending_verifications: number
          provider_cost_7d_cents: number
          reconciliation_exceptions: number
          refund_requests: number
          settlement_exceptions: number
          successful_tips_7d: number
          swifttip_gross_revenue_7d_cents: number
        }[]
      }
      admin_get_dispute_detail: {
        Args: { p_dispute_id: string }
        Returns: {
          customer_total_cents: number
          dispute_id: string
          dispute_reason: string
          dispute_status: string
          disputed_amount_cents: number
          evidence_due_at: string
          evidence_submitted_at: string
          financial_outcome_cents: number
          gross_gratuity_cents: number
          opened_at: string
          payment_attempt_id: string
          provider_code: string
          provider_dispute_ref: string
          resolved_at: string
          swifttip_reference: string
          tip_id: string
          venue_name: string
          worker_display_name: string
          worker_net_cents: number
          worker_settlement_completed_at: string
          worker_settlement_state: string
        }[]
      }
      admin_get_dispute_queue: {
        Args: { p_limit?: number }
        Returns: {
          dispute_id: string
          dispute_reason: string
          dispute_status: string
          disputed_amount_cents: number
          evidence_due_at: string
          financial_outcome_cents: number
          opened_at: string
          provider_dispute_ref: string
          resolved_at: string
          swifttip_reference: string
          venue_name: string
          worker_display_name: string
        }[]
      }
      admin_get_legal_document: {
        Args: { p_terms_version_id: string }
        Returns: {
          approved_at: string
          content_body: string
          content_format: string
          content_hash: string
          effective_from: string
          legal_blockers: Json
          published_at: string
          review_notes: string
          review_status: string
          reviewed_at: string
          source_blob_sha: string
          source_bytes: number
          source_path: string
          source_repository: string
          source_synced_at: string
          submitted_for_review_at: string
          terms_type: string
          terms_version_id: string
          title: string
          updated_at: string
          version_code: string
        }[]
      }
      admin_get_legal_documents: {
        Args: never
        Returns: {
          approved_at: string
          blocker_count: number
          effective_from: string
          published_at: string
          review_status: string
          reviewed_at: string
          submitted_for_review_at: string
          terms_type: string
          terms_version_id: string
          title: string
          updated_at: string
          version_code: string
        }[]
      }
      admin_get_pilot_cohorts: {
        Args: never
        Returns: {
          cohort_status: string
          cohort_type: string
          created_at: string
          end_at: string
          name: string
          pilot_cohort_id: string
          pricing_status: string
          pricing_version_code: string
          pricing_version_id: string
          start_at: string
          venue_count: number
        }[]
      }
      admin_get_pilot_metrics: {
        Args: { p_from: string; p_to: string }
        Returns: {
          active_worker_count: number
          average_contribution_cents: number
          average_gratuity_cents: number
          contribution_cents: number
          contribution_per_active_worker_cents: number
          dispute_rate_pct: number
          dispute_tip_count: number
          gross_gratuity_cents: number
          participating_venue_count: number
          provider_cost_cents: number
          refund_rate_pct: number
          refund_tip_count: number
          settlement_record_count: number
          settlement_success_rate_pct: number
          successful_settlement_count: number
          successful_tip_count: number
          support_case_count: number
          support_cases_per_100_tips: number
          swifttip_gross_revenue_cents: number
          transactions_per_active_worker: number
        }[]
      }
      admin_get_pricing_version: {
        Args: { p_pricing_version_id: string }
        Returns: {
          approved_at: string
          commercial_blockers: Json
          created_at: string
          currency: string
          customer_fee_bps: number
          customer_fee_cap_cents: number
          customer_fixed_fee_cents: number
          effective_from: string
          effective_until: string
          high_value_threshold_cents: number
          maximum_gratuity_cents: number
          minimum_gratuity_cents: number
          pricing_id: string
          pricing_status: string
          review_notes: string
          review_status: string
          reviewed_at: string
          submitted_for_review_at: string
          updated_at: string
          version_code: string
          worker_fee_bps: number
        }[]
      }
      admin_get_pricing_versions: {
        Args: never
        Returns: {
          approved_at: string
          blocker_count: number
          created_at: string
          currency: string
          customer_fee_bps: number
          customer_fee_cap_cents: number
          customer_fixed_fee_cents: number
          effective_from: string
          effective_until: string
          high_value_threshold_cents: number
          maximum_gratuity_cents: number
          minimum_gratuity_cents: number
          pricing_id: string
          pricing_status: string
          review_status: string
          reviewed_at: string
          submitted_for_review_at: string
          updated_at: string
          version_code: string
          worker_fee_bps: number
        }[]
      }
      admin_get_recent_transactions: {
        Args: { p_limit?: number }
        Returns: {
          completed_at: string
          contribution_cents: number
          customer_total_cents: number
          gross_gratuity_cents: number
          provider_cost_cents: number
          settlement_state: string
          swifttip_gross_revenue_cents: number
          swifttip_reference: string
          venue_name: string
          worker_display_name: string
          worker_net_cents: number
        }[]
      }
      admin_get_refund_detail: {
        Args: { p_refund_id: string }
        Returns: {
          approved_amount_cents: number
          completed_at: string
          customer_fee_cents: number
          customer_total_cents: number
          gross_gratuity_cents: number
          payment_attempt_id: string
          provider_refund_ref: string
          refund_id: string
          refund_reason: string
          refund_status: string
          requested_amount_cents: number
          requested_at: string
          reviewed_at: string
          submitted_at: string
          swifttip_reference: string
          tip_id: string
          venue_name: string
          worker_display_name: string
          worker_fee_cents: number
          worker_net_cents: number
        }[]
      }
      admin_get_refund_queue: {
        Args: { p_limit?: number }
        Returns: {
          approved_amount_cents: number
          completed_at: string
          provider_refund_ref: string
          refund_id: string
          refund_reason: string
          refund_status: string
          requested_amount_cents: number
          requested_at: string
          reviewed_at: string
          swifttip_reference: string
          venue_name: string
          worker_display_name: string
        }[]
      }
      admin_get_settlement_exceptions: {
        Args: { p_limit?: number }
        Returns: {
          actual_amount_cents: number
          created_at: string
          expected_amount_cents: number
          provider_code: string
          provider_settlement_ref: string
          settlement_id: string
          settlement_state: string
          swifttip_reference: string
          venue_name: string
          worker_display_name: string
        }[]
      }
      admin_get_support_case_detail: {
        Args: { p_case_id: string }
        Returns: {
          assigned_admin_user_id: string
          case_id: string
          case_reference: string
          case_status: string
          category: string
          closed_at: string
          created_at: string
          description: string
          requester_type: string
          resolved_at: string
          severity: string
          subject: string
          tip_id: string
          tip_reference: string
          venue_id: string
          venue_name: string
          worker_display_name: string
          worker_id: string
        }[]
      }
      admin_get_support_cases: {
        Args: { p_limit?: number }
        Returns: {
          assigned_admin_user_id: string
          case_id: string
          case_reference: string
          case_status: string
          category: string
          created_at: string
          requester_type: string
          severity: string
          subject: string
          tip_id: string
          venue_id: string
          worker_id: string
        }[]
      }
      admin_get_transaction_detail: {
        Args: { p_reference: string }
        Returns: {
          actual_settlement_cents: number
          completed_at: string
          contribution_cents: number
          customer_fee_cents: number
          customer_total_cents: number
          expected_settlement_cents: number
          gross_gratuity_cents: number
          payment_state: string
          provider_cost_cents: number
          provider_payment_ref: string
          provider_settlement_ref: string
          reconciliation_status: string
          settlement_state: string
          swifttip_gross_revenue_cents: number
          swifttip_reference: string
          tip_id: string
          venue_name: string
          worker_display_name: string
          worker_fee_cents: number
          worker_net_cents: number
          worker_role: string
        }[]
      }
      admin_get_venue_detail: {
        Args: { p_venue_id: string }
        Returns: {
          active_member_count: number
          approved_at: string
          branch_name: string
          city: string
          created_at: string
          invited_member_count: number
          legal_name: string
          pending_worker_count: number
          province: string
          public_location_label: string
          trading_name: string
          venue_id: string
          venue_status: string
          venue_terms_published: boolean
          venue_terms_version_code: string
          venue_type: string
          verified_worker_count: number
        }[]
      }
      admin_get_venue_members: {
        Args: { p_venue_id: string }
        Returns: {
          accepted_at: string
          current_terms_accepted: boolean
          invited_at: string
          member_display_name: string
          member_email: string
          membership_id: string
          membership_status: string
          revoked_at: string
          venue_role: string
        }[]
      }
      admin_get_venue_worker_associations: {
        Args: { p_venue_id: string }
        Returns: {
          association_id: string
          association_status: string
          confirmed_at: string
          ended_at: string
          requested_at: string
          worker_display_name: string
          worker_role: string
          worker_status: string
        }[]
      }
      admin_get_venues: {
        Args: { p_status?: string }
        Returns: {
          active_member_count: number
          branch_name: string
          created_at: string
          pending_worker_count: number
          public_location_label: string
          trading_name: string
          venue_id: string
          venue_status: string
          venue_type: string
          verified_worker_count: number
        }[]
      }
      admin_get_verification_detail: {
        Args: { p_verification_id: string }
        Returns: {
          decision_reason: string
          display_name: string
          document_id: string
          document_type: string
          file_size_bytes: number
          identity_consented_at: string
          identity_document_type: string
          identity_number_last4: string
          legal_first_name: string
          legal_last_name: string
          mime_type: string
          reviewed_at: string
          selfie_capture_method: string
          selfie_captured_at: string
          storage_object_available: boolean
          storage_path: string
          submitted_at: string
          uploaded_at: string
          venue_name: string
          verification_id: string
          verification_status: string
          verification_type: string
          worker_id: string
        }[]
      }
      admin_get_verification_queue: {
        Args: { p_limit?: number }
        Returns: {
          display_name: string
          submitted_at: string
          venue_name: string
          verification_id: string
          verification_status: string
          verification_type: string
          worker_id: string
        }[]
      }
      admin_invite_venue_member: {
        Args: { p_role?: string; p_user_id: string; p_venue_id: string }
        Returns: string
      }
      admin_invite_venue_member_by_email: {
        Args: { p_email: string; p_role?: string; p_venue_id: string }
        Returns: string
      }
      admin_record_legal_review: {
        Args: {
          p_legal_blockers: Json
          p_review_notes: string
          p_terms_version_id: string
        }
        Returns: undefined
      }
      admin_record_pricing_review: {
        Args: {
          p_commercial_blockers: Json
          p_pricing_version_id: string
          p_review_notes: string
        }
        Returns: undefined
      }
      admin_remove_pilot_venue: {
        Args: { p_pilot_cohort_id: string; p_venue_id: string }
        Returns: undefined
      }
      admin_return_legal_document_to_draft: {
        Args: { p_reason: string; p_terms_version_id: string }
        Returns: undefined
      }
      admin_return_pricing_to_draft: {
        Args: { p_pricing_version_id: string; p_reason: string }
        Returns: undefined
      }
      admin_revoke_venue_membership: {
        Args: { p_membership_id: string; p_reason: string }
        Returns: undefined
      }
      admin_submit_legal_document_for_review: {
        Args: { p_reason?: string; p_terms_version_id: string }
        Returns: undefined
      }
      admin_submit_pricing_for_review: {
        Args: { p_pricing_version_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_update_legal_draft: {
        Args: {
          p_content_body: string
          p_legal_blockers: Json
          p_review_notes?: string
          p_terms_version_id: string
          p_title: string
        }
        Returns: undefined
      }
      admin_update_pricing_draft: {
        Args: {
          p_commercial_blockers: Json
          p_customer_fee_bps: number
          p_customer_fee_cap_cents: number
          p_customer_fixed_fee_cents: number
          p_high_value_threshold_cents: number
          p_maximum_gratuity_cents: number
          p_minimum_gratuity_cents: number
          p_pricing_version_id: string
          p_review_notes?: string
          p_worker_fee_bps: number
        }
        Returns: undefined
      }
      admin_update_support_case: {
        Args: { p_case_id: string; p_reason?: string; p_status: string }
        Returns: undefined
      }
      attest_worker_live_selfie: {
        Args: { p_capture_method: string; p_verification_id: string }
        Returns: undefined
      }
      auth_abuse_admit: {
        Args: { p_identifier: string; p_ip?: string; p_scope: string }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      bootstrap_admin_membership: {
        Args: {
          p_admin_role: string
          p_allow_update?: boolean
          p_user_id: string
        }
        Returns: {
          admin_role: string
          admin_status: string
          membership_id: string
          mfa_required: boolean
          user_id: string
        }[]
      }
      create_tip: {
        Args: {
          p_gross_gratuity_cents: number
          p_idempotency_key: string
          p_public_token: string
        }
        Returns: {
          currency: string
          customer_fee_cents: number
          customer_total_cents: number
          expires_at: string
          gross_gratuity_cents: number
          swifttip_reference: string
          tip_id: string
          worker_fee_cents: number
          worker_net_cents: number
        }[]
      }
      decide_worker_venue_association: {
        Args: {
          p_association_id: string
          p_decision: string
          p_reason?: string
        }
        Returns: undefined
      }
      end_worker_venue_association: {
        Args: { p_association_id: string; p_reason: string }
        Returns: undefined
      }
      finalize_worker_verification_document_removal: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      get_customer_receipt_access: {
        Args: { p_idempotency_key: string; p_reference: string }
        Returns: {
          receipt_token: string
        }[]
      }
      get_effective_terms: {
        Args: { p_terms_type: string }
        Returns: {
          content_body: string
          content_format: string
          content_hash: string
          effective_from: string
          published_at: string
          terms_type: string
          title: string
          version_code: string
        }[]
      }
      get_my_notifications: {
        Args: { p_limit?: number }
        Returns: {
          action_path: string
          body: string
          created_at: string
          notification_id: string
          notification_type: string
          read_at: string
          title: string
        }[]
      }
      get_my_venue_invitations: {
        Args: never
        Returns: {
          branch_name: string
          membership_id: string
          membership_status: string
          public_location_label: string
          venue_id: string
          venue_name: string
          venue_role: string
          venue_status: string
          venue_terms_accepted: boolean
          venue_terms_published: boolean
          venue_terms_version_code: string
          venue_terms_version_id: string
          venue_type: string
        }[]
      }
      get_public_tip_receipt: {
        Args: { p_receipt_token: string }
        Returns: {
          completed_at: string
          created_at: string
          currency: string
          customer_fee_cents: number
          customer_total_cents: number
          gross_gratuity_cents: number
          payment_state: string
          swifttip_reference: string
          tip_status: string
          venue_name: string
          worker_display_name: string
          worker_role: string
        }[]
      }
      get_public_tipping_profile: {
        Args: { p_public_token: string }
        Returns: {
          display_name: string
          public_photo_path: string
          venue_location: string
          venue_name: string
          verified: boolean
          worker_role: string
        }[]
      }
      get_venue_summary: {
        Args: { p_from: string; p_to: string; p_venue_id: string }
        Returns: {
          active_workers: number
          gross_gratuity_cents: number
          participating_workers: number
          successful_tip_count: number
        }[]
      }
      get_venue_workers: {
        Args: { p_venue_id: string }
        Returns: {
          associated_at: string
          association_id: string
          association_status: string
          display_name: string
          public_photo_path: string
          worker_id: string
          worker_role: string
          worker_status: string
        }[]
      }
      get_worker_context: {
        Args: never
        Returns: {
          association_status: string
          display_name: string
          endpoint_status: string
          masked_destination: string
          onboarding_status: string
          public_token: string
          settlement_readiness: string
          short_code: string
          venue_id: string
          venue_location: string
          venue_name: string
          worker_id: string
          worker_role: string
          worker_status: string
        }[]
      }
      get_worker_identity_claim: {
        Args: never
        Returns: {
          consent_version: string
          consented_at: string
          document_type: string
          identity_number_last4: string
          selfie_capture_attested: boolean
          selfie_capture_method: string
          selfie_captured_at: string
        }[]
      }
      get_worker_onboarding_state: {
        Args: never
        Returns: {
          activation_ready: boolean
          blocking_reasons: string[]
          identity_verification_status: string
          onboarding_status: string
          settlement_readiness: string
          venue_association_id: string
          venue_association_status: string
          venue_name: string
          worker_id: string
          worker_status: string
          worker_terms_accepted: boolean
          worker_terms_published: boolean
          worker_terms_version_code: string
          worker_terms_version_id: string
        }[]
      }
      get_worker_recent_tips: {
        Args: { p_limit?: number }
        Returns: {
          completed_at: string
          gross_gratuity_cents: number
          settlement_actual_cents: number
          settlement_expected_cents: number
          settlement_state: string
          swifttip_reference: string
          worker_fee_cents: number
          worker_net_cents: number
        }[]
      }
      get_worker_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          gross_gratuity_cents: number
          processing_cents: number
          settled_cents: number
          successful_tip_count: number
          worker_fee_cents: number
          worker_net_cents: number
        }[]
      }
      get_worker_tip_detail: {
        Args: { p_reference: string }
        Returns: {
          completed_at: string
          currency: string
          gross_gratuity_cents: number
          payment_provider_completed_at: string
          payment_state: string
          settlement_actual_cents: number
          settlement_completed_at: string
          settlement_expected_cents: number
          settlement_provider_ref: string
          settlement_state: string
          swifttip_reference: string
          venue_name: string
          worker_fee_cents: number
          worker_net_cents: number
          worker_role: string
        }[]
      }
      get_worker_verification_documents: {
        Args: { p_verification_id: string }
        Returns: {
          document_id: string
          document_type: string
          file_size_bytes: number
          mime_type: string
          storage_object_available: boolean
          storage_path: string
          uploaded_at: string
        }[]
      }
      list_worker_available_venues: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          branch_name: string
          city: string
          province: string
          public_location_label: string
          trading_name: string
          venue_id: string
          venue_type: string
        }[]
      }
      mark_my_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      prepare_worker_verification_document_removal: {
        Args: { p_document_id: string }
        Returns: string
      }
      quote_tip: {
        Args: { p_gross_gratuity_cents: number; p_public_token: string }
        Returns: {
          currency: string
          customer_fee_cents: number
          customer_total_cents: number
          gross_gratuity_cents: number
          pricing_version_id: string
          swifttip_gross_revenue_cents: number
          venue_name: string
          worker_display_name: string
          worker_fee_cents: number
          worker_net_cents: number
          worker_role: string
        }[]
      }
      record_admin_mfa_recovery_event: {
        Args: {
          p_admin_user_id: string
          p_authorised_by: string
          p_factor_id: string
          p_reason: string
        }
        Returns: undefined
      }
      record_worker_auth_bootstrap: {
        Args: {
          p_auth_user_created: boolean
          p_phone: string
          p_user_id: string
        }
        Returns: undefined
      }
      register_worker_verification_document: {
        Args: {
          p_document_type: string
          p_file_size_bytes: number
          p_mime_type: string
          p_sha256_hash?: string
          p_storage_path: string
          p_verification_id: string
        }
        Returns: string
      }
      request_worker_venue_association: {
        Args: { p_venue_id: string; p_worker_role: string }
        Returns: string
      }
      resolve_short_code: { Args: { p_short_code: string }; Returns: string }
      save_worker_identity_claim: {
        Args: {
          p_consent_version: string
          p_document_type: string
          p_identity_number: string
          p_legal_first_name: string
          p_legal_last_name: string
        }
        Returns: undefined
      }
      session_access_allowed: { Args: { p_surface: string }; Returns: boolean }
      start_worker_onboarding: {
        Args: {
          p_display_first_name: string
          p_legal_first_name: string
          p_legal_last_name: string
        }
        Returns: string
      }
      start_worker_verification: {
        Args: { p_verification_type?: string }
        Returns: string
      }
      submit_worker_verification: {
        Args: { p_verification_id: string }
        Returns: undefined
      }
      worker_create_support_case: {
        Args: {
          p_category: string
          p_description: string
          p_subject: string
          p_tip_reference?: string
        }
        Returns: string
      }
      worker_get_support_cases: {
        Args: { p_limit?: number }
        Returns: {
          case_reference: string
          case_status: string
          category: string
          closed_at: string
          created_at: string
          resolved_at: string
          severity: string
          subject: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


// SwiftTip MVP v3 — application-facing Supabase schema contracts.
// Derived from the canonical bxtfcfuehqljedxwykfk schema after migration 0014.
// Keep this file aligned with `supabase gen types` whenever migrations change.

export type Database = {
  public: {
    Tables: {
      workers: {
        Row: {
          id: string;
          user_id: string;
          legal_first_name: string;
          legal_last_name: string;
          display_first_name: string;
          public_photo_path: string | null;
          worker_status: string;
          onboarding_status: string;
          global_suspension_reason: string | null;
          activated_at: string | null;
          suspended_at: string | null;
          deactivated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      venues: {
        Row: {
          id: string;
          legal_name: string | null;
          trading_name: string;
          branch_name: string | null;
          venue_type: string;
          address_line_1: string | null;
          address_line_2: string | null;
          city: string | null;
          province: string | null;
          postal_code: string | null;
          country_code: string;
          public_location_label: string | null;
          venue_status: string;
          approved_at: string | null;
          suspended_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      venue_memberships: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string;
          venue_role: string;
          membership_status: string;
          invited_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      admin_memberships: {
        Row: {
          id: string;
          user_id: string;
          admin_role: string;
          admin_status: string;
          mfa_required: boolean;
          granted_by: string | null;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_public_tipping_profile: {
        Args: { p_public_token: string };
        Returns: Array<{ display_name: string; worker_role: string; venue_name: string; venue_location: string | null; public_photo_path: string | null; verified: boolean }>;
      };
      resolve_short_code: { Args: { p_short_code: string }; Returns: string };
      quote_tip: {
        Args: { p_public_token: string; p_gross_gratuity_cents: number };
        Returns: Array<{ worker_display_name: string; worker_role: string; venue_name: string; gross_gratuity_cents: number; customer_fee_cents: number; customer_total_cents: number; worker_fee_cents: number; worker_net_cents: number; swifttip_gross_revenue_cents: number; currency: string; pricing_version_id: string }>;
      };
      create_tip: {
        Args: { p_public_token: string; p_gross_gratuity_cents: number; p_idempotency_key: string };
        Returns: Array<{ tip_id: string; swifttip_reference: string; expires_at: string; gross_gratuity_cents: number; customer_fee_cents: number; customer_total_cents: number; worker_fee_cents: number; worker_net_cents: number; currency: string }>;
      };
      get_worker_context: {
        Args: Record<string, never>;
        Returns: Array<{ worker_id: string; display_name: string; worker_status: string; onboarding_status: string; worker_role: string | null; association_status: string | null; venue_id: string | null; venue_name: string | null; venue_location: string | null; public_token: string | null; short_code: string | null; endpoint_status: string | null; settlement_readiness: string | null; masked_destination: string | null }>;
      };
      get_worker_summary: {
        Args: { p_from: string; p_to: string };
        Returns: Array<{ successful_tip_count: number; gross_gratuity_cents: number; worker_fee_cents: number; worker_net_cents: number; settled_cents: number; processing_cents: number }>;
      };
      get_worker_recent_tips: {
        Args: { p_limit?: number };
        Returns: Array<{ swifttip_reference: string; gross_gratuity_cents: number; worker_fee_cents: number; worker_net_cents: number; completed_at: string | null; settlement_state: string; settlement_expected_cents: number | null; settlement_actual_cents: number | null }>;
      };
      get_worker_tip_detail: {
        Args: { p_reference: string };
        Returns: Array<{ swifttip_reference: string; gross_gratuity_cents: number; worker_fee_cents: number; worker_net_cents: number; currency: string; venue_name: string; worker_role: string | null; completed_at: string | null; payment_state: string | null; payment_provider_completed_at: string | null; settlement_state: string; settlement_expected_cents: number | null; settlement_actual_cents: number | null; settlement_completed_at: string | null; settlement_provider_ref: string | null }>;
      };
      get_venue_workers: {
        Args: { p_venue_id: string };
        Returns: Array<{ association_id: string; worker_id: string; display_name: string; public_photo_path: string | null; worker_role: string; association_status: string; worker_status: string; associated_at: string }>;
      };
      get_venue_summary: {
        Args: { p_venue_id: string; p_from: string; p_to: string };
        Returns: Array<{ participating_workers: number; active_workers: number; successful_tip_count: number; gross_gratuity_cents: number }>;
      };
      decide_worker_venue_association: {
        Args: { p_association_id: string; p_decision: string; p_reason?: string | null };
        Returns: undefined;
      };
      end_worker_venue_association: {
        Args: { p_association_id: string; p_reason: string };
        Returns: undefined;
      };
      admin_get_dashboard: {
        Args: Record<string, never>;
        Returns: Array<{ settlement_exceptions: number; reconciliation_exceptions: number; pending_verifications: number; refund_requests: number; open_disputes: number; successful_tips_7d: number; gross_gratuity_7d_cents: number; swifttip_gross_revenue_7d_cents: number; provider_cost_7d_cents: number; contribution_7d_cents: number }>;
      };
      admin_get_recent_transactions: {
        Args: { p_limit?: number };
        Returns: Array<{ swifttip_reference: string; completed_at: string | null; worker_display_name: string; venue_name: string; customer_total_cents: number; gross_gratuity_cents: number; worker_net_cents: number; swifttip_gross_revenue_cents: number; provider_cost_cents: number; contribution_cents: number; settlement_state: string }>;
      };
      admin_get_transaction_detail: {
        Args: { p_reference: string };
        Returns: Array<{ tip_id: string; swifttip_reference: string; worker_display_name: string; worker_role: string | null; venue_name: string; completed_at: string | null; customer_total_cents: number; gross_gratuity_cents: number; customer_fee_cents: number; worker_fee_cents: number; worker_net_cents: number; swifttip_gross_revenue_cents: number; provider_cost_cents: number; contribution_cents: number; payment_state: string | null; provider_payment_ref: string | null; settlement_state: string; expected_settlement_cents: number | null; actual_settlement_cents: number | null; provider_settlement_ref: string | null; reconciliation_status: string }>;
      };
      admin_get_settlement_exceptions: {
        Args: { p_limit?: number };
        Returns: Array<{ settlement_id: string; swifttip_reference: string; worker_display_name: string; venue_name: string; settlement_state: string; expected_amount_cents: number; actual_amount_cents: number | null; provider_code: string; provider_settlement_ref: string | null; created_at: string }>;
      };
      admin_get_verification_queue: {
        Args: { p_limit?: number };
        Returns: Array<{ verification_id: string; worker_id: string; display_name: string; verification_type: string; verification_status: string; submitted_at: string | null; venue_name: string | null }>;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

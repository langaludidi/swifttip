import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type AuthSecurityScope =
  | "worker_otp_request"
  | "worker_otp_verify"
  | "venue_otp_request"
  | "venue_otp_verify"
  | "admin_otp_request"
  | "admin_otp_verify"
  | "admin_mfa_verify"
  | "admin_mfa_enroll";

export type AuthAdmission = {
  allowed: boolean;
  retryAfterSeconds: number;
};

async function clientIpHint() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

export async function admitAuthAttempt(scope: AuthSecurityScope, identifier: string): Promise<AuthAdmission> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("auth_abuse_admit", {
      p_scope: scope,
      p_identifier: identifier,
      p_ip: await clientIpHint()
    });

    if (error) return { allowed: false, retryAfterSeconds: 60 };
    const result = (data ?? [])[0] as { allowed?: boolean; retry_after_seconds?: number } | undefined;
    return {
      allowed: result?.allowed === true,
      retryAfterSeconds: Math.max(0, Number(result?.retry_after_seconds ?? 0))
    };
  } catch {
    // Authentication abuse controls fail closed. A temporary guard failure must not
    // become a route around OTP/MFA throttling.
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

export function authRetryMessage(retryAfterSeconds: number) {
  if (retryAfterSeconds <= 0) return "Please try again.";
  if (retryAfterSeconds < 120) return `Please wait about ${Math.max(1, Math.ceil(retryAfterSeconds / 10) * 10)} seconds and try again.`;
  return `Please wait about ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minutes and try again.`;
}

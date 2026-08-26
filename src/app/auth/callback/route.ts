import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const loginUrl = "https://swifttip.vercel.app/admin/login";
const mfaUrl = "https://swifttip.vercel.app/admin/mfa";

function loginFailure(message: string) {
  const url = new URL(loginUrl);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return loginFailure("The sign-in link is invalid or incomplete. Request another link.");

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return loginFailure("The sign-in link is invalid or expired. Request another link.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    await supabase.auth.signOut();
    return loginFailure("The sign-in session could not be verified. Request another link.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("admin_memberships")
    .select("admin_status,mfa_required")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (membershipError || !membership || membership.admin_status !== "active") {
    await supabase.auth.signOut();
    return loginFailure("SwiftTip Operations access is unavailable for this account.");
  }

  return NextResponse.redirect(membership.mfa_required ? mfaUrl : "https://swifttip.vercel.app/admin");
}

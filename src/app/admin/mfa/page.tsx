import Link from "next/link";
import { redirect } from "next/navigation";
import { AppMark } from "@/components/AppMark";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { AdminMfaEnrollment } from "./Enrollment";
import { verifyAdminMfa } from "./actions";

export default async function AdminMfaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: membership } = await supabase
    .from("admin_memberships")
    .select("admin_status,mfa_required,admin_role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || membership.admin_status !== "active") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=This%20account%20is%20not%20authorised%20for%20SwiftTip%20Operations");
  }

  if (!membership.mfa_required) redirect("/admin");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/admin");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = factors?.totp?.filter((factor) => factor.status === "verified") ?? [];
  const factor = verifiedFactors[0];

  return (
    <main className="flow-shell auth-shell">
      <div className="flow-page auth-page">
        <header className="simple-header"><Link className="back-link" href="/admin/login">←</Link><strong>SwiftTip Operations</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow auth-flow">
          <div className="auth-mark"><AppMark size={62}/></div>
          <span className="eyebrow">Step 2 of 2</span>
          <h1>Confirm it’s really you.</h1>
          <p className="lead">Your Admin membership is recognised. Complete the required authenticator check before Operations access is granted.</p>
          <div className="admin-role-chip">{membership.admin_role.replaceAll("_", " ")}</div>
          {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>MFA not completed</strong><p>{error}</p></div></div>}

          {factor ? (
            <section className="dashboard-section auth-card">
              <span className="eyebrow">Authenticator</span>
              <h2>Enter your current 6-digit code</h2>
              <p className="lead">Open the authenticator app you enrolled for SwiftTip Operations.</p>
              <form action={verifyAdminMfa} className="stack-actions" style={{ marginTop: 18 }}>
                <input type="hidden" name="factorId" value={factor.id}/>
                <label className="field-label" htmlFor="mfa-code">Authenticator code</label>
                <div className="otp-input-shell"><input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" pattern="[0-9]{6}" maxLength={6} required /></div>
                <button className="button button-primary button-large" type="submit">Verify and enter Operations</button>
              </form>
            </section>
          ) : <AdminMfaEnrollment />}

          <p className="auth-footnote">SwiftTip does not treat email verification as sufficient for privileged Admin actions. The database RPC layer independently requires AAL2 for protected Operations functions.</p>
        </section>
      </div>
    </main>
  );
}

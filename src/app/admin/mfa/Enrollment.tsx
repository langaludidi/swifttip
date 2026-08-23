"use client";

import { useActionState } from "react";
import { completeAdminMfaEnrollment, startAdminMfaEnrollment } from "./actions";

type EnrollmentState = {
  error?: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

const initialState: EnrollmentState = {};

export function AdminMfaEnrollment() {
  const [state, action, pending] = useActionState(startAdminMfaEnrollment, initialState);

  if (state.factorId && state.qrCode) {
    return (
      <section className="dashboard-section auth-card mfa-enrollment-card">
        <span className="eyebrow">First-time MFA setup</span>
        <h2>Connect an authenticator app</h2>
        <p className="lead">Scan this QR with your authenticator app, then enter the 6-digit code it generates.</p>
        <div className="mfa-qr-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={state.qrCode} alt="SwiftTip Admin authenticator enrollment QR" />
        </div>
        {state.secret && <details className="mfa-secret"><summary>Can't scan the QR?</summary><p>Enter this setup key manually:</p><code>{state.secret}</code></details>}
        <form action={completeAdminMfaEnrollment} className="stack-actions" style={{ marginTop: 18 }}>
          <input type="hidden" name="factorId" value={state.factorId}/>
          <label className="field-label" htmlFor="enrolment-code">Authenticator code</label>
          <div className="otp-input-shell"><input id="enrolment-code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" pattern="[0-9]{6}" maxLength={6} required /></div>
          <button className="button button-primary button-large" type="submit">Verify authenticator</button>
        </form>
      </section>
    );
  }

  return (
    <section className="dashboard-section auth-card">
      <span className="eyebrow">MFA required</span>
      <h2>Set up your authenticator</h2>
      <p className="lead">SwiftTip Operations requires a second factor before privileged Admin functions become available.</p>
      {state.error && <div className="state-banner warning"><span className="state-icon">!</span><div className="state-copy"><strong>Setup note</strong><p>{state.error}</p></div></div>}
      <form action={action} style={{ marginTop: 18 }}>
        <button className="button button-primary button-large" type="submit" disabled={pending}>{pending ? "Starting setup…" : "Set up authenticator"}</button>
      </form>
    </section>
  );
}

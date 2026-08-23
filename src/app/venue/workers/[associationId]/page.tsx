import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVenueSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { confirmAssociation, endAssociation, rejectAssociation } from "./actions";

type VenueWorker = {
  association_id: string;
  display_name: string;
  public_photo_path: string | null;
  worker_role: string;
  association_status: string;
  worker_status: string;
  associated_at: string;
};

function initials(name: string) {
  return name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase();
}

function human(value: string) {
  return value.replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
}

export default async function VenueWorkerPage({ params, searchParams }: { params: Promise<{ associationId: string }>; searchParams: Promise<{ error?: string; updated?: string }> }) {
  const access = await requireVenueSurface();
  const { associationId } = await params;
  const query = await searchParams;
  let worker: VenueWorker | null = null;
  let venueRole = "venue_admin";

  if (access.mode === "demo") {
    worker = { association_id: associationId, display_name: "Thando", public_photo_path: null, worker_role: "Fuel Attendant", association_status: associationId === "demo-3" ? "pending" : "verified", worker_status: "active", associated_at: new Date().toISOString() };
  } else {
    const supabase = await createSupabaseServerClient();
    const membership = await supabase.from("venue_memberships").select("venue_id, venue_role").eq("membership_status", "active").limit(1).maybeSingle();
    if (!membership.data) notFound();
    venueRole = membership.data.venue_role;
    const result = await supabase.rpc("get_venue_workers", { p_venue_id: membership.data.venue_id });
    worker = ((result.data ?? []) as VenueWorker[]).find((item) => item.association_id === associationId) ?? null;
  }

  if (!worker) notFound();
  const canManage = access.mode === "live" && venueRole === "venue_admin";
  const pending = worker.association_status === "pending";

  return (
    <main className="flow-shell customer-flow-page">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/venue">←</Link><strong>{pending ? "Confirm worker" : "Worker association"}</strong><span style={{ width: 42 }} /></header>
        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview decision</strong><p>Venue actions are disabled until the staging deployment is connected to the MVP v3 database.</p></div></div>}
        {query.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Action not completed</strong><p>{query.error}</p></div></div>}
        {query.updated && <div className="state-banner success" role="status"><span className="state-icon">✓</span><div className="state-copy"><strong>Association updated</strong><p>The Worker relationship state has been saved.</p></div></div>}

        <section className="association-profile">
          <span className="association-avatar">{initials(worker.display_name)}</span>
          <div><span className="eyebrow">Worker requesting this Venue</span><h1>{worker.display_name}</h1><p>{worker.worker_role}</p></div>
        </section>

        <section className="dashboard-section" style={{marginTop:16}}>
          <div className="list-row"><div><strong>Venue relationship</strong><div className="meta">Whether this Worker currently works or lawfully provides the stated service here</div></div><span className={worker.association_status === "verified" ? "status-chip success" : "status-chip warning"}>{human(worker.association_status)}</span></div>
          <div className="list-row"><div><strong>SwiftTip Worker profile</strong><div className="meta">Separate platform status</div></div><span className={worker.worker_status === "active" ? "status-chip success" : "status-chip warning"}>{human(worker.worker_status)}</span></div>
        </section>

        <div className="privacy-inline"><span>✓</span><p>This Venue screen does not expose identity documents, phone number, bank details, individual gratuity totals or Settlement information.</p></div>

        {canManage && pending && (
          <section className="decision-card">
            <span className="eyebrow">One question only</span>
            <h2>Does {worker.display_name} currently work here in this role?</h2>
            <p>Confirming this relationship does not approve SwiftTip identity verification, Payment Provider KYC, banking details or Settlement.</p>
            <form action={confirmAssociation} className="decision-primary"><input type="hidden" name="associationId" value={worker.association_id}/><button className="button button-primary button-large" style={{width:"100%"}} type="submit">Yes, confirm this Worker</button></form>
            <form action={rejectAssociation} className="decision-secondary"><input type="hidden" name="associationId" value={worker.association_id}/><label className="field-label" htmlFor="reject-reason">If you cannot confirm the relationship</label><div className="custom-field"><input id="reject-reason" name="reason" placeholder="Brief reason" required minLength={3}/></div><button className="button button-secondary" style={{width:"100%"}} type="submit">No, I cannot confirm this Worker</button></form>
          </section>
        )}

        {canManage && ["verified", "suspended"].includes(worker.association_status) && (
          <section className="decision-card decision-danger">
            <span className="eyebrow">Relationship change</span>
            <h2>End this Venue association</h2>
            <p>Use this only when the Worker no longer has the relevant relationship with this Venue. Historical transaction records remain intact and the Worker is not globally deleted.</p>
            <form action={endAssociation} className="stack-actions" style={{marginTop:17}}><input type="hidden" name="associationId" value={worker.association_id}/><label className="field-label" htmlFor="end-reason">Reason</label><div className="custom-field"><input id="end-reason" name="reason" placeholder="Worker left Venue, role ended, etc." required minLength={3}/></div><button className="button button-secondary" type="submit">End Venue association</button></form>
          </section>
        )}
      </div>
    </main>
  );
}

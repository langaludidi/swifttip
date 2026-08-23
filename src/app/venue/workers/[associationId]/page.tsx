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

  return (
    <main className="flow-shell">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/venue">←</Link><strong>Worker association</strong><span style={{ width: 42 }} /></header>
        {access.mode === "demo" && <p className="prototype-warning">Preview only — Venue actions are disabled until the new MVP v3 database is connected.</p>}
        {query.error && <p className="prototype-warning" role="alert">{query.error}</p>}
        {query.updated && <p className="status-chip success" role="status">Association updated.</p>}
        <section className="tip-flow">
          <span className="eyebrow">Venue context only</span>
          <h1>{worker.display_name}</h1>
          <p className="lead">{worker.worker_role}</p>
          <div className="dashboard-section" style={{ marginTop: 22 }}>
            <div className="list-row"><strong>Venue association</strong><span className={worker.association_status === "verified" ? "status-chip success" : "status-chip warning"}>{worker.association_status}</span></div>
            <div className="list-row"><strong>SwiftTip Worker status</strong><span className={worker.worker_status === "active" ? "status-chip success" : "status-chip warning"}>{worker.worker_status}</span></div>
          </div>
          <p className="fee-note">This screen intentionally does not expose identity documents, phone number, bank details, individual Tip totals or Settlement information.</p>

          {canManage && worker.association_status === "pending" && (
            <div className="dashboard-section">
              <h2>Confirm this Worker?</h2>
              <p className="lead">Confirm only that this person currently works at this Venue in the role shown. This does not approve KYC or payment Settlement.</p>
              <form action={confirmAssociation} className="stack-actions"><input type="hidden" name="associationId" value={worker.association_id}/><button className="button button-primary button-large" type="submit">Confirm Worker</button></form>
              <form action={rejectAssociation} className="stack-actions" style={{ marginTop: 18 }}><input type="hidden" name="associationId" value={worker.association_id}/><label className="field-label" htmlFor="reject-reason">If you can't confirm this Worker</label><div className="custom-field"><input id="reject-reason" name="reason" placeholder="Reason" required minLength={3}/></div><button className="button button-secondary" type="submit">I can't confirm this Worker</button></form>
            </div>
          )}

          {canManage && ["verified", "suspended"].includes(worker.association_status) && (
            <div className="dashboard-section">
              <h2>End Venue association</h2>
              <p className="lead">This stops new SwiftTip Tips under this Venue. It does not globally suspend or delete the Worker, and historical transactions remain intact.</p>
              <form action={endAssociation} className="stack-actions"><input type="hidden" name="associationId" value={worker.association_id}/><label className="field-label" htmlFor="end-reason">Reason</label><div className="custom-field"><input id="end-reason" name="reason" placeholder="Worker left Venue, role ended, etc." required minLength={3}/></div><button className="button button-secondary" type="submit">End Venue association</button></form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

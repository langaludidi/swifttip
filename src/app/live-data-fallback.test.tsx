import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import WorkerPage from "./worker/page";
import WorkerQrPage from "./worker/qr/page";
import VenuePage from "./venue/page";

const mocks = vi.hoisted(() => ({
  mode: "live" as "live" | "demo",
  rpc: vi.fn(),
  membership: vi.fn(),
  venue: vi.fn(),
  qr: vi.fn(),
}));

vi.mock("@/lib/access", () => ({
  requireWorkerSurface: async () => ({ mode: mocks.mode, userId: "worker-user" }),
  requireVenueSurface: async () => ({ mode: mocks.mode, userId: "venue-user" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3000" }) }));
vi.mock("qrcode", () => ({ default: { toDataURL: mocks.qr } }));
vi.mock("@/app/auth/actions", () => ({ signOutVenue: vi.fn() }));
vi.mock("@/infrastructure/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        limit: () => query,
        maybeSingle: () => table === "venue_memberships" ? mocks.membership() : mocks.venue(),
      };
      return query;
    },
  }),
}));

const summary = { successful_tip_count: 0, gross_gratuity_cents: 0, worker_fee_cents: 0, worker_net_cents: 0, settled_cents: 0, processing_cents: 0 };
const context = { display_name: "Actual Worker", worker_status: "draft", endpoint_status: null, public_token: null, short_code: null, venue_name: null, worker_role: null };
const defaults: Record<string, unknown[]> = {
  get_worker_context: [context],
  get_worker_summary: [summary],
  get_worker_recent_tips: [],
  get_venue_workers: [],
  get_venue_summary: [{ participating_workers: 0, active_workers: 0, successful_tip_count: 0, gross_gratuity_cents: 0 }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.mode = "live";
  mocks.rpc.mockImplementation(async (name: string) => ({ data: defaults[name], error: null }));
  mocks.membership.mockResolvedValue({ data: { venue_id: "venue-1", venue_role: "venue_admin" }, error: null });
  mocks.venue.mockResolvedValue({ data: { trading_name: "Actual Venue", branch_name: null }, error: null });
  mocks.qr.mockResolvedValue("data:image/png;base64,actual");
});

function expectUnavailable(html: string) {
  expect(html).toContain("temporarily unavailable");
  expect(html).toContain("Try again");
  expect(html).toContain("Get help");
  expect(html).not.toContain("Thando");
  expect(html).not.toContain("Riverside");
  expect(html).not.toContain("T4K8P");
  expect(html).not.toContain("YOU EARNED TODAY");
  expect(html).not.toContain("No tips yet");
  expect(html).not.toContain("No participating workers");
}

describe("live dashboards never fall back to preview data", () => {
  it.each(["get_worker_context", "get_worker_summary", "get_worker_recent_tips"])("fails closed on a %s error, even with returned data", async (failed) => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: defaults[name], error: name === failed ? { message: "private error" } : null }));
    const html = renderToStaticMarkup(await WorkerPage());
    expectUnavailable(html);
    expect(html).not.toContain("private error");
  });

  it.each(["get_worker_context", "get_worker_summary", "get_worker_recent_tips"])("does not treat missing %s data as a successful empty result", async (failed) => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === failed ? null : defaults[name], error: null }));
    expectUnavailable(renderToStaticMarkup(await WorkerPage()));
  });

  it("rejects an empty required summary row", async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "get_worker_summary" ? [] : defaults[name], error: null }));
    expectUnavailable(renderToStaticMarkup(await WorkerPage()));
  });

  it("shows real zero earnings and empty history after successful reads", async () => {
    const html = renderToStaticMarkup(await WorkerPage());
    expect(html).toContain("Actual Worker");
    expect(html).toContain("No tips yet");
    expect(html).toContain("YOU EARNED TODAY");
    expect(html).not.toContain("temporarily unavailable");
    expect(html).not.toContain("Thando");
  });

  it.each(["membership", "venue", "get_venue_workers", "get_venue_summary"])("fails closed when the venue %s read fails", async (failed) => {
    if (failed === "membership") mocks.membership.mockResolvedValue({ data: null, error: { message: "denied" } });
    else if (failed === "venue") mocks.venue.mockResolvedValue({ data: null, error: null });
    else mocks.rpc.mockImplementation(async (name: string) => ({ data: defaults[name], error: name === failed ? { message: "denied" } : null }));
    expectUnavailable(renderToStaticMarkup(await VenuePage()));
  });

  it("shows an empty venue roster only after successful reads", async () => {
    const html = renderToStaticMarkup(await VenuePage());
    expect(html).toContain("Actual Venue");
    expect(html).toContain("No participating workers");
    expect(html).not.toContain("Riverside");
    expect(html).not.toContain("temporarily unavailable");
  });

  it.each([WorkerPage, WorkerQrPage, VenuePage])("handles a thrown database failure", async (page) => {
    mocks.rpc.mockRejectedValue(new Error("private connection detail"));
    const html = renderToStaticMarkup(await page());
    expectUnavailable(html);
    expect(html).not.toContain("private connection detail");
  });

  it.each([null, [], [context]])("does not generate a QR when its live context fails", async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: data?.length ? { message: "failed" } : null });
    expectUnavailable(renderToStaticMarkup(await WorkerQrPage()));
    expect(mocks.qr).not.toHaveBeenCalled();
  });

  it("distinguishes an inactive real QR from a read failure", async () => {
    const html = renderToStaticMarkup(await WorkerQrPage());
    expect(html).toContain("Your QR is not active yet");
    expect(html).not.toContain("temporarily unavailable");
    expect(mocks.qr).not.toHaveBeenCalled();
  });

  it("renders the real worker QR after a successful read", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...context, public_token: "actual-token", short_code: "ACTUAL12", endpoint_status: "active" }], error: null });
    const html = renderToStaticMarkup(await WorkerQrPage());
    expect(html).toContain("ACTUAL12");
    expect(html).toContain("Actual Worker");
    expect(mocks.qr).toHaveBeenCalledWith("http://localhost:3000/tip/actual-token", expect.any(Object));
  });

  it("preserves clearly labelled preview screens without live reads", async () => {
    mocks.mode = "demo";
    for (const page of [WorkerPage, WorkerQrPage, VenuePage]) {
      const html = renderToStaticMarkup(await page());
      expect(html).toContain("Preview");
      expect(html).toContain("Thando");
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.membership).not.toHaveBeenCalled();
  });
});

import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const config = getServerConfig();

  if (config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_public_tipping_profile", { p_public_token: token });
    if (error || !data?.length) return NextResponse.json({ available: false, reason: "unavailable" }, { status: 404 });
    const p = data[0];
    return NextResponse.json({
      available: true,
      worker: { displayName: p.display_name, role: p.worker_role, photoUrl: p.public_photo_path },
      venue: { name: p.venue_name, location: p.venue_location },
      verification: { verified: Boolean(p.verified) }
    });
  }

  if (config.SWIFTTIP_ENV === "production") {
    return NextResponse.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "SwiftTip is temporarily unavailable." } }, { status: 503 });
  }

  if (token !== "T4K8P") return NextResponse.json({ available: false, reason: "unavailable" }, { status: 404 });
  return NextResponse.json({ available: true, demo: true, worker: { displayName: "Thando", role: "Fuel Attendant", photoUrl: null }, venue: { name: "Riverside Service Station", location: "Midrand" }, verification: { verified: true } });
}

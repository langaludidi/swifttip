"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const statusSchema = z.enum(["open","in_progress","awaiting_customer","awaiting_worker","awaiting_provider","resolved","closed"]);

export async function updateSupportCase(formData: FormData) {
  const caseId = z.string().uuid().safeParse(String(formData.get("caseId") ?? ""));
  const status = statusSchema.safeParse(String(formData.get("status") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000) || null;
  if (!caseId.success || !status.success) redirect("/admin/support?error=Invalid%20support%20case%20update");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_support_case", { p_case_id: caseId.data, p_status: status.data, p_reason: reason });
  if (error) redirect(`/admin/support/${caseId.data}?error=${encodeURIComponent("The case status could not be updated.")}`);
  redirect(`/admin/support/${caseId.data}?updated=1`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const verificationIdSchema = z.string().uuid();
const decisionSchema = z.enum(["approve", "request_more_information", "reject"]);

export async function decideVerification(formData: FormData) {
  const access = await requireAdminRole(["verification_admin", "super_admin"]);
  if (access.mode !== "live") redirect("/admin/verifications?error=Approval%20actions%20are%20disabled%20in%20preview%20mode");

  const verificationId = verificationIdSchema.safeParse(String(formData.get("verificationId") ?? ""));
  const decision = decisionSchema.safeParse(String(formData.get("decision") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  const documentMatches = formData.get("documentMatches") === "yes";
  const selfieMatches = formData.get("selfieMatches") === "yes";
  const duplicateClear = formData.get("duplicateClear") === "yes";
  if (!verificationId.success || !decision.success) redirect("/admin/verifications?error=Invalid%20verification%20decision");
  if (decision.data !== "approve" && reason.length < 3) redirect(`/admin/verifications/${verificationId.data}?error=${encodeURIComponent("Add a clear reason for this decision")}`);

  const supabase = await createSupabaseServerClient();
  if (decision.data === "approve" && !(documentMatches && selfieMatches && duplicateClear)) {
    redirect(`/admin/verifications/${verificationId.data}?error=${encodeURIComponent("Complete all Phase 1 reviewer confirmations before approval")}`);
  }
  const { error } = await (supabase.rpc as any)("admin_decide_worker_identity_verification", {
    p_verification_id: verificationId.data,
    p_decision: decision.data,
    p_reason: reason || undefined,
    p_document_matches: documentMatches,
    p_selfie_matches: selfieMatches,
    p_duplicate_clear: duplicateClear
  });
  if (error) redirect(`/admin/verifications/${verificationId.data}?error=${encodeURIComponent("The verification decision could not be recorded")}`);

  revalidatePath("/admin/verifications");
  revalidatePath(`/admin/verifications/${verificationId.data}`);
  redirect(`/admin/verifications/${verificationId.data}?decided=${encodeURIComponent(decision.data)}`);
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const schema = z.object({
  category: z.enum(["transaction","settlement","verification","venue","profile","other"]),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
  tipReference: z.string().trim().max(80).optional()
});

export async function createWorkerSupportCase(formData: FormData) {
  const parsed = schema.safeParse({
    category: String(formData.get("category") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    description: String(formData.get("description") ?? ""),
    tipReference: String(formData.get("tipReference") ?? "") || undefined
  });
  if (!parsed.success) redirect(`/worker/support?error=${encodeURIComponent("Check the support details and try again.")}`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("worker_create_support_case", {
    p_category: parsed.data.category,
    p_subject: parsed.data.subject,
    p_description: parsed.data.description,
    p_tip_reference: parsed.data.tipReference || null
  });
  if (error) redirect(`/worker/support?error=${encodeURIComponent(error.message.includes("Tip reference") ? "That transaction reference is not linked to your Worker profile." : "We could not open the support case.")}`);
  redirect(`/worker/support?created=${encodeURIComponent(String(data ?? ""))}`);
}

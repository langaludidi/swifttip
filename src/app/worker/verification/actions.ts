"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const verificationIdSchema = z.string().uuid();
const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maximumBytes = 10 * 1024 * 1024;

function safeExtension(file: File) {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  return "pdf";
}

export async function uploadVerificationEvidence(formData: FormData) {
  const access = await requireWorkerSurface();
  if (access.mode !== "live") redirect("/worker/verification?error=Live%20verification%20is%20not%20configured%20in%20preview%20mode");

  const file = formData.get("evidence");
  if (!(file instanceof File) || file.size === 0) redirect("/worker/verification?error=Choose%20an%20identity%20document%20or%20image");
  if (!allowedTypes.has(file.type)) redirect("/worker/verification?error=Use%20a%20JPG%2C%20PNG%20or%20PDF%20file");
  if (file.size > maximumBytes) redirect("/worker/verification?error=The%20file%20must%20be%2010MB%20or%20smaller");

  const supabase = await createSupabaseServerClient();
  const [{ data: verificationId, error: startError }, contextResult] = await Promise.all([
    supabase.rpc("start_worker_verification", { p_verification_type: "identity" }),
    supabase.rpc("get_worker_context")
  ]);

  const context = (contextResult.data as Array<{ worker_id: string }> | null)?.[0];
  if (startError || !verificationId || !context?.worker_id) redirect("/worker/verification?error=We%20could%20not%20start%20verification");

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${context.worker_id}/${verificationId}/${randomUUID()}.${safeExtension(file)}`;
  const { error: uploadError } = await supabase.storage.from("worker-verification").upload(path, bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600"
  });
  if (uploadError) redirect("/worker/verification?error=We%20could%20not%20upload%20that%20file");

  const { error: registerError } = await supabase.rpc("register_worker_verification_document", {
    p_verification_id: verificationId,
    p_storage_path: path,
    p_document_type: "identity_evidence",
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
    p_sha256_hash: sha256
  });
  if (registerError) redirect("/worker/verification?error=The%20file%20was%20uploaded%20but%20could%20not%20be%20registered.%20Please%20contact%20support");

  revalidatePath("/worker/verification");
  redirect("/worker/verification?uploaded=1");
}

export async function submitVerification(formData: FormData) {
  const access = await requireWorkerSurface();
  if (access.mode !== "live") redirect("/worker/verification?error=Live%20verification%20is%20not%20configured%20in%20preview%20mode");

  const parsed = verificationIdSchema.safeParse(String(formData.get("verificationId") ?? ""));
  if (!parsed.success) redirect("/worker/verification?error=Verification%20reference%20is%20invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_worker_verification", { p_verification_id: parsed.data });
  if (error) redirect("/worker/verification?error=We%20could%20not%20submit%20the%20verification%20for%20review");

  revalidatePath("/worker/verification");
  revalidatePath("/worker/profile");
  redirect("/worker/verification?submitted=1");
}

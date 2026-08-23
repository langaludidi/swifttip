"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const verificationIdSchema = z.string().uuid();
const documentIdSchema = z.string().uuid();
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
  const bucket = supabase.storage.from("worker-verification");
  const { error: uploadError } = await bucket.upload(path, bytes, {
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

  if (registerError) {
    // A Storage object that is not registered is not valid verification evidence.
    // Best-effort cleanup prevents an orphan remaining in the Worker's private folder.
    await bucket.remove([path]);
    redirect("/worker/verification?error=We%20could%20not%20register%20that%20evidence.%20Please%20try%20again");
  }

  revalidatePath("/worker/verification");
  redirect("/worker/verification?uploaded=1");
}

export async function removeVerificationEvidence(formData: FormData) {
  const access = await requireWorkerSurface();
  if (access.mode !== "live") redirect("/worker/verification?error=Evidence%20removal%20is%20not%20available%20in%20preview%20mode");

  const parsed = documentIdSchema.safeParse(String(formData.get("documentId") ?? ""));
  if (!parsed.success) redirect("/worker/verification?error=Evidence%20reference%20is%20invalid");

  const supabase = await createSupabaseServerClient();
  const { data: path, error: prepareError } = await supabase.rpc("prepare_worker_verification_document_removal", {
    p_document_id: parsed.data
  });
  if (prepareError || typeof path !== "string" || !path) {
    redirect("/worker/verification?error=That%20evidence%20cannot%20be%20removed%20in%20its%20current%20state");
  }

  // Finalisation is authoritative: it succeeds only if the exact bound Storage object
  // no longer exists. Calling it even after a Storage error also repairs already-missing
  // objects without falsely marking a still-present file as removed.
  await supabase.storage.from("worker-verification").remove([path]);
  const { error: finalizeError } = await supabase.rpc("finalize_worker_verification_document_removal", {
    p_document_id: parsed.data
  });
  if (finalizeError) redirect("/worker/verification?error=We%20could%20not%20remove%20that%20evidence");

  revalidatePath("/worker/verification");
  redirect("/worker/verification?removed=1");
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

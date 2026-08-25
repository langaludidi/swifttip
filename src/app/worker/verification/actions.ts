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
const maximumSelfieBytes = 5 * 1024 * 1024;

const identityDetailsSchema = z.object({
  legalFirstName: z.string().trim().min(2).max(80),
  legalLastName: z.string().trim().min(2).max(80),
  documentType: z.enum(["sa_smart_id", "sa_green_id", "passport"]),
  identityNumber: z.string().trim().min(6).max(30),
  consent: z.literal("yes")
});

function safeExtension(file: File) {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  return "pdf";
}

function signatureMatches(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "application/pdf") return bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

export async function uploadVerificationEvidence(formData: FormData) {
  const access = await requireWorkerSurface();
  if (access.mode !== "live") redirect("/worker/verification?error=Live%20verification%20is%20not%20configured%20in%20preview%20mode");

  const file = formData.get("evidence");
  if (!(file instanceof File) || file.size === 0) redirect("/worker/verification?error=Choose%20an%20identity%20document%20or%20image");
  if (!allowedTypes.has(file.type)) redirect("/worker/verification?error=Use%20a%20JPG%2C%20PNG%20or%20PDF%20file");
  if (file.size > maximumBytes) redirect("/worker/verification?error=The%20file%20must%20be%2010MB%20or%20smaller");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) redirect("/worker/verification?error=The%20file%20contents%20do%20not%20match%20its%20declared%20type");

  const supabase = await createSupabaseServerClient();
  const [{ data: verificationId, error: startError }, contextResult] = await Promise.all([
    supabase.rpc("start_worker_verification", { p_verification_type: "identity" }),
    supabase.rpc("get_worker_context")
  ]);

  const context = (contextResult.data as Array<{ worker_id: string }> | null)?.[0];
  if (startError || !verificationId || !context?.worker_id) redirect("/worker/verification?error=We%20could%20not%20start%20verification");

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
    p_document_type: "identity_document",
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
    p_sha256_hash: sha256
  });

  if (registerError) {
    await bucket.remove([path]);
    redirect("/worker/verification?error=We%20could%20not%20register%20that%20evidence.%20Please%20try%20again");
  }

  revalidatePath("/worker/verification");
  redirect("/worker/verification?uploaded=1");
}

export async function saveIdentityDetails(formData: FormData) {
  const access = await requireWorkerSurface();
  if (access.mode !== "live") redirect("/worker/verification?error=Identity%20details%20are%20not%20available%20in%20preview%20mode");

  const parsed = identityDetailsSchema.safeParse({
    legalFirstName: formData.get("legalFirstName"),
    legalLastName: formData.get("legalLastName"),
    documentType: formData.get("documentType"),
    identityNumber: formData.get("identityNumber"),
    consent: formData.get("consent")
  });
  if (!parsed.success) redirect("/worker/verification?error=Complete%20the%20identity%20details%20and%20consent%20before%20continuing");

  const supabase = await createSupabaseServerClient();
  const { error: startError } = await supabase.rpc("start_worker_verification", { p_verification_type: "identity" });
  if (startError) redirect("/worker/verification?error=We%20could%20not%20start%20identity%20verification");
  const { error } = await (supabase.rpc as any)("save_worker_identity_claim", {
    p_legal_first_name: parsed.data.legalFirstName,
    p_legal_last_name: parsed.data.legalLastName,
    p_document_type: parsed.data.documentType,
    p_identity_number: parsed.data.identityNumber,
    p_consent_version: "identity-pilot-v1"
  });
  if (error) {
    const message = String(error.message ?? "").includes("already connected")
      ? "This identity is already connected to another SwiftTip Worker account"
      : String(error.message ?? "").includes("valid 13-digit")
        ? "Enter a valid 13-digit South African identity number"
        : "We could not save those identity details";
    redirect(`/worker/verification?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/worker/verification");
  redirect("/worker/verification?details=1");
}

export async function uploadLiveSelfie(formData: FormData) {
  const access = await requireWorkerSurface();
  if (access.mode !== "live") redirect("/worker/verification?error=Live%20selfie%20capture%20is%20not%20available%20in%20preview%20mode");
  const file = formData.get("selfie");
  const captureMethod = String(formData.get("captureMethod") ?? "");
  if (!(file instanceof File) || file.size === 0) redirect("/worker/verification?error=Capture%20a%20clear%20live%20selfie");
  if (!["image/jpeg", "image/png"].includes(file.type)) redirect("/worker/verification?error=The%20selfie%20must%20be%20a%20JPG%20or%20PNG%20image");
  if (file.size > maximumSelfieBytes) redirect("/worker/verification?error=The%20selfie%20must%20be%205MB%20or%20smaller");
  if (!["browser_camera", "camera_file_fallback"].includes(captureMethod)) redirect("/worker/verification?error=The%20selfie%20capture%20method%20is%20invalid");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) redirect("/worker/verification?error=The%20selfie%20file%20is%20invalid");
  const supabase = await createSupabaseServerClient();
  const [{ data: verificationId, error: startError }, contextResult, claimResult] = await Promise.all([
    supabase.rpc("start_worker_verification", { p_verification_type: "identity" }),
    supabase.rpc("get_worker_context"),
    (supabase.rpc as any)("get_worker_identity_claim")
  ]);
  const context = (contextResult.data as Array<{ worker_id: string }> | null)?.[0];
  if (startError || !verificationId || !context?.worker_id) redirect("/worker/verification?error=We%20could%20not%20start%20verification");
  if (claimResult.error || !claimResult.data?.length) redirect("/worker/verification?error=Save%20your%20identity%20details%20before%20capturing%20a%20selfie");

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${context.worker_id}/${verificationId}/${randomUUID()}.${safeExtension(file)}`;
  const bucket = supabase.storage.from("worker-verification");
  const { error: uploadError } = await bucket.upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (uploadError) redirect("/worker/verification?error=We%20could%20not%20upload%20the%20live%20selfie");
  const { data: documentId, error: registerError } = await supabase.rpc("register_worker_verification_document", {
    p_verification_id: verificationId,
    p_storage_path: path,
    p_document_type: "live_selfie",
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
    p_sha256_hash: sha256
  });
  if (registerError || !documentId) {
    await bucket.remove([path]);
    redirect("/worker/verification?error=We%20could%20not%20register%20the%20live%20selfie");
  }
  const { error: attestError } = await (supabase.rpc as any)("attest_worker_live_selfie", {
    p_verification_id: verificationId,
    p_capture_method: captureMethod
  });
  if (attestError) {
    // Registration and attestation are separate calls because the Storage object
    // must exist first. Roll both layers back when attestation fails so the
    // one-selfie constraint never strands the Worker in an unretryable state.
    await bucket.remove([path]);
    await supabase.rpc("finalize_worker_verification_document_removal", {
      p_document_id: documentId
    });
    redirect("/worker/verification?error=The%20live%20selfie%20could%20not%20be%20completed.%20Please%20try%20again");
  }
  revalidatePath("/worker/verification");
  redirect("/worker/verification?selfie=1");
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
  // no longer exists. This also repairs metadata cleanly when the object was already absent.
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

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const uuid=z.string().uuid();
const title=z.string().trim().min(3).max(240);
const body=z.string().min(50).max(100000);
const reason=z.string().trim().min(3).max(2000);

function route(id:string,suffix:string){return `/admin/legal/${encodeURIComponent(id)}?${suffix}`;}
function blockersFrom(value:FormDataEntryValue|null){return String(value??"").split("\n").map(v=>v.trim()).filter(Boolean).slice(0,50);}

export async function updateLegalDraft(formData:FormData){
  const id=uuid.safeParse(String(formData.get("termsVersionId")??""));
  const parsedTitle=title.safeParse(String(formData.get("title")??""));
  const parsedBody=body.safeParse(String(formData.get("contentBody")??""));
  if(!id.success||!parsedTitle.success||!parsedBody.success)redirect("/admin/legal?error=Invalid%20legal%20draft");
  const supabase=await createSupabaseServerClient();
  const reviewNotes=String(formData.get("reviewNotes")??"").trim()||undefined;
  const {error}=await supabase.rpc("admin_update_legal_draft",{
    p_terms_version_id:id.data,
    p_title:parsedTitle.data,
    p_content_body:parsedBody.data,
    p_legal_blockers:blockersFrom(formData.get("blockers")),
    p_review_notes:reviewNotes
  });
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"saved=1"));
}

export async function submitLegalForReview(formData:FormData){
  const id=uuid.safeParse(String(formData.get("termsVersionId")??""));
  if(!id.success)redirect("/admin/legal?error=Invalid%20legal%20document");
  const note=String(formData.get("reason")??"").trim()||undefined;
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_submit_legal_document_for_review",{p_terms_version_id:id.data,p_reason:note});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"submitted=1"));
}

export async function recordLegalReview(formData:FormData){
  const id=uuid.safeParse(String(formData.get("termsVersionId")??""));
  const notes=reason.safeParse(String(formData.get("reviewNotes")??""));
  if(!id.success||!notes.success)redirect("/admin/legal?error=Invalid%20review%20record");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_record_legal_review",{p_terms_version_id:id.data,p_legal_blockers:blockersFrom(formData.get("blockers")),p_review_notes:notes.data});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"reviewed=1"));
}

export async function returnLegalToDraft(formData:FormData){
  const id=uuid.safeParse(String(formData.get("termsVersionId")??""));
  const why=reason.safeParse(String(formData.get("reason")??""));
  if(!id.success||!why.success)redirect("/admin/legal?error=Invalid%20return%20request");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_return_legal_document_to_draft",{p_terms_version_id:id.data,p_reason:why.data});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"draft=1"));
}

export async function approveLegalDocument(formData:FormData){
  const id=uuid.safeParse(String(formData.get("termsVersionId")??""));
  const why=reason.safeParse(String(formData.get("reason")??""));
  if(!id.success||!why.success)redirect("/admin/legal?error=Invalid%20approval%20request");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_approve_legal_document",{p_terms_version_id:id.data,p_reason:why.data});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"approved=1"));
}

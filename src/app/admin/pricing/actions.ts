"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const uuid = z.string().uuid();
const reason = z.string().trim().min(3).max(2000);
const bps = z.number().int().min(0).max(10000);
const nonNegative = z.number().int().min(0);
const positive = z.number().int().positive();

function route(id:string,suffix:string){return `/admin/pricing/${encodeURIComponent(id)}?${suffix}`;}
function blockersFrom(value:FormDataEntryValue|null){return String(value??"").split("\n").map(v=>v.trim()).filter(Boolean).slice(0,50);}
function integer(value:FormDataEntryValue|null){
  const text=String(value??"").trim();
  return /^-?\d+$/.test(text)?Number(text):Number.NaN;
}
function optionalInteger(value:FormDataEntryValue|null){
  const text=String(value??"").trim();
  return text===""?null:(/^-?\d+$/.test(text)?Number(text):Number.NaN);
}

export async function updatePricingDraft(formData:FormData){
  const id=uuid.safeParse(String(formData.get("pricingVersionId")??""));
  const worker=bps.safeParse(integer(formData.get("workerFeeBps")));
  const fixed=nonNegative.safeParse(integer(formData.get("customerFixedFeeCents")));
  const customer=bps.safeParse(integer(formData.get("customerFeeBps")));
  const rawCap=optionalInteger(formData.get("customerFeeCapCents"));
  const cap=rawCap===null?{success:true as const,data:null}:nonNegative.safeParse(rawCap);
  const minimum=positive.safeParse(integer(formData.get("minimumGratuityCents")));
  const maximum=positive.safeParse(integer(formData.get("maximumGratuityCents")));
  const high=positive.safeParse(integer(formData.get("highValueThresholdCents")));
  if(!id.success||!worker.success||!fixed.success||!customer.success||!cap.success||!minimum.success||!maximum.success||!high.success){
    redirect("/admin/pricing?error=Invalid%20pricing%20draft");
  }
  if(maximum.data<minimum.data||high.data<minimum.data||high.data>maximum.data){
    redirect(route(id.data,"error=Invalid%20gratuity%20range%20or%20high-value%20threshold"));
  }
  // PostgREST accepts null for this nullable bigint argument; generated function
  // argument types do not currently encode SQL parameter nullability.
  const capForRpc=cap.data as number;
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_update_pricing_draft",{
    p_pricing_version_id:id.data,
    p_worker_fee_bps:worker.data,
    p_customer_fixed_fee_cents:fixed.data,
    p_customer_fee_bps:customer.data,
    p_customer_fee_cap_cents:capForRpc,
    p_minimum_gratuity_cents:minimum.data,
    p_maximum_gratuity_cents:maximum.data,
    p_high_value_threshold_cents:high.data,
    p_commercial_blockers:blockersFrom(formData.get("blockers")),
    p_review_notes:String(formData.get("reviewNotes")??"").trim()||undefined
  });
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"saved=1"));
}

export async function submitPricingForReview(formData:FormData){
  const id=uuid.safeParse(String(formData.get("pricingVersionId")??""));
  if(!id.success)redirect("/admin/pricing?error=Invalid%20pricing%20version");
  const note=String(formData.get("reason")??"").trim()||undefined;
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_submit_pricing_for_review",{p_pricing_version_id:id.data,p_reason:note});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"submitted=1"));
}

export async function recordPricingReview(formData:FormData){
  const id=uuid.safeParse(String(formData.get("pricingVersionId")??""));
  const notes=reason.safeParse(String(formData.get("reviewNotes")??""));
  if(!id.success||!notes.success)redirect("/admin/pricing?error=Invalid%20review%20record");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_record_pricing_review",{p_pricing_version_id:id.data,p_commercial_blockers:blockersFrom(formData.get("blockers")),p_review_notes:notes.data});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"reviewed=1"));
}

export async function returnPricingToDraft(formData:FormData){
  const id=uuid.safeParse(String(formData.get("pricingVersionId")??""));
  const why=reason.safeParse(String(formData.get("reason")??""));
  if(!id.success||!why.success)redirect("/admin/pricing?error=Invalid%20return%20request");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_return_pricing_to_draft",{p_pricing_version_id:id.data,p_reason:why.data});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"draft=1"));
}

export async function approvePricing(formData:FormData){
  const id=uuid.safeParse(String(formData.get("pricingVersionId")??""));
  const why=reason.safeParse(String(formData.get("reason")??""));
  if(!id.success||!why.success)redirect("/admin/pricing?error=Invalid%20approval%20request");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_approve_pricing",{p_pricing_version_id:id.data,p_reason:why.data});
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"approved=1"));
}

export async function savePricingEconomics(formData:FormData){
  const id=uuid.safeParse(String(formData.get("pricingVersionId")??""));
  const providerVariable=bps.safeParse(integer(formData.get("providerVariableBps")));
  const providerFixed=nonNegative.safeParse(integer(formData.get("providerFixedCents")));
  const split=nonNegative.safeParse(integer(formData.get("splitCostCents")));
  const payout=nonNegative.safeParse(integer(formData.get("allocatedPayoutCostCents")));
  const reserve=bps.safeParse(integer(formData.get("refundChargebackReserveBps")));
  const support=nonNegative.safeParse(integer(formData.get("supportReconciliationCostCents")));
  if(!id.success||!providerVariable.success||!providerFixed.success||!split.success||!payout.success||!reserve.success||!support.success){
    redirect("/admin/pricing?error=Invalid%20economics%20assumptions");
  }
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("admin_save_pricing_economics",{
    p_pricing_version_id:id.data,p_provider_variable_bps:providerVariable.data,p_provider_fixed_cents:providerFixed.data,
    p_split_cost_cents:split.data,p_allocated_payout_cost_cents:payout.data,p_refund_chargeback_reserve_bps:reserve.data,
    p_support_reconciliation_cost_cents:support.data,p_evidence_reference:String(formData.get("evidenceReference")??"").trim(),
    p_assumption_notes:String(formData.get("assumptionNotes")??"").trim()
  });
  if(error)redirect(route(id.data,`error=${encodeURIComponent(error.message)}`));
  redirect(route(id.data,"economics=1"));
}

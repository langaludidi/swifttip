"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const uuid=z.string().uuid();

export async function markNotificationRead(formData:FormData){
  const parsed=uuid.safeParse(String(formData.get("notificationId")??""));
  if(!parsed.success)redirect("/notifications?error=Invalid%20notification");
  const supabase=await createSupabaseServerClient();
  const {error}=await supabase.rpc("mark_my_notification_read",{p_notification_id:parsed.data});
  if(error)redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  redirect("/notifications");
}

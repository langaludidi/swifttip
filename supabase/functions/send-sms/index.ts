import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { phone, otp } = await req.json()
  
  const response = await fetch("https://api.bulksms.com/v1/messages", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Deno.env.get("BULKSMS_BASIC")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phone,
      body: `Your SwiftTip OTP is: ${otp}. Valid for 10 minutes.`,
    }),
  })

  const result = await response.json()
  console.log("BulkSMS response:", JSON.stringify(result))

  return new Response(JSON.stringify({ success: response.ok, result }), {
    headers: { "Content-Type": "application/json" },
    status: response.ok ? 200 : 400,
  })
})

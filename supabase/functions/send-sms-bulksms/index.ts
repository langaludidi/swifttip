import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type SendSmsPayload = {
  user: { phone?: string };
  sms: { otp?: string };
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const requiredSecret = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  try {
    const hookSecret = requiredSecret("SEND_SMS_HOOK_SECRET").replace(
      /^v1,whsec_/,
      "",
    );
    const tokenId = requiredSecret("BULKSMS_TOKEN_ID");
    const tokenSecret = requiredSecret("BULKSMS_TOKEN_SECRET");
    const payload = await request.text();
    const webhook = new Webhook(hookSecret);
    const { user, sms } = webhook.verify(
      payload,
      Object.fromEntries(request.headers),
    ) as SendSmsPayload;

    const phone = user.phone?.trim() ?? "";
    const otp = sms.otp?.trim() ?? "";

    if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{6,10}$/.test(otp)) {
      return json(400, {
        error: { http_code: 400, message: "Invalid SMS hook payload" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const senderId = Deno.env.get("BULKSMS_SENDER_ID")?.trim();
    const message: Record<string, unknown> = {
      to: phone,
      body: `Your SwiftTip verification code is ${otp}. It expires shortly. Do not share this code.`,
    };
    if (senderId) message.from = senderId;

    let response: Response;
    try {
      response = await fetch("https://api.bulksms.com/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const providerRequestId = response.headers.get("x-request-id");
      console.error("BulkSMS delivery request failed", {
        status: response.status,
        providerRequestId,
      });
      return json(502, {
        error: {
          http_code: response.status,
          message: "SMS provider rejected the delivery request",
        },
      });
    }

    return json(200, {});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isSignatureError = /signature|webhook/i.test(message);
    console.error("Send SMS hook failed", {
      category: isSignatureError ? "signature" : "runtime",
    });
    return json(isSignatureError ? 401 : 500, {
      error: {
        http_code: isSignatureError ? 401 : 500,
        message: isSignatureError
          ? "Invalid hook signature"
          : "Unable to submit SMS",
      },
    });
  }
});

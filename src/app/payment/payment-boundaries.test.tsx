import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { POST as initiatePayment } from "../api/tips/[reference]/payments/route";
import PaymentResultPage from "./result/page";

const originalEnv = { ...process.env };

function setPaymentEnv(enabled: boolean, provider = "unconfigured") {
  process.env.PAYMENTS_ENABLED = enabled ? "true" : "false";
  process.env.PAYMENT_PROVIDER = provider;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("pre-live payment boundaries", () => {
  it("rejects payment initiation before inspecting or creating provider state", async () => {
    setPaymentEnv(false, "unconfigured");

    const response = await initiatePayment(
      new Request("https://staging.example/api/tips/ST-NOT-REAL/payments", { method: "POST" }),
      { params: Promise.resolve({ reference: "ST-NOT-REAL" }) },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "PAYMENTS_DISABLED",
        message: "SwiftTip live payments are intentionally disabled.",
        reference: "ST-NOT-REAL",
      },
    });
  });

  it("still rejects initiation when the flag is on but no provider is configured", async () => {
    setPaymentEnv(true, "unconfigured");

    const response = await initiatePayment(
      new Request("https://staging.example/api/tips/ST-NOT-REAL/payments", { method: "POST" }),
      { params: Promise.resolve({ reference: "ST-NOT-REAL" }) },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "PAYMENT_PROVIDER_NOT_CONFIGURED" },
    });
  });

  it("does not infer success from browser return parameters", async () => {
    const page = await PaymentResultPage({
      searchParams: Promise.resolve({
        status: "success",
        reference: "ST-FABRICATED",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("We cannot confirm this payment from the return link alone.");
    expect(html).toContain("No success state has been inferred from the URL.");
    expect(html).not.toContain("Payment successful");
    expect(html).not.toContain("Tip received");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { getServerConfig } from "./config";

const originalEnv = { ...process.env };

function clearSwiftTipEnv() {
  delete process.env.SWIFTTIP_ENV;
  delete process.env.VERCEL_ENV;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.PAYMENTS_ENABLED;
  delete process.env.PAYMENT_PROVIDER;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("SwiftTip runtime configuration", () => {
  it("fails closed in staging when explicit Supabase variables are absent", () => {
    clearSwiftTipEnv();
    process.env.SWIFTTIP_ENV = "staging";

    const config = getServerConfig();

    expect(config.environment).toBe("staging");
    expect(config.databaseConfigured).toBe(false);
    expect(config.supabaseConfigSource).toBe("none");
    expect(config.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
    expect(config.demoMode).toBe(true);
    expect(config.paymentsEnabled).toBe(false);
  });

  it("fails closed in production when explicit Supabase variables are absent", () => {
    clearSwiftTipEnv();
    process.env.SWIFTTIP_ENV = "production";

    const config = getServerConfig();

    expect(config.environment).toBe("production");
    expect(config.databaseConfigured).toBe(false);
    expect(config.supabaseConfigSource).toBe("none");
    expect(config.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
    expect(config.demoMode).toBe(false);
    expect(config.paymentsEnabled).toBe(false);
  });

  it("uses explicit Supabase environment configuration in staging", () => {
    clearSwiftTipEnv();
    process.env.SWIFTTIP_ENV = "staging";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    const config = getServerConfig();

    expect(config.databaseConfigured).toBe(true);
    expect(config.supabaseConfigSource).toBe("environment");
    expect(config.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_test");
    expect(config.demoMode).toBe(false);
  });

  it("fails closed when only part of the Supabase configuration is present", () => {
    clearSwiftTipEnv();
    process.env.SWIFTTIP_ENV = "staging";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const config = getServerConfig();

    expect(config.databaseConfigured).toBe(false);
    expect(config.supabaseConfigSource).toBe("none");
    expect(config.paymentsEnabled).toBe(false);
  });

  it("does not enable payments merely because the database is configured", () => {
    clearSwiftTipEnv();
    process.env.SWIFTTIP_ENV = "staging";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.PAYMENT_PROVIDER = "unconfigured";

    const config = getServerConfig();

    expect(config.databaseConfigured).toBe(true);
    expect(config.paymentsEnabled).toBe(false);
    expect(config.PAYMENT_PROVIDER).toBe("unconfigured");
  });
});

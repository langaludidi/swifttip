import { describe, expect, it } from "vitest";
import {
  HttpRequestError,
  classifySupabaseFailure,
  readJsonBody
} from "./http-resilience";

describe("readJsonBody", () => {
  it("accepts bounded JSON", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true })
    });
    await expect(readJsonBody(request, 1024)).resolves.toEqual({ ok: true });
  });

  it("rejects declared oversized payloads before parsing", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "2048" },
      body: "{}"
    });
    await expect(readJsonBody(request, 1024)).rejects.toMatchObject<HttpRequestError>({ status: 413, code: "PAYLOAD_TOO_LARGE" });
  });

  it("rejects actual oversized payloads even without content-length", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(2048) })
    });
    await expect(readJsonBody(request, 1024)).rejects.toMatchObject<HttpRequestError>({ status: 413, code: "PAYLOAD_TOO_LARGE" });
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json"
    });
    await expect(readJsonBody(request)).rejects.toMatchObject<HttpRequestError>({ status: 400, code: "INVALID_JSON" });
  });

  it("rejects a non-JSON content type", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}"
    });
    await expect(readJsonBody(request)).rejects.toMatchObject<HttpRequestError>({ status: 415, code: "UNSUPPORTED_MEDIA_TYPE" });
  });
});

describe("classifySupabaseFailure", () => {
  it("classifies connection and pool errors as unavailable", () => {
    expect(classifySupabaseFailure({ code: "PGRST003", message: "pool acquisition timeout" })).toBe("unavailable");
    expect(classifySupabaseFailure({ code: "08006", message: "connection failure" })).toBe("unavailable");
  });

  it("classifies retryable transaction failures", () => {
    expect(classifySupabaseFailure({ code: "40001" })).toBe("transient");
    expect(classifySupabaseFailure({ code: "40P01" })).toBe("transient");
  });

  it("separates database conflicts and domain exceptions", () => {
    expect(classifySupabaseFailure({ code: "23505" })).toBe("conflict");
    expect(classifySupabaseFailure({ code: "P0001" })).toBe("domain");
  });
});

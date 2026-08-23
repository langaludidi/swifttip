export const PUBLIC_JSON_BODY_LIMIT_BYTES = 16 * 1024;

export class HttpRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly publicMessage: string
  ) {
    super(publicMessage);
    this.name = "HttpRequestError";
  }
}

export async function readJsonBody(request: Request, maxBytes = PUBLIC_JSON_BODY_LIMIT_BYTES): Promise<unknown> {
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throw new HttpRequestError(415, "UNSUPPORTED_MEDIA_TYPE", "Send this request as JSON.");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const declaredBytes = Number(declaredLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new HttpRequestError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
    }
  }

  const raw = await request.text();
  const actualBytes = new TextEncoder().encode(raw).byteLength;
  if (actualBytes > maxBytes) {
    throw new HttpRequestError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  }
  if (!raw.trim()) {
    throw new HttpRequestError(400, "INVALID_JSON", "A JSON request body is required.");
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpRequestError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
}

export type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type SupabaseFailureKind = "unavailable" | "transient" | "conflict" | "domain" | "unknown";

export function classifySupabaseFailure(error: SupabaseErrorLike | null | undefined): SupabaseFailureKind {
  const code = String(error?.code ?? "").toUpperCase();
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  if (
    code.startsWith("08") ||
    code.startsWith("53") ||
    ["57014", "57P01", "57P02", "57P03", "58000", "58030", "PGRST000", "PGRST001", "PGRST002", "PGRST003"].includes(code) ||
    /connection|connect timeout|pool timeout|upstream|database is unavailable|terminating connection/.test(message)
  ) {
    return "unavailable";
  }

  if (["40001", "40P01", "55P03"].includes(code)) return "transient";
  if (["23505", "23P01"].includes(code)) return "conflict";
  if (code === "P0001") return "domain";
  return "unknown";
}

export function retryAfterHeaders(seconds = 3) {
  return { "Retry-After": String(Math.max(1, Math.ceil(seconds))) };
}

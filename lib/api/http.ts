export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function bearerToken(): string {
  return process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN ?? "dev-local-token";
}

// crypto.randomUUID() requires a secure context (HTTPS, or localhost) --
// it's simply undefined over plain http:// on a real host/IP, which is
// exactly how this gets hit before TLS is set up. crypto.getRandomValues()
// has no such restriction, so build a UUID v4 by hand from it instead of
// depending on randomUUID() being present.
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${bearerToken()}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init?.idempotencyKey) {
    headers.set("Idempotency-Key", init.idempotencyKey);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const envelope =
      data && typeof data === "object" && "error" in data
        ? (data as { error?: { message?: unknown } }).error
        : undefined;
    const message =
      (envelope && typeof envelope === "object" && "message" in envelope
        ? String(envelope.message)
        : undefined) ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

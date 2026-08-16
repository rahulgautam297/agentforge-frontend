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

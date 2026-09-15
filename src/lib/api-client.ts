export type ApiError = { code: string; message: string };

export class ApiRequestError extends Error {
  code: string;
  constructor(err: ApiError) {
    super(err.message);
    this.code = err.code;
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });

  let body: { ok: boolean; data?: T; error?: ApiError };
  try {
    body = await res.json();
  } catch {
    throw new ApiRequestError({ code: "NETWORK_ERROR", message: "Couldn't reach AIVA. Please check your connection ♡" });
  }

  if (!res.ok || !body.ok) {
    throw new ApiRequestError(body.error ?? { code: "SERVER_ERROR", message: "Something went wrong. Please try again ♡" });
  }

  return body.data as T;
}

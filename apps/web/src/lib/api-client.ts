"use client";

/** Browser calls to the NestJS API. */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: { issues?: { path: string; message: string }[]; unavailable?: string[] } = {},
  ) {
    super(message);
  }
}

/** Optional login token provider, set once customer login exists. */
let tokenProvider: (() => Promise<string | null>) | null = null;
export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

export async function apiFetch<T>(path: string, init: { method?: string; json?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null;
  let res: Response;
  try {
    res = await fetch(`${PUBLIC_API_URL}${path}`, {
      method: init.method ?? (init.json !== undefined ? "POST" : "GET"),
      headers: { ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Can't reach The Coffee Cat right now. Check your connection and try again.", 0);
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = typeof body?.message === "string" ? body.message : res.status === 429 ? "Too many tries. Wait a minute and try again." : "Something went wrong. Try again.";
    throw new ApiError(message, res.status, body ?? {});
  }
  return body as T;
}

export type LiveState = "connecting" | "live" | "reconnecting";

/** Reads a Server-Sent Events stream through fetch, with reconnect and backoff. */
export function subscribeStream(path: string, handlers: { onEvent: (type: string, data: unknown) => void; onState?: (s: LiveState) => void }) {
  const controller = new AbortController();
  let attempt = 0;
  let stopped = false;
  void (async () => {
    while (!stopped) {
      handlers.onState?.(attempt === 0 ? "connecting" : "reconnecting");
      try {
        const token = tokenProvider ? await tokenProvider() : null;
        const res = await fetch(`${PUBLIC_API_URL}${path}`, { headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, signal: controller.signal });
        if (res.status === 404) return; // order not visible to us: don't retry forever
        if (!res.ok || !res.body) throw new Error(String(res.status));
        attempt = 0;
        handlers.onState?.("live");
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let cut;
          while ((cut = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            let type = "message";
            let data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event: ")) type = line.slice(7);
              else if (line.startsWith("data: ")) data += line.slice(6);
            }
            if (type !== "ping" && data) handlers.onEvent(type, JSON.parse(data));
          }
        }
      } catch {
        if (stopped) return;
      }
      attempt++;
      await new Promise((r) => setTimeout(r, Math.min(15_000, 1000 * 2 ** Math.min(attempt, 4))));
    }
  })();
  return () => {
    stopped = true;
    controller.abort();
  };
}

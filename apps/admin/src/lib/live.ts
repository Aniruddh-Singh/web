import { authHeader, API_URL } from "./api";

export type LiveState = "connecting" | "live" | "reconnecting";

/**
 * Subscribes to a Server-Sent Events endpoint with the staff login token (EventSource can't send
 * headers, so this reads the stream through fetch). Reconnects with backoff; `onReconnect` lets
 * the caller re-fetch anything missed while offline.
 */
export function subscribe(
  path: string,
  handlers: { onEvent: (type: string, data: unknown) => void; onState: (s: LiveState) => void; onReconnect?: () => void },
) {
  const controller = new AbortController();
  let attempt = 0;
  let stopped = false;

  const run = async () => {
    while (!stopped) {
      handlers.onState(attempt === 0 ? "connecting" : "reconnecting");
      try {
        const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "text/event-stream", ...(await authHeader()) }, signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        if (attempt > 0) handlers.onReconnect?.();
        attempt = 0;
        handlers.onState("live");

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
  };
  void run();

  return () => {
    stopped = true;
    controller.abort();
  };
}

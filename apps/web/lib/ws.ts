import { WS_URL } from "./constants";
import type { WsMessage } from "@/types/trading";

type Listener = (data: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

let ws: WebSocket | null = null;

function connect(): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;
  if (ws && ws.readyState === WebSocket.CONNECTING) return ws;

  ws = new WebSocket(WS_URL);

  ws.onmessage = (event) => {
    try {
      const raw = JSON.parse(event.data) as WsMessage;

      if (raw.commandType) {
        let parsedData: unknown = raw;
        if (raw.data) {
          try {
            parsedData = JSON.parse(raw.data);
          } catch {
            parsedData = raw.data;
          }
        }
        const subs = listeners.get(raw.commandType);
        if (subs) {
          for (const cb of subs) cb(parsedData);
        }
      } else if (raw.symbol && raw.price !== undefined) {
        const subs = listeners.get("price");
        if (subs) {
          for (const cb of subs) cb(raw);
        }
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    ws = null;
    setTimeout(connect, 2000);
  };

  ws.onerror = () => {
    ws?.close();
  };

  return ws;
}

export function subscribe(type: string, cb: Listener): () => void {
  const sock = connect();

  let subs = listeners.get(type);
  if (!subs) {
    subs = new Set();
    listeners.set(type, subs);
  }
  subs.add(cb);

  return () => {
    const set = listeners.get(type);
    if (set) {
      set.delete(cb);
      if (set.size === 0) listeners.delete(type);
    }
  };
}

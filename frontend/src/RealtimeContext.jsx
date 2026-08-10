import { createContext, useContext, useEffect, useRef } from "react";
import { getToken } from "./api/client";
import { useAuth } from "./AuthContext";

const RealtimeContext = createContext(null);

/**
 * Единое WebSocket-соединение на всё приложение — раньше каждый компонент
 * (App.jsx для счётчиков, MessageThread.jsx для живых сообщений) открывал
 * СВОЙ сокет независимо, что давало 2 параллельных соединения на одного
 * пользователя одновременно при просмотре переписки. Теперь соединение
 * одно, компоненты подписываются на события через useRealtimeEvent.
 */
export function RealtimeProvider({ children }) {
  const { isAuthed } = useAuth();
  const listenersRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthed) return;

    let ws = null;
    let reconnectTimer = null;
    let attempt = 0;
    let closedByCleanup = false;

    function connect() {
      const token = getToken();
      if (!token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          listenersRef.current.forEach((fn) => fn(data));
        } catch {
          // не наш формат — игнорируем, не роняем соединение
        }
      };

      ws.onclose = () => {
        if (closedByCleanup) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [isAuthed]);

  return <RealtimeContext.Provider value={listenersRef}>{children}</RealtimeContext.Provider>;
}

/** Подписка на real-time события — множество компонентов могут слушать
 * одновременно, каждый сам решает, что делать с конкретным типом события. */
export function useRealtimeEvent(onEvent) {
  const listenersRef = useContext(RealtimeContext);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!listenersRef) return;
    const fn = (data) => onEventRef.current(data);
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, [listenersRef]);
}

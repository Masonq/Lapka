import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useDelayedLoading } from "../useDelayedLoading";
import { useRealtimeEvent } from "../RealtimeContext";
import { useTranslation } from "react-i18next";

export default function MessageThread() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { userId: myId } = useAuth();
  const { showToast } = useToast();
  const [partner, setPartner] = useState(null);
  const showPartnerSkeleton = useDelayedLoading(partner === null);
  const [messages, setMessages] = useState(null);
  const showSkeleton = useDelayedLoading(messages === null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  useDocumentTitle(partner ? partner.display_name : t("message_thread.title"));

  function load() {
    api.messageThread(userId).then(setMessages).catch(() => setMessages([]));
  }

  useEffect(() => {
    api.user(userId).then(setPartner).catch(() => setPartner(null));
    load();
    // Поллинг реже, чем раньше (было 5с) — теперь только страховка на случай,
    // если WebSocket недоступен, основная доставка идёт через real-time ниже
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useRealtimeEvent((event) => {
    if (event.type === "new_message" && event.from_user_id === userId) {
      load();
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(userId, text.trim());
      setText("");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ paddingTop: "calc(6px + env(safe-area-inset-top, 0px))" }}>
        <button className="icon-btn" onClick={() => navigate("/messages")} aria-label={t("message_thread.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">
          {partner ? partner.display_name : showPartnerSkeleton && (
            <span className="skeleton" style={{ display: "inline-block", width: 100, height: 16, verticalAlign: "middle" }} />
          )}
        </span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{
        display: "flex", flexDirection: "column", gap: 8,
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      }}>
        {showSkeleton && (
          <>
            {[
              { mine: false, width: "58%" },
              { mine: true, width: "42%" },
              { mine: false, width: "68%" },
              { mine: false, width: "35%" },
              { mine: true, width: "50%" },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", justifyContent: b.mine ? "flex-end" : "flex-start" }}>
                <span
                  className="skeleton"
                  style={{ width: b.width, height: 36, borderRadius: 16, maxWidth: "78%" }}
                />
              </div>
            ))}
          </>
        )}

        {!showSkeleton && messages?.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", marginTop: 20 }}>
            {t("message_thread.empty")}
          </p>
        )}

        {!showSkeleton && messages?.map((m) => {
          const isMine = m.sender.id === myId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "78%", padding: "9px 14px", borderRadius: 16,
                background: isMine ? "var(--primary-strong)" : "var(--surface)",
                color: isMine ? "#fff" : "var(--text)",
                border: isMine ? "none" : "1px solid var(--border)",
                fontSize: 14, lineHeight: 1.4,
              }}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          width: "calc(100% - 32px)", maxWidth: 460, display: "flex", gap: 8, zIndex: 20,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("message_thread.placeholder")}
          autoComplete="off"
          style={{
            flex: 1, border: "1px solid var(--border)", borderRadius: 999, padding: "12px 18px",
            fontSize: 16, background: "var(--surface)", color: "var(--text)", boxShadow: "var(--shadow-card)",
          }}
        />
        <button className="btn btn-primary" disabled={sending} aria-label={t("message_thread.send_aria")} style={{ padding: "0 16px" }}>
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}

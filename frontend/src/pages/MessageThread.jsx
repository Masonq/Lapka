import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

export default function MessageThread() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { userId: myId } = useAuth();
  const { showToast } = useToast();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  useDocumentTitle(partner ? partner.display_name : "Сообщения");

  function load() {
    api.messageThread(userId).then(setMessages).catch(() => setMessages([]));
  }

  useEffect(() => {
    api.user(userId).then(setPartner).catch(() => setPartner(null));
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate("/messages")} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{partner ? partner.display_name : "…"}</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 90 }}>
        {messages === null && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

        {messages?.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", marginTop: 20 }}>
            Пока ничего не написано — начни первым
          </p>
        )}

        {messages?.map((m) => {
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
          position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 86,
          width: "calc(100% - 32px)", maxWidth: 460, display: "flex", gap: 8, zIndex: 20,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать…"
          style={{
            flex: 1, border: "1px solid var(--border)", borderRadius: 999, padding: "12px 18px",
            fontSize: 16, background: "var(--surface)", boxShadow: "var(--shadow-card)",
          }}
        />
        <button className="btn btn-primary" disabled={sending} aria-label="Отправить" style={{ padding: "0 16px" }}>
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}

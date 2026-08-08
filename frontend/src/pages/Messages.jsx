import { MessageCircle } from "lucide-react";
import { useDocumentTitle } from "../useDocumentTitle";

export default function Messages() {
  useDocumentTitle("Сообщения");

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Сообщения</span>
      </div>
      <div className="empty-state">
        <MessageCircle size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
        <div className="empty-state-title">Личные сообщения скоро появятся</div>
        Пока можно писать в комментариях к постам или указывать контакт в анкете услуг
      </div>
    </div>
  );
}

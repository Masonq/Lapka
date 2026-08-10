import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPinCheck, Heart, HelpCircle, MessageSquarePlus } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

// Типы контента, которые реально умеет бэкенд сегодня. Story, Poll, Walk, Event,
// Marketplace Listing и Review из блюпринта пока не реализованы — по правилу самого
// блюпринта ("недоступные пользователю типы скрываются, а не показываются заблокированными")
// не выводим их вовсе, чтобы не обещать того, чего нет
const TYPES = [
  { value: "lost", labelKey: "create.type_lost_label", descKey: "create.type_lost_desc", icon: AlertTriangle, tint: "var(--red-tint)", color: "var(--red)" },
  { value: "found", labelKey: "create.type_found_label", descKey: "create.type_found_desc", icon: MapPinCheck, tint: "var(--green-tint)", color: "var(--green)" },
  { value: "adopt", labelKey: "create.type_adopt_label", descKey: "create.type_adopt_desc", icon: Heart, tint: "var(--primary-tint)", color: "#95491B" },
  { value: "question", labelKey: "create.type_question_label", descKey: "create.type_question_desc", icon: HelpCircle, tint: "var(--blue-tint)", color: "var(--blue)" },
  { value: "general", labelKey: "create.type_general_label", descKey: "create.type_general_desc", icon: MessageSquarePlus, tint: "var(--gray-tint)", color: "var(--text-muted)" },
];

export default function Create() {
  const { t } = useTranslation();
  useDocumentTitle(t("create.title"));
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("create.login_required_title")}</div>
        {t("create.login_required_hint")}
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate("/profile")}>{t("create.login_button")}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">{t("create.page_title")}</span>
      </div>

      <div className="card-grid">
        {TYPES.map(({ value, labelKey, descKey, icon: Icon, tint, color }) => (
          <button
            key={value}
            className="card"
            style={{
              borderRadius: 20, padding: 16, textAlign: "left", cursor: "pointer",
              display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid var(--border)",
            }}
            onClick={() => navigate(`/new-post?type=${value}`)}
          >
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: tint, color,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon size={19} strokeWidth={2} />
            </div>
            <div>
              <div className="subhead" style={{ fontSize: 15 }}>{t(labelKey)}</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "3px 0 0" }}>{t(descKey)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

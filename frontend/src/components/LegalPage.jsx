import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "../useDocumentTitle";

export default function LegalPage({ title, updatedLabel, children }) {
  useDocumentTitle(title);
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{title}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="card" style={{ borderRadius: 20, padding: "20px 18px", lineHeight: 1.6 }}>
        {updatedLabel && (
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 0 }}>{updatedLabel}</p>
        )}
        {children}
      </div>
    </div>
  );
}

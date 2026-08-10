import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowLeft, Search, Home, MessageCircle, PawPrint } from "lucide-react";
import { api } from "../api/client";
import { useTranslation } from "react-i18next";

const FEATURES = [
  { icon: Search, key: "onboarding.feature_search" },
  { icon: Home, key: "onboarding.feature_adopt" },
  { icon: MessageCircle, key: "onboarding.feature_connect" },
];

export default function OnboardingModal({ onDone }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  async function finish(redirectToAddPet) {
    try {
      await api.completeOnboarding();
    } catch {
      // не блокируем закрытие онбординга из-за сетевой ошибки — просто попробуем
      // отметить в следующий раз через localStorage-фолбэк в App.jsx
    }
    localStorage.setItem("onboarding_completed", "true");
    onDone();
    if (redirectToAddPet) navigate("/pets");
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60, background: "var(--bg)",
        display: "flex", flexDirection: "column", padding: "20px 20px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        {step > 0 ? (
          <button className="icon-btn" onClick={() => setStep((s) => s - 1)} aria-label={t("settings.back")}>
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 8, height: 8, borderRadius: 999,
                background: i === step ? "var(--primary-strong)" : "var(--border)",
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
        <button className="icon-btn" onClick={() => finish(false)} aria-label={t("onboarding.close_aria")}>
          <X size={17} strokeWidth={2.2} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", maxWidth: 380, margin: "0 auto", width: "100%" }}>
        {step === 0 && (
          <>
            <div style={{
              width: 96, height: 96, borderRadius: "50%", background: "var(--primary-tint)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}>
              <PawPrint size={44} strokeWidth={1.8} style={{ color: "var(--primary-strong)" }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>{t("onboarding.welcome_title")}</h2>
            <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
              {t("onboarding.welcome_subtitle")}
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px" }}>{t("onboarding.features_title")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              {FEATURES.map(({ icon: Icon, key }, i) => (
                <div key={i} className="card" style={{
                  borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: "var(--primary-tint)", color: "var(--primary-strong)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t(key)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{
              width: 96, height: 96, borderRadius: "50%", background: "var(--primary-tint)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}>
              <PawPrint size={44} strokeWidth={1.8} style={{ color: "var(--primary-strong)" }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>{t("onboarding.add_pet_title")}</h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
              {t("onboarding.add_pet_text")}
            </p>
          </>
        )}
      </div>

      <div style={{ maxWidth: 380, margin: "0 auto", width: "100%" }}>
        {step < totalSteps - 1 ? (
          <button className="btn btn-primary btn-block" onClick={() => setStep((s) => s + 1)}>
            {t("onboarding.next")}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-primary btn-block" onClick={() => finish(true)}>
              {t("onboarding.add_pet_button")}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => finish(false)}>
              {t("onboarding.skip")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

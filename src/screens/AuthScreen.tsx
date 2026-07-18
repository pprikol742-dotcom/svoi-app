import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { TopBar } from "@/components/TopBar";

export function AuthScreen() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithEmail } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    if (!email.includes("@")) return setError("Введите корректный email");
    if (password.length < 6) return setError("Пароль — минимум 6 символов");
    if (mode === "signup" && displayName.trim().length < 2) return setError("Введите имя");

    setLoading(true);
    if (mode === "signup") {
      const { error, needsConfirmation } = await signUpWithEmail(email, password, displayName.trim());
      setLoading(false);
      if (error) return setError(error);
      if (needsConfirmation) {
        // Сработает только если в проекте Supabase включено "Confirm email" —
        // при выключенном подтверждении пользователь входит сразу.
        setNotice("Проверьте почту и перейдите по ссылке, чтобы подтвердить регистрацию.");
        return;
      }
      navigate("/profile");
    } else {
      const { error } = await signInWithEmail(email, password);
      setLoading(false);
      if (error) return setError(error);
      navigate("/profile");
    }
  };

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title={mode === "signin" ? "Вход" : "Регистрация"} onBack />
      <div className="auth-body">
        <p className="auth-lead">
          {mode === "signin" ? "Войдите по email и паролю" : "Регистрация по email — понадобится подтвердить почту по ссылке в письме"}
        </p>

        {mode === "signup" && (
          <>
            <label className="field-label">Имя</label>
            <input className="field-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Как вас видят другие" />
          </>
        )}

        <label className="field-label" style={{ marginTop: "var(--space-3)" }}>Email</label>
        <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@mail.ru" />

        <label className="field-label" style={{ marginTop: "var(--space-3)" }}>Пароль</label>
        <div className="password-field">
          <input
            className="field-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.4 18.4 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}

        <button className="btn-primary" style={{ marginTop: "var(--space-4)" }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Секунду…" : mode === "signin" ? "Войти" : "Зарегистрироваться"}
        </button>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin" ? "Ещё нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>

      <style>{`
        .auth-body { padding: var(--space-5) var(--space-4); }
        .auth-lead { font-size: 14.5px; color: var(--color-text-secondary); margin-bottom: var(--space-4); line-height: 1.5; }
        .form-error { color: var(--color-danger); font-size: 13px; margin-top: var(--space-2); }
        .password-field { position: relative; }
        .password-field .field-input { padding-right: 44px; }
        .password-toggle {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
        }
        .password-toggle svg { width: 20px; height: 20px; }
        .form-notice { color: var(--color-success); font-size: 13px; margin-top: var(--space-2); line-height: 1.4; }
        .auth-switch {
          display: block;
          margin: var(--space-4) auto 0;
          font-size: 13.5px;
          color: var(--color-primary);
          font-weight: 600;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

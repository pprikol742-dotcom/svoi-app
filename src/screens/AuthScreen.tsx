import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { TopBar } from "@/components/TopBar";

const REMEMBERED_EMAIL_KEY = "svoi_remembered_email";
const RESET_REDIRECT_URL = "https://pprikol742-dotcom.github.io/svoi-app/reset-password.html";

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный email или пароль";
  if (m.includes("already registered")) return "Пользователь с такой почтой уже зарегистрирован";
  if (m.includes("email not confirmed")) return "Email ещё не подтверждён — проверьте почту и перейдите по ссылке из письма";
  if (m.includes("rate limit") || m.includes("too many requests")) return "Слишком много попыток. Подождите немного и попробуйте снова";
  if (m.includes("password")) return "Пароль не подходит — минимум 6 символов";
  if (m.includes("network") || m.includes("fetch")) return "Проблема с подключением. Проверьте интернет и попробуйте снова";
  return "Что-то пошло не так. Попробуйте ещё раз";
}

function ForgotPasswordModal({ onClose, initialEmail }: { onClose: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.includes("@")) return setError("Введите корректный email");
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT_URL });
    setLoading(false);
    if (error) setError(translateAuthError(error.message));
    else setSent(true);
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h3>Проверьте почту</h3>
            <p className="auth-modal__hint">
              Если аккаунт с таким email существует, мы отправили на него ссылку для сброса пароля.
            </p>
            <button className="btn-primary" onClick={onClose}>
              Закрыть
            </button>
          </>
        ) : (
          <>
            <h3>Забыли пароль?</h3>
            <p className="auth-modal__hint">Пришлём ссылку на почту, чтобы задать новый пароль.</p>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@mail.ru"
            />
            {error && <p className="form-error">{error}</p>}
            <div className="auth-modal__actions">
              <button className="btn-secondary" onClick={onClose} disabled={loading}>
                Отмена
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? "Отправка…" : "Отправить ссылку"}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`
        .auth-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .auth-modal {
          width: 100%;
          max-width: 480px;
          background: var(--color-bg);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: var(--space-5) var(--space-4) calc(var(--space-5) + var(--safe-bottom));
        }
        .auth-modal h3 { font-size: 16.5px; font-weight: 700; margin-bottom: var(--space-2); text-align: center; }
        .auth-modal__hint { font-size: 13.5px; color: var(--color-text-secondary); margin-bottom: var(--space-4); text-align: center; line-height: 1.4; }
        .auth-modal .field-input { margin-bottom: var(--space-3); }
        .auth-modal__actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
        .auth-modal__actions .btn-primary, .auth-modal__actions .btn-secondary { flex: 1; width: auto; }
      `}</style>
    </div>
  );
}

export function AuthScreen() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithEmail } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    if (!email.includes("@")) return setError("Введите корректный email");
    if (password.length < 6) return setError("Пароль — минимум 6 символов");
    if (mode === "signup" && displayName.trim().length < 2) return setError("Введите имя");
    if (mode === "signup" && password !== confirmPassword) return setError("Пароли не совпадают — проверьте ещё раз");
    if (mode === "signup" && !agreedToTerms) {
      return setError("Нужно принять условия использования и политику конфиденциальности");
    }

    if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    setLoading(true);
    if (mode === "signup") {
      const { error, needsConfirmation } = await signUpWithEmail(email, password, displayName.trim());
      setLoading(false);
      if (error) return setError(translateAuthError(error));
      if (needsConfirmation) {
        setNotice("Проверьте почту и перейдите по ссылке, чтобы подтвердить регистрацию.");
        return;
      }
      navigate("/profile");
    } else {
      const { error } = await signInWithEmail(email, password);
      setLoading(false);
      if (error) return setError(translateAuthError(error));
      navigate("/profile");
    }
  };

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title="" onBack />

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} initialEmail={email} />
      )}

      <div className="auth-body">
        <div className="auth-hero">
          <div className="auth-hero__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="auth-hero__title">{mode === "signin" ? "С возвращением" : "Присоединяйтесь к «Своим»"}</h1>
          <p className="auth-lead">
            {mode === "signin" ? "Войдите по email и паролю" : "Понадобится подтвердить почту по ссылке в письме"}
          </p>
        </div>

        <div className="auth-toggle">
          <button
            className={`auth-toggle__btn${mode === "signin" ? " is-active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError(null);
              setNotice(null);
            }}
          >
            Вход
          </button>
          <button
            className={`auth-toggle__btn${mode === "signup" ? " is-active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
              setNotice(null);
            }}
          >
            Регистрация
          </button>
        </div>

        {mode === "signup" && (
          <div className="field-with-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              className="field-input field-input--icon"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как вас видят другие"
            />
          </div>
        )}

        <div className="field-with-icon" style={{ marginTop: "var(--space-3)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
          <input
            className="field-input field-input--icon"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@mail.ru"
          />
        </div>

        <div className="field-with-icon password-field" style={{ marginTop: "var(--space-3)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <input
            className="field-input field-input--icon"
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

        {mode === "signup" && (
          <div className="field-with-icon" style={{ marginTop: "var(--space-3)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              className="field-input field-input--icon"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
            />
          </div>
        )}

        <div className="auth-row">
          <label className="remember-row">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            <span>Запомнить меня</span>
          </label>
          {mode === "signin" && (
            <button type="button" className="forgot-link" onClick={() => setShowForgotPassword(true)}>
              Забыли пароль?
            </button>
          )}
        </div>

        {mode === "signup" && (
          <label className="consent-row">
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
            <span>
              Я принимаю{" "}
              <a
                href="#/legal"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/legal");
                }}
              >
                Условия использования, Политику конфиденциальности и Согласие на обработку персональных данных
              </a>
            </span>
          </label>
        )}

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-notice">{notice}</p>}

        <button className="btn-primary" style={{ marginTop: "var(--space-4)" }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Секунду…" : mode === "signin" ? "Войти" : "Зарегистрироваться"}
        </button>
      </div>

      <style>{`
        .auth-body { padding: 0 var(--space-4) var(--space-6); }
        .auth-hero { text-align: center; padding: var(--space-4) 0 var(--space-5); }
        .auth-hero__icon {
          width: 56px; height: 56px;
          margin: 0 auto var(--space-3);
          border-radius: 50%;
          background: var(--color-accent-soft);
          color: var(--color-primary);
          display: flex; align-items: center; justify-content: center;
        }
        .auth-hero__icon svg { width: 26px; height: 26px; }
        .auth-hero__title { font-size: 19px; font-weight: 800; font-family: var(--font-display); margin-bottom: 4px; }
        .auth-lead { font-size: 13.5px; color: var(--color-text-secondary); line-height: 1.4; }
        .auth-toggle {
          display: flex;
          background: var(--color-surface);
          border-radius: var(--radius-pill);
          padding: 4px;
          margin-bottom: var(--space-4);
        }
        .auth-toggle__btn {
          flex: 1;
          padding: 10px;
          border-radius: var(--radius-pill);
          font-size: 13.5px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--color-text-secondary);
        }
        .auth-toggle__btn.is-active {
          background: var(--color-primary);
          color: var(--color-text-onprimary);
        }
        .field-with-icon { position: relative; }
        .field-with-icon > svg {
          position: absolute;
          top: 50%;
          left: 14px;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: var(--color-text-secondary);
          pointer-events: none;
        }
        .field-input--icon { padding-left: 42px; }
        .password-field .password-toggle {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
        }
        .password-toggle svg { width: 20px; height: 20px; }
        .auth-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--space-3);
        }
        .remember-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .remember-row input {
          width: 16px; height: 16px;
          accent-color: var(--color-primary);
        }
        .forgot-link { font-size: 13px; font-weight: 600; color: var(--color-primary); }
        .form-error { color: var(--color-danger); font-size: 13px; margin-top: var(--space-3); }
        .form-notice { color: var(--color-success); font-size: 13px; margin-top: var(--space-3); line-height: 1.4; }
        .consent-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: var(--space-4);
          cursor: pointer;
        }
        .consent-row input[type="checkbox"] {
          margin-top: 3px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          accent-color: var(--color-primary);
        }
        .consent-row span { font-size: 13px; line-height: 1.5; color: var(--color-text-secondary); }
        .consent-row a { color: var(--color-primary); font-weight: 600; }
      `}</style>
    </div>
  );
}

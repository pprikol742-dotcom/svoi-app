import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { useSecretChatStore } from "@/store/useSecretChatStore";
import svoyakAvatarUrl from "@/assets/svoyak-avatar.png";

const SUGGESTIONS = [
  "Помоги составить объявление",
  "Объясни разницу между двумя тарифами",
  "Напиши вежливый ответ покупателю",
];

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderLite(text: string) {
  let safe = escapeHtml(text);
  safe = safe.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="msg-code">${code.trim()}</pre>`);
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\n/g, "<br/>");
  return safe;
}

function formatTokens(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return "" + n;
}

function formatPriceRange(min: number, max: number) {
  if (!min && !max) return null;
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  return min === max ? `≈ ${fmt(min)} ₽` : `${fmt(min)}–${fmt(max)} ₽`;
}

function avitoSearchUrl(query: string) {
  return `https://www.avito.ru/rossiya?q=${encodeURIComponent(query)}`;
}

export function SecretChatScreen() {
  const navigate = useNavigate();
  const { messages, isThinking, quota, loadQuota, send, sendPhoto, clear } = useSecretChatStore();
  const [draft, setDraft] = useState("");
  const [showTopUp, setShowTopUp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadQuota(); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isThinking]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
  }, [draft]);

  const remaining = quota?.remaining ?? null;
  const limit = quota ? quota.tokensLimit + quota.purchasedTokens : null;
  const usedPct = quota && limit ? Math.min((quota.tokensUsed / limit) * 100, 100) : 0;
  const exhausted = remaining !== null && remaining <= 0;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || exhausted) return;
    setDraft("");
    await send(text);
  };

  const handleAttachPhoto = async () => {
    if (exhausted || isAttaching) return;
    setIsAttaching(true);
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        promptLabelHeader: "Прикрепить фото",
        promptLabelCancel: "Отмена",
        promptLabelPhoto: "Выбрать из галереи",
        promptLabelPicture: "Сделать фото",
      });
      if (!photo.webPath) return;
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `item-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      await sendPhoto(file);
    } catch (err) {
      console.error("Не удалось отправить фото", err);
    } finally {
      setIsAttaching(false);
    }
  };

  const handleVoiceInput = async () => {
    if (exhausted || isListening) return;
    setIsListening(true);
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        console.error("Распознавание речи недоступно на этом устройстве");
        return;
      }
      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== "granted") return;

      const result = await SpeechRecognition.start({
        language: "ru-RU",
        maxResults: 1,
        prompt: "Скажите, что хотите спросить",
        popup: true,
      });
      const text = result?.matches?.[0];
      if (text) {
        setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      }
    } catch (err) {
      console.error("Ошибка голосового ввода", err);
    } finally {
      setIsListening(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="screen screen--no-tab-padding secret-chat">
      <div className="secret-header">
        <button onClick={() => navigate(-1)} className="secret-icon-btn">←</button>
        <div className="secret-title">
          <span className="secret-avatar"><img src={svoyakAvatarUrl} alt="Свояк" /></span>
          <div>
            <div className="secret-name">Свояк</div>
            <div className="secret-status">{isThinking ? "печатает…" : "на связи"}</div>
          </div>
        </div>
        <button onClick={clear} className="secret-icon-btn" aria-label="Очистить">🗑</button>
      </div>

      {quota && (
        <div className="quota-bar-wrap" onClick={() => exhausted && setShowTopUp(true)}>
          <div className="quota-bar-track">
            <div className="quota-bar-fill" style={{ width: usedPct + "%" }} />
          </div>
          <div className="quota-bar-label">
            <span>{formatTokens(Math.max(remaining ?? 0, 0))} токенов осталось</span>
            {quota.isLifetime && <span className="quota-badge">♾ навсегда</span>}
          </div>
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-emoji">✨</div>
            <p>Спроси что угодно — я помогу</p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
              ))}
              <button className="chip chip--photo" onClick={handleAttachPhoto}>
                📷 Определить товар по фото и оценить цену
              </button>
              <button className="chip chip--voice" onClick={handleVoiceInput}>
                🎤 Спросить голосом
              </button>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={"bubble-wrap" + (m.role === "user" ? " mine" : "")}>
            {m.imageUrl ? (
              <div className={"bubble bubble--photo" + (m.role === "user" ? " is-mine" : "")}>
                <img src={m.imageUrl} alt="" />
              </div>
            ) : m.analysis ? (
              <div className="analysis-card">
                <div className="analysis-card__header">
                  <span className="analysis-card__icon">🔍</span>
                  <div>
                    <div className="analysis-card__title">{m.analysis.title_guess}</div>
                    {m.analysis.category_guess && (
                      <div className="analysis-card__category">{m.analysis.category_guess}</div>
                    )}
                  </div>
                </div>

                {formatPriceRange(m.analysis.price_min, m.analysis.price_max) && (
                  <div className="analysis-card__price">
                    {formatPriceRange(m.analysis.price_min, m.analysis.price_max)}
                  </div>
                )}

                {m.analysis.description && <p className="analysis-card__desc">{m.analysis.description}</p>}

                {m.similarListings && m.similarListings.length > 0 && (
                  <div className="analysis-card__similar">
                    <p className="analysis-card__similar-title">Похожие объявления в приложении</p>
                    {m.similarListings.map((l) => (
                      <button
                        key={l.id}
                        className="analysis-card__similar-item"
                        onClick={() => navigate(`/listing/${l.id}`)}
                      >
                        {l.photos?.[0] ? (
                          <img src={l.photos[0]} alt="" />
                        ) : (
                          <span className="analysis-card__similar-noimg">—</span>
                        )}
                        <span className="analysis-card__similar-name">{l.title}</span>
                        <span className="analysis-card__similar-price">
                          {l.price != null ? `${l.price.toLocaleString("ru-RU")} ₽` : "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {m.analysis.title_guess && m.analysis.title_guess !== "Не удалось распознать" && (
                  <a
                    className="analysis-card__avito"
                    href={avitoSearchUrl(m.analysis.title_guess)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Посмотреть похожие на Авито ↗
                  </a>
                )}

                <button className="copy-btn" onClick={() => handleCopy(m.id, m.content)}>
                  {copiedId === m.id ? "Скопировано ✓" : "Копировать описание"}
                </button>
              </div>
            ) : (
              <>
                <div
                  className={"bubble" + (m.role === "user" ? " is-mine" : "")}
                  dangerouslySetInnerHTML={m.role === "assistant" ? { __html: renderLite(m.content) } : undefined}
                >
                  {m.role === "user" ? m.content : undefined}
                </div>
                {m.role === "assistant" && (
                  <button className="copy-btn" onClick={() => handleCopy(m.id, m.content)}>
                    {copiedId === m.id ? "Скопировано ✓" : "Копировать"}
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="bubble-wrap">
            <div className="bubble typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {exhausted && (
        <div className="quota-banner">
          Лимит токенов исчерпан
          <button onClick={() => setShowTopUp(true)}>Пополнить</button>
        </div>
      )}

      <div className="composer">
        <button
          className="composer__attach"
          onClick={handleAttachPhoto}
          disabled={exhausted || isAttaching}
          aria-label="Прикрепить фото"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.64 18.36a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button
          className={"composer__mic" + (isListening ? " is-listening" : "")}
          onClick={handleVoiceInput}
          disabled={exhausted || isListening}
          aria-label="Спросить голосом"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
            <path d="M12 18v3" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          className="composer__input"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={exhausted ? "Лимит исчерпан…" : "Спросить у ИИ… (или нажми 🎤)"}
          disabled={exhausted}
        />
        <button className="composer__send" onClick={handleSend} disabled={exhausted} aria-label="Отправить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 14-7-7 14-2-5-5-2Z" />
          </svg>
        </button>
      </div>

      {showTopUp && (
        <div className="topup-overlay" onClick={() => setShowTopUp(false)}>
          <div className="topup-sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Пополнить токены</h3>
            <p>Переведи любую сумму удобным способом и напиши в поддержку — токены начислим вручную в течение дня.</p>
            <div className="topup-detail">Контакт поддержки: sergei.shvachyov@yandex.com</div>
            <button className="topup-close" onClick={() => setShowTopUp(false)}>Понятно</button>
          </div>
        </div>
      )}

      <style>{`
        .secret-chat { display: flex; flex-direction: column; background: var(--color-bg); }
        .secret-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); }
        .secret-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--color-surface); flex-shrink: 0; }
        .secret-title { display: flex; align-items: center; gap: 10px; flex: 1; }
        .secret-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--color-accent-soft); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .secret-avatar img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
        .secret-name { font-weight: 700; font-size: 15px; }
        .secret-status { font-size: 12px; color: var(--color-text-secondary); }

        .quota-bar-wrap { padding: 8px var(--space-4); cursor: default; }
        .quota-bar-track { height: 5px; border-radius: 999px; background: var(--color-surface); overflow: hidden; }
        .quota-bar-fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-accent)); transition: width 0.4s ease; }
        .quota-bar-label { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--color-text-secondary); margin-top: 4px; }
        .quota-badge { background: var(--color-accent-soft); color: var(--color-accent); padding: 1px 8px; border-radius: 999px; font-weight: 600; }

        .messages { flex: 1; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: 10px; }
        .empty-state { margin: auto; text-align: center; color: var(--color-text-secondary); padding: var(--space-6) 0; }
        .empty-emoji { font-size: 32px; margin-bottom: 6px; }
        .chips { display: flex; flex-direction: column; gap: 8px; margin-top: var(--space-4); }
        .chip { padding: 10px 16px; border-radius: var(--radius-pill); background: var(--color-surface); border: 1px solid var(--color-border); font-size: 13.5px; }
        .chip--photo { border-color: var(--color-accent); color: var(--color-accent); font-weight: 600; }
        .chip--voice { border-color: var(--color-primary); color: var(--color-primary); font-weight: 600; }

        .bubble-wrap { display: flex; flex-direction: column; animation: fadeUp 0.25s ease; }
        .bubble-wrap.mine { align-items: flex-end; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .bubble { max-width: 80%; padding: 10px 14px; border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); font-size: 14.5px; line-height: 1.45; align-self: flex-start; white-space: pre-wrap; }
        .bubble.is-mine { align-self: flex-end; background: var(--color-primary); color: var(--color-text-onprimary); }
        .bubble--photo { padding: 4px; max-width: 62%; overflow: hidden; }
        .bubble--photo img { display: block; width: 100%; border-radius: calc(var(--radius-md) - 2px); max-height: 280px; object-fit: cover; }
        .copy-btn { align-self: flex-start; margin-top: 3px; font-size: 11px; color: var(--color-text-secondary); }

        .bubble.typing { display: flex; gap: 4px; padding: 14px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-text-secondary); animation: bounce 1.2s infinite; }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }

        .analysis-card {
          max-width: 88%;
          align-self: flex-start;
          background: var(--color-surface);
          border: 1.5px solid var(--color-accent-soft);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          padding: var(--space-3);
        }
        .analysis-card__header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
        .analysis-card__icon { font-size: 20px; flex-shrink: 0; }
        .analysis-card__title { font-size: 14.5px; font-weight: 700; line-height: 1.3; }
        .analysis-card__category { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 2px; }
        .analysis-card__price {
          display: inline-block;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 17px;
          color: var(--color-primary);
          margin-bottom: 6px;
        }
        .analysis-card__desc { font-size: 13px; line-height: 1.45; color: var(--color-text-primary); margin-bottom: 8px; }
        .analysis-card__similar { border-top: 1px solid var(--color-border); padding-top: 8px; margin-top: 4px; }
        .analysis-card__similar-title { font-size: 11.5px; color: var(--color-text-secondary); margin-bottom: 6px; }
        .analysis-card__similar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 6px;
          border-radius: var(--radius-sm);
          margin-bottom: 4px;
        }
        .analysis-card__similar-item:active { background: var(--color-bg); }
        .analysis-card__similar-item img,
        .analysis-card__similar-noimg {
          width: 34px; height: 34px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
          background: var(--color-bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          color: var(--color-text-secondary);
        }
        .analysis-card__similar-name {
          flex: 1;
          text-align: left;
          font-size: 12.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .analysis-card__similar-price { font-size: 12.5px; font-weight: 700; color: var(--color-primary); flex-shrink: 0; }
        .analysis-card__avito {
          display: block;
          text-align: center;
          margin-top: 8px;
          padding: 9px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .quota-banner { display: flex; align-items: center; justify-content: space-between; padding: 10px var(--space-4); background: rgba(229,72,77,0.1); color: #e5484d; font-size: 13px; font-weight: 600; }
        .quota-banner button { background: #e5484d; color: white; padding: 6px 14px; border-radius: var(--radius-pill); font-size: 12.5px; }

        .composer { display: flex; align-items: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-4) calc(var(--space-3) + var(--safe-bottom)); border-top: 1px solid var(--color-border); background: var(--color-bg); }
        .composer__attach,
        .composer__mic {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          flex-shrink: 0;
          transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .composer__attach:active,
        .composer__mic:active { transform: scale(0.9); }
        .composer__attach:disabled,
        .composer__mic:disabled { opacity: 0.4; }
        .composer__attach svg,
        .composer__mic svg { width: 21px; height: 21px; }
        .composer__mic.is-listening {
          color: #e5484d;
          background: rgba(229,72,77,0.12);
          animation: mic-pulse 1s ease-in-out infinite;
        }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,72,77,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(229,72,77,0); }
        }
        .composer__input { flex: 1; resize: none; max-height: 120px; padding: 12px 14px; border-radius: 18px; border: 1.5px solid var(--color-border); background: var(--color-surface); font-size: 14.5px; font-family: inherit; }
        .composer__input:focus { outline: none; border-color: var(--color-primary); }
        .composer__input:disabled { opacity: 0.5; }
        .composer__send { width: 40px; height: 40px; border-radius: 50%; background: var(--color-accent); color: var(--color-text-onaccent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .composer__send:disabled { opacity: 0.4; }
        .composer__send svg { width: 18px; height: 18px; }

        .topup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 50; }
        .topup-sheet { background: var(--color-bg); width: 100%; border-radius: 20px 20px 0 0; padding: var(--space-5) var(--space-4) calc(var(--space-5) + var(--safe-bottom)); }
        .topup-sheet h3 { margin-bottom: 8px; }
        .topup-sheet p { color: var(--color-text-secondary); font-size: 13.5px; line-height: 1.5; margin-bottom: 12px; }
        .topup-detail { background: var(--color-surface); padding: 10px 14px; border-radius: var(--radius-md); font-size: 13.5px; margin-bottom: 16px; }
        .topup-close { width: 100%; padding: 12px; border-radius: var(--radius-pill); background: var(--color-primary); color: var(--color-text-onprimary); font-weight: 600; }
      `}</style>
    </div>
  );
}

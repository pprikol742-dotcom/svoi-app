import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, canEditMessage } from "@/store/useChatStore";
import { TopBar } from "@/components/TopBar";
import chatPatternUrl from "@/assets/chat-pattern.png";

const EMOJI_LIST = [
  "😀", "😂", "😍", "👍", "👎", "🙏", "🔥", "💯",
  "😢", "😡", "🤔", "🎉", "❤️", "👋", "🙌", "😎",
  "🤝", "💰", "🚗", "📦", "⏰", "✅", "❌", "😴",
];

function isProActive(proUntil: string | null | undefined) {
  return !!proUntil && new Date(proUntil) > new Date();
}

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return "Сегодня";
  if (isSameDay(d, yesterday)) return "Вчера";
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("ru-RU", sameYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
}

function SingleCheck() {
  return (
    <svg viewBox="0 0 16 12" width="14" height="11" fill="none">
      <path d="M1 6.5 5 10.5 15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DoubleCheck({ read }: { read: boolean }) {
  return (
    <svg viewBox="0 0 20 12" width="17" height="11" fill="none">
      <path d="M1 6.5 5 10.5 12 3" stroke={read ? "#5ec2ff" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 6.5 11 10.5 19 1" stroke={read ? "#5ec2ff" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatScreen() {
  const { chatId } = useParams();
  const { userId, profile } = useAuthStore();
  const {
    messagesByChat,
    chatMeta,
    loadMessages,
    loadChatMeta,
    sendMessage,
    sendImageMessage,
    editMessage,
    deleteMessage,
    markChatAsRead,
    subscribeToChat,
  } = useChatStore();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionsForId, setActionsForId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPro = isProActive(profile?.pro_until);
  const messages = chatId ? messagesByChat[chatId] ?? [] : [];
  const meta = chatId ? chatMeta[chatId] : undefined;
  const other = meta ? (meta.buyer_id === userId ? meta.seller : meta.buyer) : undefined;
  const isBuyer = meta?.buyer_id === userId;
  const otherLastReadAt = meta ? (isBuyer ? meta.seller_last_read_at : meta.buyer_last_read_at) : null;

  useEffect(() => {
    if (!chatId) return;
    loadMessages(chatId);
    loadChatMeta(chatId);
    const unsubscribe = subscribeToChat(chatId);
    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !userId) return;
    markChatAsRead(chatId, userId);
  }, [chatId, userId, messages.length]);

  useEffect(() => {
    if (!editingId) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isUploading]);

  const startEdit = (messageId: string, body: string) => {
    setEditingId(messageId);
    setDraft(body);
    setActionsForId(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const handleDelete = async (messageId: string) => {
    if (!chatId) return;
    setActionsForId(null);
    await deleteMessage(chatId, messageId);
  };

  const handleSend = async () => {
    if (!chatId || !userId || !draft.trim()) return;
    const body = draft.trim();
    setShowEmoji(false);

    if (editingId) {
      const id = editingId;
      setEditingId(null);
      setDraft("");
      try {
        await editMessage(chatId, id, body);
      } catch (err) {
        setEditingId(id);
        setDraft(body);
        console.error("Не удалось изменить сообщение", err);
      }
    } else {
      setDraft("");
      try {
        await sendMessage(chatId, userId, body);
      } catch (err) {
        setDraft(body);
        console.error("Не удалось отправить сообщение", err);
      }
    }
  };

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleAttachPhoto = async () => {
    if (!chatId || !userId) return;
    if (!isPro) {
      window.location.hash = "#/profile";
      return;
    }
    setUploadError(null);
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
      setUploadPreview(photo.webPath);
      setIsUploading(true);
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `chat-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      await sendImageMessage(chatId, userId, file);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setUploadError(`Не удалось отправить фото: ${detail}`);
      console.error("Не удалось отправить фото", err);
    } finally {
      setIsUploading(false);
      setUploadPreview(null);
    }
  };

  return (
    <div className="screen screen--no-tab-padding chat-screen">
      <TopBar title={other?.display_name ?? "Диалог"} onBack />
      <div className="messages" style={{ backgroundImage: `url(${chatPatternUrl})` }}>
        {messages.map((m, idx) => {
          const isMine = m.sender_id === userId;
          const isImage = !!m.image_url;
          const editable = isMine && !isImage && canEditMessage(m);
          const deletable = isMine;
          const isRead = isMine && !!otherLastReadAt && new Date(otherLastReadAt) >= new Date(m.created_at);

          const prev = messages[idx - 1];
          const showDateSeparator = !prev || !isSameDay(new Date(prev.created_at), new Date(m.created_at));

          return (
            <div key={m.id}>
              {showDateSeparator && (
                <div className="date-separator">
                  <span>{formatDateSeparator(m.created_at)}</span>
                </div>
              )}
              <div className="bubble-wrap">
                {isImage ? (
                  <div className={`bubble bubble--image${isMine ? " is-mine" : ""}`}>
                    <img
                      src={m.image_url!}
                      alt=""
                      onClick={() => setLightboxUrl(m.image_url!)}
                    />
                    <span className="bubble__photo-meta">
                      {formatMessageTime(m.created_at)}
                      {isMine && (isRead ? <DoubleCheck read /> : <SingleCheck />)}
                    </span>
                    {deletable && (
                      <button
                        className="bubble-image-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                        aria-label="Удалить фото"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className={`bubble${isMine ? " is-mine" : ""}`}
                    onClick={() => editable && setActionsForId(actionsForId === m.id ? null : m.id)}
                  >
                    <span className="bubble__text">
                      {m.body}
                      {m.edited_at && <span className="edited-label"> · изменено</span>}
                    </span>
                    <span className="bubble__meta">
                      {formatMessageTime(m.created_at)}
                      {isMine && (isRead ? <DoubleCheck read /> : <SingleCheck />)}
                    </span>
                  </div>
                )}
                {actionsForId === m.id && (
                  <div className="bubble-actions">
                    {editable && <button onClick={() => startEdit(m.id, m.body)}>Изменить</button>}
                    <button onClick={() => handleDelete(m.id)} className="danger">Удалить</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isUploading && uploadPreview && (
          <div className="bubble-wrap">
            <div className="bubble bubble--image is-mine bubble--uploading">
              <img src={uploadPreview} alt="" />
              <div className="upload-spinner-overlay">
                <span className="upload-spinner" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {lightboxUrl && (
        <div className="lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" />
        </div>
      )}

      {uploadError && (
        <div className="upload-error-bar">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}>✕</button>
        </div>
      )}

      {editingId && (
        <div className="editing-bar">
          <span>Редактирование сообщения</span>
          <button onClick={cancelEdit}>Отменить</button>
        </div>
      )}

      {showEmoji && (
        <div className="emoji-panel">
          {EMOJI_LIST.map((e) => (
            <button key={e} className="emoji-btn" onClick={() => insertEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <button
          className={`composer__attach${!isPro ? " is-locked" : ""}`}
          onClick={handleAttachPhoto}
          disabled={isUploading}
          aria-label="Прикрепить фото"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.64 18.36a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          {!isPro && <span className="composer__attach-badge">PRO</span>}
        </button>
        <button
          className="composer__emoji-toggle"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Эмодзи"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
        <input
          ref={inputRef}
          className="composer__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={editingId ? "Изменить сообщение…" : "Сообщение…"}
        />
        <button className="composer__send" onClick={handleSend} aria-label="Отправить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 14-7-7 14-2-5-5-2Z" />
          </svg>
        </button>
      </div>
      <style>{`
        .chat-screen { display: flex; flex-direction: column; }
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--color-bg);
          background-repeat: repeat;
          background-size: 360px 200px;
        }

        .date-separator {
          display: flex;
          justify-content: center;
          margin: 10px 0 4px;
        }
        .date-separator span {
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 11.5px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: var(--radius-pill);
          box-shadow: var(--shadow-card);
        }

        .bubble-wrap { display: flex; flex-direction: column; }
        .bubble {
          position: relative;
          max-width: 78%;
          padding: 7px 14px 7px 12px;
          border-radius: 14px;
          background: var(--color-surface);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          line-height: 1.4;
          align-self: flex-start;
          cursor: default;
          border-bottom-left-radius: 3px;
        }
        .bubble::after { content: ""; display: table; clear: both; }
        .bubble::before {
          content: "";
          position: absolute;
          left: -6px;
          bottom: 0;
          width: 10px;
          height: 13px;
          background: var(--color-surface);
          clip-path: polygon(100% 0, 100% 100%, 0% 100%);
        }
        .bubble.is-mine {
          align-self: flex-end;
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          cursor: pointer;
          border-bottom-left-radius: 14px;
          border-bottom-right-radius: 3px;
        }
        .bubble.is-mine::before {
          left: auto;
          right: -6px;
          background: var(--color-primary);
          clip-path: polygon(0% 0, 100% 100%, 0% 100%);
        }
        .bubble__text { white-space: pre-wrap; word-break: break-word; }
        .bubble__meta {
          float: right;
          margin-left: 8px;
          margin-top: 3px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10.5px;
          opacity: 0.65;
          white-space: nowrap;
          transform: translateY(2px);
        }
        .bubble--image {
          padding: 4px;
          max-width: 62%;
          overflow: hidden;
          cursor: pointer;
          background: var(--color-surface);
          position: relative;
        }
        .bubble--image img {
          display: block;
          width: 100%;
          border-radius: calc(var(--radius-md) - 2px);
          max-height: 320px;
          object-fit: cover;
        }
        .bubble__photo-meta {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10.5px;
          color: #fff;
          background: rgba(0,0,0,0.45);
          padding: 2px 6px;
          border-radius: var(--radius-pill);
        }
        .bubble-image-delete {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(2px);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .bubble-image-delete svg { width: 14px; height: 14px; }
        .bubble-image-delete:active { background: rgba(229,72,77,0.85); }
        .bubble--uploading { position: relative; opacity: 0.9; }
        .upload-spinner-overlay {
          position: absolute;
          inset: 4px;
          border-radius: calc(var(--radius-md) - 2px);
          background: rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-spinner {
          width: 26px; height: 26px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .edited-label {
          font-size: 11px;
          opacity: 0.65;
          font-style: italic;
        }
        .bubble-actions {
          align-self: flex-end;
          display: flex;
          gap: var(--space-2);
          margin-top: 4px;
        }
        .bubble-actions button {
          font-size: 12.5px;
          padding: 5px 12px;
          border-radius: var(--radius-pill);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
        }
        .bubble-actions button.danger { color: #e5484d; border-color: #e5484d55; }
        .upload-error-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          padding: 8px var(--space-4);
          background: rgba(229,72,77,0.12);
          color: #e5484d;
          font-size: 12.5px;
        }
        .upload-error-bar button { font-weight: 700; flex-shrink: 0; }
        .editing-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px var(--space-4);
          background: var(--color-accent-soft);
          font-size: 13px;
        }
        .editing-bar button { font-weight: 600; color: var(--color-primary); }
        .emoji-panel {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg);
          max-height: 140px;
          overflow-y: auto;
        }
        .emoji-btn {
          font-size: 22px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
        }
        .emoji-btn:active { background: var(--color-surface); }
        .composer {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4) calc(var(--space-3) + var(--safe-bottom));
          border-top: 1px solid var(--color-border);
          background: var(--color-bg);
        }
        .composer__attach {
          position: relative;
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          flex-shrink: 0;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .composer__attach:active { transform: scale(0.9); }
        .composer__attach svg { width: 21px; height: 21px; }
        .composer__attach.is-locked {
          background: linear-gradient(135deg, var(--color-accent-soft), transparent);
          color: var(--color-accent);
        }
        .composer__attach-badge {
          position: absolute;
          top: -4px;
          right: -6px;
          background: linear-gradient(135deg, var(--color-accent), #f0c874);
          color: #3a2a05;
          font-size: 8px;
          font-weight: 800;
          font-family: var(--font-display);
          padding: 1px 4px;
          border-radius: 5px;
          letter-spacing: 0.02em;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        .composer__attach:disabled { opacity: 0.5; }
        .composer__emoji-toggle {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }
        .composer__emoji-toggle svg { width: 22px; height: 22px; }
        .composer__input {
          flex: 1;
          padding: 12px 14px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-input-text, var(--color-text-primary));
          font-size: 14.5px;
        }
        .composer__input:focus { outline: none; border-color: var(--color-primary); }
        .composer__send {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: var(--color-accent);
          color: var(--color-text-onaccent);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .composer__send svg { width: 18px; height: 18px; }

        .lightbox {
          position: fixed;
          inset: 0;
          z-index: 300;
          background: rgba(0,0,0,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          animation: modal-fade-in 0.2s ease;
        }
        .lightbox img {
          max-width: 100%;
          max-height: 100%;
          border-radius: var(--radius-md);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        }
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

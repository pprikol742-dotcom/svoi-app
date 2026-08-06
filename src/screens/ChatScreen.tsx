import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, canEditMessage } from "@/store/useChatStore";
import { TopBar } from "@/components/TopBar";

const EMOJI_LIST = [
  "😀", "😂", "😍", "👍", "👎", "🙏", "🔥", "💯",
  "😢", "😡", "🤔", "🎉", "❤️", "👋", "🙌", "😎",
  "🤝", "💰", "🚗", "📦", "⏰", "✅", "❌", "😴",
];

export function ChatScreen() {
  const { chatId } = useParams();
  const { userId } = useAuthStore();
  const {
    messagesByChat,
    chatMeta,
    loadMessages,
    loadChatMeta,
    sendMessage,
    editMessage,
    deleteMessage,
    markChatAsRead,
    subscribeToChat,
  } = useChatStore();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionsForId, setActionsForId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = chatId ? messagesByChat[chatId] ?? [] : [];
  const meta = chatId ? chatMeta[chatId] : undefined;
  const other = meta ? (meta.buyer_id === userId ? meta.seller : meta.buyer) : undefined;

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
  }, [messages.length]);

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
    setDraft("");
    setShowEmoji(false);
    if (editingId) {
      const id = editingId;
      setEditingId(null);
      await editMessage(chatId, id, body);
    } else {
      await sendMessage(chatId, userId, body);
    }
  };

  const insertEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="screen screen--no-tab-padding chat-screen">
      <TopBar title={other?.display_name ?? "Диалог"} onBack />
      <div className="messages">
        {messages.map((m) => {
          const isMine = m.sender_id === userId;
          const editable = isMine && canEditMessage(m);
          return (
            <div key={m.id} className="bubble-wrap">
              <div
                className={`bubble${isMine ? " is-mine" : ""}`}
                onClick={() => editable && setActionsForId(actionsForId === m.id ? null : m.id)}
              >
                {m.body}
                {m.edited_at && <span className="edited-label"> · изменено</span>}
              </div>
              {actionsForId === m.id && (
                <div className="bubble-actions">
                  <button onClick={() => startEdit(m.id, m.body)}>Изменить</button>
                  <button onClick={() => handleDelete(m.id)} className="danger">Удалить</button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

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
          gap: var(--space-2);
        }
        .bubble-wrap { display: flex; flex-direction: column; }
        .bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          line-height: 1.4;
          align-self: flex-start;
          cursor: default;
        }
        .bubble.is-mine {
          align-self: flex-end;
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          cursor: pointer;
        }
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
      `}</style>
    </div>
  );
}
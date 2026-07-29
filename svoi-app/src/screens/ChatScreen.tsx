import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { TopBar } from "@/components/TopBar";

export function ChatScreen() {
  const { chatId } = useParams();
  const { userId } = useAuthStore();
  const { messagesByChat, chatMeta, loadMessages, loadChatMeta, sendMessage, subscribeToChat } = useChatStore();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!chatId || !userId || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    await sendMessage(chatId, userId, body);
  };

  return (
    <div className="screen screen--no-tab-padding chat-screen">
      <TopBar title={other?.display_name ?? "Диалог"} onBack />

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble${m.sender_id === userId ? " is-mine" : ""}`}>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <input
          className="composer__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Сообщение…"
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
        .bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          line-height: 1.4;
          align-self: flex-start;
        }
        .bubble.is-mine {
          align-self: flex-end;
          background: var(--color-primary);
          color: var(--color-text-onprimary);
        }
        .composer {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4) calc(var(--space-3) + var(--safe-bottom));
          border-top: 1px solid var(--color-border);
          background: var(--color-bg);
        }
        .composer__input {
          flex: 1;
          padding: 12px 14px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
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

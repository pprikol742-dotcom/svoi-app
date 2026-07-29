import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";

export function ChatListScreen() {
  const { userId } = useAuthStore();
  const { chats, loadChats } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) loadChats(userId);
  }, [userId]);

  if (!userId) {
    return (
      <div className="screen">
        <div className="empty-state">
          <h3>Войдите, чтобы видеть чаты</h3>
          <button className="btn-primary" style={{ marginTop: "var(--space-3)" }} onClick={() => navigate("/auth")}>
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="chats-header">
        <h1>Чаты</h1>
      </div>

      {chats.length === 0 ? (
        <div className="empty-state">
          <h3>Пока нет диалогов</h3>
          <p>Напишите продавцу на странице объявления — переписка появится здесь</p>
        </div>
      ) : (
        <div className="chat-list">
          {chats.map((chat) => {
            const other = chat.buyer_id === userId ? chat.seller : chat.buyer;
            const cover = chat.listing?.photos?.[0];
            return (
              <button key={chat.id} className="chat-row" onClick={() => navigate(`/chats/${chat.id}`)}>
                <div className="chat-row__avatar">
                  {cover ? <img src={cover} alt="" /> : (other?.display_name?.[0] ?? "?")}
                </div>
                <div className="chat-row__body">
                  <p className="chat-row__title">{other?.display_name ?? "Пользователь"}</p>
                  <p className="chat-row__subtitle">{chat.listing?.title ?? "Объявление"}</p>
                  <p className="chat-row__meta">
                    {chat.last_message_at ? new Date(chat.last_message_at).toLocaleString("ru-RU") : "Нет сообщений"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .chats-header { padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) var(--space-3); }
        .chats-header h1 { font-size: 20px; }
        .chat-list { display: flex; flex-direction: column; }
        .chat-row {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--color-border);
          text-align: left;
        }
        .chat-row__avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--color-accent-soft);
          color: #7a5410;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          font-family: var(--font-display);
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
        }
        .chat-row__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .chat-row__title { font-size: 14.5px; font-weight: 600; }
        .chat-row__subtitle { font-size: 12.5px; color: var(--color-text-secondary); margin-top: 1px; }
        .chat-row__meta { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 2px; opacity: 0.8; }
      `}</style>
    </div>
  );
}

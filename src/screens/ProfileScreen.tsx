import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useListingsStore } from "@/store/useListingsStore";
import type { Listing } from "@/types";

// Подписи и ссылки на партнёрские предложения — меняй здесь, в одном месте.
const TOOLS = [
  {
    title: "Подарок 500",
    url: "https://vk.ru/away.php?to=https%3A%2F%2Ftbank.ru%2Fbaf%2F2JQMqTOuPEi&utf=1",
  },
  {
    title: "Лимит до 1 миллиона",
    url: "https://vk.ru/away.php?to=https%3A%2F%2Ftbank.ru%2Fbaf%2F70dKHo5Vgnl&utf=1",
  },
  {
    title: "Т-Мобайл",
    url: "https://vk.ru/away.php?to=https%3A%2F%2Ftbank.ru%2Fbaf%2FGatyuPMEwP&utf=1",
  },
];

function ToolsPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="tools-page">
      <div className="tools-page__header">
        <button className="tools-page__back" onClick={onClose} aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1>Полезные инструменты</h1>
      </div>
      <div className="tools-page__list">
        {TOOLS.map((tool) => (
          <a key={tool.url} className="tools-page__btn" href={tool.url} target="_blank" rel="noopener noreferrer">
            {tool.title}
          </a>
        ))}
      </div>
      <style>{`
        .tools-page {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--color-bg);
          display: flex;
          flex-direction: column;
        }
        .tools-page__header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .tools-page__back {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: var(--color-text-primary);
        }
        .tools-page__back svg { width: 22px; height: 22px; }
        .tools-page__header h1 { font-size: 18px; font-weight: 700; }
        .tools-page__list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-5) var(--space-4);
        }
        .tools-page__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          background: var(--color-accent);
          color: var(--color-text-onaccent);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          font-size: 15.5px;
          font-weight: 700;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

export function ProfileScreen() {
  const { userId, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { republishListing } = useListingsStore();
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [republishingId, setRepublishingId] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("listings")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setMyListings(data as Listing[]));
  }, [userId]);

  const handleRepublish = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    setRepublishingId(listingId);
    const { error } = await republishListing(listingId);
    if (!error) {
      setMyListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: "pending_review", created_at: new Date().toISOString() } : l))
      );
    }
    setRepublishingId(null);
  };

  if (!userId) {
    return (
      <div className="screen">
        <div className="empty-state">
          <h3>Вы не вошли</h3>
          <p>Войдите, чтобы размещать объявления и переписываться с продавцами</p>
          <button className="btn-primary" style={{ marginTop: "var(--space-3)" }} onClick={() => navigate("/auth")}>
            Войти по email
          </button>
        </div>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    active: "Активно",
    pending_review: "На проверке",
    reserved: "Забронировано",
    sold: "Продано",
    rejected: "Отклонено",
    expired: "Истекло",
  };

  return (
    <div className="screen">
      {showTools && <ToolsPage onClose={() => setShowTools(false)} />}

      <div className="profile-header">
        <div className="profile-avatar">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            profile?.display_name?.[0] ?? "С"
          )}
        </div>
        <h2>{profile?.display_name ?? "Пользователь"}</h2>
        <p className="profile-district">{profile?.district ?? "Луганск"}</p>
        <button className="edit-link" onClick={() => navigate("/profile/edit")}>
          Редактировать профиль
        </button>
      </div>

      <div className="settings-row">
        <span>Тёмная тема</span>
        <button
          className={`switch${theme === "dark" ? " is-on" : ""}`}
          onClick={toggleTheme}
          aria-label="Переключить тему"
        >
          <span className="switch__knob" />
        </button>
      </div>

      <button className="tools-toggle" onClick={() => setShowTools(true)}>
        <span>Полезные инструменты — рекомендации</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      <button className="settings-row settings-row--link" onClick={() => navigate("/favorites")}>
        <span>Избранное</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      <button className="settings-row settings-row--link" onClick={() => navigate("/legal")}>
        <span>Политика конфиденциальности и условия</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      <h3 className="section-title">Мои объявления</h3>
      {myListings.length === 0 ? (
        <div className="empty-state">
          <p>Вы ещё ничего не разместили</p>
        </div>
      ) : (
        <div className="my-listings">
          {myListings.map((l) => (
            <div key={l.id} className="my-listing-row" onClick={() => navigate(`/listing/${l.id}`)}>
              <img src={l.photos[0]} alt="" />
              <div className="my-listing-info">
                <p className="my-listing-title">{l.title}</p>
                <span className={`tag-pill tag-pill--${l.status === "active" ? "success" : l.status === "expired" ? "danger" : "accent"}`}>
                  {statusLabel[l.status]}
                </span>
              </div>
              {l.status === "expired" && (
                <button
                  className="my-listing-republish"
                  onClick={(e) => handleRepublish(e, l.id)}
                  disabled={republishingId === l.id}
                >
                  {republishingId === l.id ? "…" : "Заново"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="btn-secondary" style={{ margin: "var(--space-5) var(--space-4) 0" }} onClick={signOut}>
        Выйти
      </button>

      <style>{`
        .profile-header {
          display: flex; flex-direction: column; align-items: center;
          padding: calc(var(--space-5) + var(--safe-top)) var(--space-4) var(--space-4);
        }
        .profile-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 800; font-size: 26px;
          margin-bottom: var(--space-2);
          overflow: hidden;
        }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-district { color: var(--color-text-secondary); font-size: 13px; margin-top: 2px; }
        .edit-link {
          margin-top: var(--space-3);
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
        }
        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 var(--space-4) var(--space-2);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          font-weight: 500;
        }
        .settings-row--link {
          width: calc(100% - var(--space-4) * 2);
          margin-bottom: var(--space-5);
          color: var(--color-text-primary);
          text-align: left;
        }
        .settings-row--link svg { width: 18px; height: 18px; color: var(--color-text-secondary); }
        .switch {
          width: 44px; height: 26px;
          border-radius: var(--radius-pill);
          background: var(--color-border);
          position: relative;
          flex-shrink: 0;
        }
        .switch.is-on { background: var(--color-primary); }
        .switch__knob {
          position: absolute;
          top: 3px; left: 3px;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: var(--shadow-card);
          transition: transform 0.15s ease;
        }
        .switch.is-on .switch__knob { transform: translateX(18px); }
        .tools-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: calc(100% - var(--space-4) * 2);
          margin: 0 var(--space-4) var(--space-5);
          padding: var(--space-3);
          background: var(--color-accent);
          color: var(--color-text-onaccent);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          font-weight: 700;
          text-align: left;
        }
        .tools-toggle svg { width: 18px; height: 18px; flex-shrink: 0; margin-left: var(--space-2); }
        .section-title { padding: 0 var(--space-4); font-size: 14px; margin-bottom: var(--space-2); }
        .my-listings { display: flex; flex-direction: column; padding: 0 var(--space-4); gap: var(--space-2); }
        .my-listing-row {
          display: flex; align-items: center; gap: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-2);
          box-shadow: var(--shadow-card);
        }
        .my-listing-row img { width: 52px; height: 52px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
        .my-listing-info { flex: 1; min-width: 0; }
        .my-listing-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
        .my-listing-republish {
          flex-shrink: 0;
          padding: 8px 12px;
          border-radius: var(--radius-pill);
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          font-size: 12.5px;
          font-weight: 600;
          font-family: var(--font-display);
        }
      `}</style>
    </div>
  );
}
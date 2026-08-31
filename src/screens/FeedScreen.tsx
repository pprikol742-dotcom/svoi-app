import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useListingsStore } from "@/store/useListingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ListingCard } from "@/components/ListingCard";
import { CategoryPickerModal } from "@/components/CategoryPickerModal";
import { FAB } from "@/components/FAB";

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  type: string;
  listing_id: string | null;
  created_at: string;
  read_at: string | null;
}

function NotificationsPage({
  userId,
  onClose,
  onRead,
}: {
  userId: string;
  onClose: () => void;
  onRead: () => void;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(async ({ data }) => {
        if (data) setItems(data as NotificationRow[]);
        setLoading(false);
        const unreadIds = (data ?? []).filter((n) => !n.read_at).map((n) => n.id);
        if (unreadIds.length > 0) {
          await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
          onRead();
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleClick = (n: NotificationRow) => {
    if (n.listing_id) {
      onClose();
      navigate(`/listing/${n.listing_id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  return (
    <div className="notif-page">
      <div className="notif-page__header">
        <button className="notif-page__back" onClick={onClose} aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1>Уведомления</h1>
      </div>
      {loading ? (
        <p className="notif-page__hint">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="notif-page__hint">Пока нет уведомлений</p>
      ) : (
        <div className="notif-page__list">
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-row${!n.read_at ? " is-unread" : ""}${n.listing_id ? " is-clickable" : ""}`}
              onClick={() => handleClick(n)}
            >
              <button
                className="notif-row__delete"
                onClick={(e) => handleDelete(e, n.id)}
                aria-label="Удалить"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <p className="notif-row__title">{n.title}</p>
              {n.body && <p className="notif-row__body">{n.body}</p>}
              <p className="notif-row__date">
                {new Date(n.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .notif-page {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--color-bg);
          display: flex;
          flex-direction: column;
        }
        .notif-page__header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .notif-page__back {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: var(--color-text-primary);
        }
        .notif-page__back svg { width: 22px; height: 22px; }
        .notif-page__header h1 { font-size: 18px; font-weight: 700; }
        .notif-page__hint {
          padding: var(--space-5) var(--space-4);
          color: var(--color-text-secondary);
          font-size: 14px;
          text-align: center;
        }
        .notif-page__list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          overflow-y: auto;
        }
        .notif-row {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          padding-right: 40px;
          box-shadow: var(--shadow-card);
        }
        .notif-row.is-unread { border: 1.5px solid var(--color-primary); }
        .notif-row.is-clickable { cursor: pointer; }
        .notif-row__delete {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          border-radius: 50%;
        }
        .notif-row__delete:active { background: var(--color-bg); color: #e5484d; }
        .notif-row__delete svg { width: 14px; height: 14px; }
        .notif-row__title { font-size: 14px; font-weight: 700; }
        .notif-row__body { font-size: 13px; color: var(--color-text-primary); margin-top: 4px; line-height: 1.4; }
        .notif-row__date { font-size: 11px; color: var(--color-text-secondary); margin-top: 6px; }
      `}</style>
    </div>
  );
}

function PhoneReminderPage({
  onGoToProfile,
  onClose,
}: {
  onGoToProfile: () => void;
  onClose: () => void;
}) {
  return (
    <div className="phone-reminder">
      <div className="phone-reminder__card">
        <div className="phone-reminder__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.36 2.3.56 3.5.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.5 21 3 13.5 3 4.5a1 1 0 0 1 1-1H6.5a1 1 0 0 1 1 1c0 1.2.2 2.4.56 3.5a1 1 0 0 1-.25 1L6.6 10.8Z" />
          </svg>
        </div>
        <h2>Добавьте номер телефона</h2>
        <p>Чтобы размещать объявления, укажите номер телефона в профиле — так покупатели смогут с вами связаться.</p>
        <button className="btn-primary" onClick={onGoToProfile}>
          Перейти в профиль
        </button>
        <button className="phone-reminder__skip" onClick={onClose}>
          Позже
        </button>
      </div>
      <style>{`
        .phone-reminder {
          position: fixed;
          inset: 0;
          z-index: 150;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .phone-reminder__card {
          width: 100%;
          max-width: 360px;
          background: var(--color-bg);
          border-radius: var(--radius-lg);
          padding: var(--space-5) var(--space-4);
          text-align: center;
        }
        .phone-reminder__icon {
          width: 56px;
          height: 56px;
          margin: 0 auto var(--space-3);
          border-radius: 50%;
          background: var(--color-accent-soft);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .phone-reminder__icon svg { width: 26px; height: 26px; }
        .phone-reminder__card h2 { font-size: 17px; font-weight: 700; margin-bottom: var(--space-2); }
        .phone-reminder__card p {
          font-size: 13.5px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-bottom: var(--space-4);
        }
        .phone-reminder__skip {
          margin-top: var(--space-2);
          font-size: 13px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}

export function FeedScreen() {
  const {
    categories,
    subcategories,
    listings,
    filters,
    favoriteIds,
    isLoading,
    loadCategories,
    loadSubcategories,
    loadFeed,
    setFilters,
    toggleFavorite,
  } = useListingsStore();
  const { userId, profile } = useAuthStore();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPhoneReminder, setShowPhoneReminder] = useState(false);
  const [phoneReminderDismissed, setPhoneReminderDismissed] = useState(false);

  useEffect(() => {
    Promise.all([loadCategories(), loadSubcategories()]).then(loadFeed);
  }, []);

  const loadUnreadCount = () => {
    if (!userId) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .then(({ count }) => setUnreadCount(count ?? 0));
  };

  useEffect(() => {
    loadUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId && profile && !profile.phone && !phoneReminderDismissed) {
      setShowPhoneReminder(true);
    }
  }, [userId, profile, phoneReminderDismissed]);

  const activeCategory = categories.find((c) => c.slug === filters.categorySlug);
  const activeSubcategory = subcategories.find((s) => s.id === filters.subcategoryId);
  const filterLabel = activeSubcategory
    ? `${activeCategory?.title ?? ""} · ${activeSubcategory.title}`
    : activeCategory?.title ?? "Все категории";

  return (
    <div className="screen">
      {showPhoneReminder && (
        <PhoneReminderPage
          onGoToProfile={() => {
            setShowPhoneReminder(false);
            setPhoneReminderDismissed(true);
            navigate("/profile/edit");
          }}
          onClose={() => {
            setShowPhoneReminder(false);
            setPhoneReminderDismissed(true);
          }}
        />
      )}

      {showNotifications && userId && (
        <NotificationsPage
          userId={userId}
          onClose={() => setShowNotifications(false)}
          onRead={() => setUnreadCount(0)}
        />
      )}

      <div className="feed-header">
        <div className="feed-header__brand">
          <span className="feed-header__logo">Свои</span>
          <span className="feed-header__place">Луганск</span>
        </div>
        {userId && (
          <button className="feed-header__bell" onClick={() => setShowNotifications(true)} aria-label="Уведомления">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="feed-header__bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
        )}
      </div>

      <button type="button" className="category-filter" onClick={() => setPickerOpen(true)}>
        <span>{filterLabel}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <CategoryPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        categories={categories}
        subcategories={subcategories}
        selectedCategoryId={activeCategory?.id ?? null}
        selectedSubcategoryId={filters.subcategoryId !== "all" ? filters.subcategoryId : null}
        onSelectCategory={(c) => setFilters({ categorySlug: c?.slug ?? "all", subcategoryId: "all" })}
        onSelectSubcategory={(s) => setFilters({ subcategoryId: s?.id ?? "all" })}
        allowAll
        title="Категория"
      />

      {isLoading && listings.length === 0 ? (
        <div className="empty-state">
          <h3>Загружаем объявления…</h3>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <h3>Пока пусто</h3>
          <p>Будьте первым, кто разместит объявление в этой категории</p>
        </div>
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={favoriteIds.has(listing.id)}
              onToggleFavorite={() => userId && toggleFavorite(listing.id, userId)}
            />
          ))}
        </div>
      )}

      <FAB />

      <style>{`
        .feed-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: var(--space-4) var(--space-4) var(--space-2);
          padding-top: calc(var(--space-3) + var(--safe-top));
        }
        .feed-header__brand {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
        }
        .feed-header__logo {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 24px;
          color: var(--color-primary);
          letter-spacing: -0.02em;
        }
        .feed-header__place {
          font-size: 13px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
        .feed-header__bell {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--color-surface);
          box-shadow: var(--shadow-card);
          color: var(--color-text-primary);
          flex-shrink: 0;
        }
        .feed-header__bell svg { width: 19px; height: 19px; }
        .feed-header__bell-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 9px;
          background: var(--color-danger);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--color-bg);
        }
        .category-filter {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          margin: var(--space-1) var(--space-4) var(--space-3);
          padding: 10px 14px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 13.5px;
          color: var(--color-text-primary);
        }
        .category-filter svg { width: 16px; height: 16px; color: var(--color-text-secondary); }
        .listing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
          padding: 0 var(--space-4);
        }
      `}</style>
    </div>
  );
}
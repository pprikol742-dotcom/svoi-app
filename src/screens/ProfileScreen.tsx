import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useListingsStore } from "@/store/useListingsStore";
import type { Listing } from "@/types";

interface PartnerTool {
  id: string;
  title: string;
  url: string;
  sort_order: number;
}

function ToolsPage({ onClose }: { onClose: () => void }) {
  const [tools, setTools] = useState<PartnerTool[]>([]);

  useEffect(() => {
    supabase
      .from("partner_tools")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => data && setTools(data as PartnerTool[]));
  }, []);

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
        {tools.map((tool) => (
          <a key={tool.id} className="tools-page__btn" href={tool.url} target="_blank" rel="noopener noreferrer">
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

interface AdminListingRow {
  id: string;
  title: string;
  status: string;
  price: number | null;
  photos: string[];
  created_at: string;
  owner: { display_name: string } | null;
}

interface AdminReportRow {
  id: string;
  listing_id: string;
  reason: string;
  comment: string | null;
  created_at: string;
  resolved: boolean;
  listing: { title: string } | null;
  reporter: { display_name: string } | null;
}

type AdminTab = "reports" | "listings" | "tools";

function AdminPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<AdminTab>("reports");
  const [rows, setRows] = useState<AdminListingRow[]>([]);
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [tools, setTools] = useState<PartnerTool[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const loadListings = () => {
    setLoading(true);
    supabase
      .from("listings")
      .select("id, title, status, price, photos, created_at, owner:profiles!listings_owner_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setRows(data as unknown as AdminListingRow[]);
        setLoading(false);
      });
  };

  const loadReports = () => {
    setLoading(true);
    supabase
      .from("reports")
      .select(
        "id, listing_id, reason, comment, created_at, resolved, listing:listings!reports_listing_id_fkey(title), reporter:profiles!reports_reporter_id_fkey(display_name)"
      )
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data as unknown as AdminReportRow[]);
        setLoading(false);
      });
  };

  const loadTools = () => {
    setLoading(true);
    supabase
      .from("partner_tools")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setTools(data as PartnerTool[]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (tab === "listings") loadListings();
    else if (tab === "reports") loadReports();
    else loadTools();
  }, [tab]);

  const handleDeleteListing = async (id: string) => {
    if (!window.confirm("Удалить это объявление безвозвратно? Отменить будет нельзя.")) return;
    setBusyId(id);
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setReports((prev) => prev.filter((r) => r.listing_id !== id));
    }
    setBusyId(null);
  };

  const handleResolveReport = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("reports").update({ resolved: true }).eq("id", id);
    if (!error) setReports((prev) => prev.filter((r) => r.id !== id));
    setBusyId(null);
  };

  const handleAddTool = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    setBusyId("new");
    const maxOrder = tools.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { data, error } = await supabase
      .from("partner_tools")
      .insert({ title: newTitle.trim(), url: newUrl.trim(), sort_order: maxOrder + 1 })
      .select()
      .single();
    if (!error && data) {
      setTools((prev) => [...prev, data as PartnerTool]);
      setNewTitle("");
      setNewUrl("");
    }
    setBusyId(null);
  };

  const startEditTool = (t: PartnerTool) => {
    setEditingToolId(t.id);
    setEditTitle(t.title);
    setEditUrl(t.url);
  };

  const saveEditTool = async () => {
    if (!editingToolId || !editTitle.trim() || !editUrl.trim()) return;
    setBusyId(editingToolId);
    const { error } = await supabase
      .from("partner_tools")
      .update({ title: editTitle.trim(), url: editUrl.trim() })
      .eq("id", editingToolId);
    if (!error) {
      setTools((prev) =>
        prev.map((t) => (t.id === editingToolId ? { ...t, title: editTitle.trim(), url: editUrl.trim() } : t))
      );
      setEditingToolId(null);
    }
    setBusyId(null);
  };

  const deleteTool = async (id: string) => {
    if (!window.confirm("Удалить эту ссылку из списка инструментов?")) return;
    setBusyId(id);
    const { error } = await supabase.from("partner_tools").delete().eq("id", id);
    if (!error) setTools((prev) => prev.filter((t) => t.id !== id));
    setBusyId(null);
  };

  const filteredListings = query.trim()
    ? rows.filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <button className="admin-page__back" onClick={onClose} aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1>Админ-панель</h1>
      </div>

      <div className="admin-page__tabs">
        <button className={`admin-page__tab${tab === "reports" ? " is-active" : ""}`} onClick={() => setTab("reports")}>
          Жалобы{reports.length > 0 ? ` (${reports.length})` : ""}
        </button>
        <button className={`admin-page__tab${tab === "listings" ? " is-active" : ""}`} onClick={() => setTab("listings")}>
          Объявления
        </button>
        <button className={`admin-page__tab${tab === "tools" ? " is-active" : ""}`} onClick={() => setTab("tools")}>
          Инструменты
        </button>
      </div>

      {tab === "listings" && (
        <input
          className="admin-page__search"
          placeholder="Поиск по названию…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {loading ? (
        <p className="admin-page__hint">Загрузка…</p>
      ) : tab === "listings" ? (
        filteredListings.length === 0 ? (
          <p className="admin-page__hint">Ничего не найдено</p>
        ) : (
          <div className="admin-page__list">
            {filteredListings.map((r) => (
              <div key={r.id} className="admin-row">
                <div className="admin-row__thumb">
                  {r.photos?.[0] ? <img src={r.photos[0]} alt="" /> : "—"}
                </div>
                <div className="admin-row__info">
                  <p className="admin-row__title">{r.title}</p>
                  <p className="admin-row__meta">
                    {r.owner?.display_name ?? "неизвестно"} · {r.status}
                    {r.price != null ? ` · ${r.price} ₽` : ""}
                  </p>
                </div>
                <button className="admin-row__delete" onClick={() => handleDeleteListing(r.id)} disabled={busyId === r.id}>
                  {busyId === r.id ? "…" : "Удалить"}
                </button>
              </div>
            ))}
          </div>
        )
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <p className="admin-page__hint">Жалоб пока нет</p>
        ) : (
          <div className="admin-page__list">
            {reports.map((r) => (
              <div key={r.id} className="report-row">
                <p className="report-row__listing">{r.listing?.title ?? "объявление удалено"}</p>
                <p className="report-row__reason">{r.reason}</p>
                {r.comment && <p className="report-row__comment">«{r.comment}»</p>}
                <p className="report-row__meta">
                  от {r.reporter?.display_name ?? "неизвестно"} · {new Date(r.created_at).toLocaleDateString("ru-RU")}
                </p>
                <div className="report-row__actions">
                  <button
                    className="report-row__resolve"
                    onClick={() => handleResolveReport(r.id)}
                    disabled={busyId === r.id}
                  >
                    Отклонить жалобу
                  </button>
                  <button
                    className="report-row__delete"
                    onClick={() => handleDeleteListing(r.listing_id)}
                    disabled={busyId === r.id}
                  >
                    Удалить объявление
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="admin-page__list">
          <div className="tool-form">
            <input
              className="tool-form__input"
              placeholder="Название"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="tool-form__input"
              placeholder="Ссылка (https://…)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <button className="tool-form__add" onClick={handleAddTool} disabled={busyId === "new"}>
              {busyId === "new" ? "…" : "Добавить ссылку"}
            </button>
          </div>

          {tools.map((t) =>
            editingToolId === t.id ? (
              <div key={t.id} className="tool-form">
                <input className="tool-form__input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <input className="tool-form__input" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                <div className="tool-form__row">
                  <button className="tool-form__cancel" onClick={() => setEditingToolId(null)}>
                    Отмена
                  </button>
                  <button className="tool-form__add" onClick={saveEditTool} disabled={busyId === t.id}>
                    {busyId === t.id ? "…" : "Сохранить"}
                  </button>
                </div>
              </div>
            ) : (
              <div key={t.id} className="admin-row">
                <div className="admin-row__info">
                  <p className="admin-row__title">{t.title}</p>
                  <p className="admin-row__meta">{t.url}</p>
                </div>
                <div className="tool-row__actions">
                  <button className="tool-row__edit" onClick={() => startEditTool(t)}>
                    Изменить
                  </button>
                  <button className="admin-row__delete" onClick={() => deleteTool(t.id)} disabled={busyId === t.id}>
                    {busyId === t.id ? "…" : "Удалить"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <style>{`
        .admin-page {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--color-bg);
          display: flex;
          flex-direction: column;
        }
        .admin-page__header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .admin-page__back {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: var(--color-text-primary);
        }
        .admin-page__back svg { width: 22px; height: 22px; }
        .admin-page__header h1 { font-size: 17px; font-weight: 700; }
        .admin-page__tabs {
          display: flex;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4) 0;
          overflow-x: auto;
        }
        .admin-page__tab {
          flex-shrink: 0;
          padding: 8px 14px;
          border-radius: var(--radius-pill);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
        }
        .admin-page__tab.is-active {
          background: var(--color-primary);
          color: var(--color-text-onprimary);
        }
        .admin-page__search {
          margin: var(--space-3) var(--space-4) 0;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: 14px;
        }
        .admin-page__hint {
          padding: var(--space-5) var(--space-4);
          color: var(--color-text-secondary);
          font-size: 14px;
          text-align: center;
        }
        .admin-page__list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          overflow-y: auto;
        }
        .admin-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-2);
          box-shadow: var(--shadow-card);
        }
        .admin-row__thumb {
          width: 48px; height: 48px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          flex-shrink: 0;
          background: var(--color-accent-soft);
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          font-size: 12px;
        }
        .admin-row__thumb img { width: 100%; height: 100%; object-fit: cover; }
        .admin-row__info { flex: 1; min-width: 0; }
        .admin-row__title { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-row__meta { font-size: 11.5px; color: var(--color-text-secondary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .admin-row__delete {
          flex-shrink: 0;
          padding: 8px 12px;
          border-radius: var(--radius-pill);
          background: var(--color-danger);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .report-row {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          box-shadow: var(--shadow-card);
        }
        .report-row__listing { font-size: 13.5px; font-weight: 600; }
        .report-row__reason { font-size: 13px; color: var(--color-danger); margin-top: 4px; font-weight: 600; }
        .report-row__comment { font-size: 12.5px; color: var(--color-text-secondary); margin-top: 4px; font-style: italic; }
        .report-row__meta { font-size: 11px; color: var(--color-text-secondary); margin-top: 6px; }
        .report-row__actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
        .report-row__resolve, .report-row__delete {
          flex: 1;
          padding: 8px 10px;
          border-radius: var(--radius-pill);
          font-size: 11.5px;
          font-weight: 600;
        }
        .report-row__resolve { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-secondary); }
        .report-row__delete { background: var(--color-danger); color: #fff; }
        .tool-form {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          box-shadow: var(--shadow-card);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .tool-form__input {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          border: 1.5px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-size: 13.5px;
        }
        .tool-form__row { display: flex; gap: var(--space-2); }
        .tool-form__add {
          padding: 9px 12px;
          border-radius: var(--radius-pill);
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          font-size: 12.5px;
          font-weight: 600;
        }
        .tool-form__cancel {
          flex: 1;
          padding: 9px 12px;
          border-radius: var(--radius-pill);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          font-size: 12.5px;
          font-weight: 600;
        }
        .tool-row__actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .tool-row__edit {
          padding: 6px 10px;
          border-radius: var(--radius-pill);
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 600;
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
  const [showAdmin, setShowAdmin] = useState(false);

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
      {showAdmin && <AdminPage onClose={() => setShowAdmin(false)} />}

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

      {profile?.is_admin && (
        <button className="admin-toggle" onClick={() => setShowAdmin(true)}>
          <span>Админ-панель</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}

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
          margin: 0 var(--space-4) var(--space-2);
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
        .admin-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: calc(100% - var(--space-4) * 2);
          margin: 0 var(--space-4) var(--space-5);
          padding: var(--space-3);
          background: var(--color-danger-soft);
          color: var(--color-danger);
          border: 1.5px solid var(--color-danger);
          border-radius: var(--radius-md);
          font-size: 14.5px;
          font-weight: 700;
          text-align: left;
        }
        .admin-toggle svg { width: 18px; height: 18px; flex-shrink: 0; margin-left: var(--space-2); }
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
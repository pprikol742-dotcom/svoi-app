import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useListingsStore } from "@/store/useListingsStore";
import { Confetti } from "@/components/Confetti";
import { AdminAIQuotaControls } from "@/components/AdminAIQuotaControls";
import type { Listing } from "@/types";

const PRO_SEEN_KEY = "svoi_pro_seen_until";
const OZON_PAY_URL = "https://finance.ozon.ru/apps/sbp/ozonbankpay/01a01625-3fd8-76a4-8ca8-d185171b3f49?attempt=1";
const SUPPORT_EMAIL = "sergei.shvachyov@yandex.com";

function isProActive(proUntil: string | null | undefined) {
  return !!proUntil && new Date(proUntil) > new Date();
}

function isProForever(proUntil: string | null | undefined) {
  return !!proUntil && new Date(proUntil).getFullYear() >= 2090;
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

function ProPage({
  userId,
  proUntil,
  onClose,
}: {
  userId: string;
  proUntil: string | null;
  onClose: () => void;
}) {
  const active = isProActive(proUntil);
  const forever = isProForever(proUntil);
  const [copied, setCopied] = useState(false);

  const supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Оплата Свои Про"
  )}&body=${encodeURIComponent(`Мой ID: ${userId}\nОплатил(а) через Ozon Pay, прошу активировать Про.`)}`;

  const handleCopyId = () => {
    copyToClipboard(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pro-page">
      <div className="pro-page__header">
        <button className="pro-page__back" onClick={onClose} aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1>Свои Про</h1>
      </div>

      <div className="pro-page__content">
        <div className={`pro-status${active ? " pro-status--active" : ""}`}>
          <span className="pro-status__badge">PRO</span>
          <p>
            {active
              ? forever
                ? "Активирован навсегда 🎉"
                : `Активен до ${new Date(proUntil!).toLocaleDateString("ru-RU")}`
              : "Пока не активирован"}
          </p>
        </div>

        <div className="pro-benefits">
          <h3>Что даёт Про</h3>
          <div className="pro-benefit">
            <span className="pro-benefit__icon">📦</span>
            <span>Публикация без ограничения в 10 объявлений в месяц</span>
          </div>
          <div className="pro-benefit">
            <span className="pro-benefit__icon">💬</span>
            <span>Помощь чат-бота в приложении (скоро)</span>
          </div>
          <div className="pro-benefit">
            <span className="pro-benefit__icon">⬆️</span>
            <span>Поднятие своих объявлений в топ ленты — до 5 раз в месяц</span>
          </div>
        </div>

        <div className="pro-price">
          <span className="pro-price__amount">199 ₽</span>
          <span className="pro-price__period"> / месяц</span>
        </div>

        <div className="pro-promo">
          🎁 Первым 300 зарегистрировавшимся — Про навсегда в подарок. Просто оформите оплату как обычно, и это будет учтено.
        </div>

        <a className="pro-pay-button" href={OZON_PAY_URL} target="_blank" rel="noopener noreferrer">
          Оплатить через Ozon Pay
        </a>

        <div className="pro-your-id">
          <p>
            Ozon Pay не позволяет добавить комментарий к переводу, поэтому после оплаты отправьте ваш ID в поддержку —
            так Про активируют быстрее:
          </p>
          <div className="pro-your-id__row">
            <code>{userId}</code>
            <button onClick={handleCopyId} className={copied ? "is-copied" : ""}>
              {copied ? "Скопировано ✓" : "Копировать"}
            </button>
          </div>
          <a className="pro-your-id__support" href={supportMailto}>
            Написать в поддержку
          </a>
        </div>

        <p className="pro-note">
          После перевода статус активируется вручную, обычно в течение суток. Если дольше — напишите в поддержку
          через раздел «Правовая информация».
        </p>
      </div>

      <style>{`
        .pro-page {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--color-bg);
          display: flex;
          flex-direction: column;
        }
        .pro-page__header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) var(--space-3);
          border-bottom: 1px solid var(--color-border);
        }
        .pro-page__back {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: var(--color-text-primary);
        }
        .pro-page__back svg { width: 22px; height: 22px; }
        .pro-page__header h1 { font-size: 18px; font-weight: 700; }
        .pro-page__content { padding: var(--space-4); overflow-y: auto; padding-bottom: var(--space-6); }
        .pro-status {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          margin-bottom: var(--space-4);
        }
        .pro-status--active { border: 1.5px solid var(--color-accent); }
        .pro-status__badge {
          background: var(--color-accent);
          color: var(--color-text-onaccent);
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          flex-shrink: 0;
        }
        .pro-status p { font-size: 13.5px; font-weight: 600; }
        .pro-benefits { margin-bottom: var(--space-4); }
        .pro-benefits h3 { font-size: 14px; margin-bottom: var(--space-2); }
        .pro-benefit {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          padding: var(--space-2) 0;
          font-size: 14px;
          line-height: 1.4;
        }
        .pro-benefit__icon { flex-shrink: 0; }
        .pro-price {
          text-align: center;
          margin-bottom: var(--space-3);
        }
        .pro-price__amount { font-size: 30px; font-weight: 800; font-family: var(--font-display); color: var(--color-primary); }
        .pro-price__period { font-size: 14px; color: var(--color-text-secondary); }
        .pro-promo {
          background: var(--color-accent-soft);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: var(--space-4);
          text-align: center;
        }
        .pro-pay-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: var(--space-4);
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          font-size: 15.5px;
          font-weight: 800;
          font-family: var(--font-display);
          text-align: center;
          margin-bottom: var(--space-4);
        }
        .pro-your-id {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .pro-your-id p { font-size: 12.5px; color: var(--color-text-secondary); margin-bottom: var(--space-2); line-height: 1.5; }
        .pro-your-id__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }
        .pro-your-id__row code {
          font-size: 11.5px;
          word-break: break-all;
          color: var(--color-text-primary);
        }
        .pro-your-id__row button {
          flex-shrink: 0;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          font-size: 11.5px;
          font-weight: 600;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .pro-your-id__row button.is-copied {
          background: var(--color-success, #2ecc71);
          animation: copy-pulse 0.35s ease;
        }
        @keyframes copy-pulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .pro-your-id__support {
          display: inline-block;
          margin-top: var(--space-2);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-primary);
        }
        .pro-note {
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-top: var(--space-4);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

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

interface ProLookupResult {
  id: string;
  display_name: string;
  pro_until: string | null;
}

type AdminTab = "reports" | "listings" | "tools" | "notifications" | "pro";

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
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSent, setNotifSent] = useState(false);
  const [notifCount, setNotifCount] = useState<number | null>(null);
  const [proCount, setProCount] = useState<number | null>(null);
  const [proUserId, setProUserId] = useState("");
  const [proResult, setProResult] = useState<ProLookupResult | null | undefined>(undefined);
  const [proSearching, setProSearching] = useState(false);

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

  const loadProCount = () => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("pro_until", "is", null)
      .then(({ count }) => {
        setProCount(count ?? 0);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (tab === "listings") loadListings();
    else if (tab === "reports") loadReports();
    else if (tab === "tools") loadTools();
    else if (tab === "pro") loadProCount();
    else setLoading(false);
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

  const handleSendNotification = async () => {
    if (!notifTitle.trim()) return;
    setBusyId("notif");
    setNotifSent(false);
    const { data: allProfiles } = await supabase.from("profiles").select("id");
    if (allProfiles && allProfiles.length > 0) {
      const rows = allProfiles.map((p) => ({
        user_id: p.id,
        title: notifTitle.trim(),
        body: notifBody.trim() || null,
        type: "admin",
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (!error) {
        setNotifCount(allProfiles.length);
        setNotifSent(true);
        setNotifTitle("");
        setNotifBody("");
      }
    }
    setBusyId(null);
  };

  const handleLookupProUser = async () => {
    if (!proUserId.trim()) return;
    setProSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, pro_until")
      .eq("id", proUserId.trim())
      .maybeSingle();
    setProResult((data as ProLookupResult) ?? null);
    setProSearching(false);
  };

  const handleGrantPro = async (forever: boolean) => {
    if (!proResult) return;
    setBusyId("grant");
    const until = forever
      ? new Date("2099-01-01").toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("profiles").update({ pro_until: until }).eq("id", proResult.id);
    if (!error) {
      setProResult({ ...proResult, pro_until: until });
      loadProCount();
    }
    setBusyId(null);
  };

  const handleRevokePro = async () => {
    if (!proResult) return;
    setBusyId("revoke");
    const { error } = await supabase.from("profiles").update({ pro_until: null }).eq("id", proResult.id);
    if (!error) {
      setProResult({ ...proResult, pro_until: null });
      loadProCount();
    }
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
        <button className={`admin-page__tab${tab === "notifications" ? " is-active" : ""}`} onClick={() => setTab("notifications")}>
          Уведомления
        </button>
        <button className={`admin-page__tab${tab === "pro" ? " is-active" : ""}`} onClick={() => setTab("pro")}>
          Про
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

      {tab === "notifications" ? (
        <div className="admin-page__list">
          <div className="tool-form">
            <input
              className="tool-form__input"
              placeholder="Заголовок уведомления"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
            />
            <textarea
              className="tool-form__input tool-form__textarea"
              placeholder="Текст (необязательно)"
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              rows={3}
            />
            <button className="tool-form__add" onClick={handleSendNotification} disabled={busyId === "notif" || !notifTitle.trim()}>
              {busyId === "notif" ? "Отправляем…" : "Отправить всем пользователям"}
            </button>
            {notifSent && <p className="notif-sent-hint">Отправлено {notifCount} пользователям</p>}
          </div>
        </div>
      ) : tab === "pro" ? (
        <div className="admin-page__list">
          <div className="tool-form">
            <p className="pro-admin__count">
              {loading ? "Считаем…" : `Всего Про-аккаунтов: ${proCount}`}
            </p>
            <input
              className="tool-form__input"
              placeholder="ID пользователя из комментария к переводу"
              value={proUserId}
              onChange={(e) => setProUserId(e.target.value)}
            />
            <button className="tool-form__add" onClick={handleLookupProUser} disabled={proSearching || !proUserId.trim()}>
              {proSearching ? "Ищем…" : "Найти"}
            </button>
          </div>

          {proResult === null && <p className="admin-page__hint">Пользователь с таким ID не найден</p>}

          {proResult && (
            <div className="tool-form">
              <p className="pro-admin__name">{proResult.display_name}</p>
              <p className="pro-admin__status">
                {isProActive(proResult.pro_until)
                  ? isProForever(proResult.pro_until)
                    ? "Уже Про — навсегда"
                    : `Уже Про — до ${new Date(proResult.pro_until!).toLocaleDateString("ru-RU")}`
                  : "Про не активирован"}
              </p>
              <div className="tool-form__row">
                <button className="tool-form__add" onClick={() => handleGrantPro(false)} disabled={busyId === "grant"}>
                  Выдать на месяц
                </button>
                <button className="tool-form__add" onClick={() => handleGrantPro(true)} disabled={busyId === "grant"}>
                  Навсегда (акция)
                </button>
              </div>
              {isProActive(proResult.pro_until) && (
                <button className="tool-form__cancel" onClick={handleRevokePro} disabled={busyId === "revoke"}>
                  Отозвать Про
                </button>
              )}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
                <p className="pro-admin__status" style={{ marginBottom: 8 }}>Токены ИИ-агента</p>
                <AdminAIQuotaControls userId={proResult.id} />
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
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
        .tool-form__textarea { resize: none; font-family: inherit; }
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
        .notif-sent-hint { font-size: 12.5px; color: var(--color-success); text-align: center; }
        .pro-admin__count { font-size: 13px; font-weight: 700; color: var(--color-primary); }
        .pro-admin__name { font-size: 14px; font-weight: 700; }
        .pro-admin__status { font-size: 12.5px; color: var(--color-text-secondary); }
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
  const [showPro, setShowPro] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("listings")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setMyListings(data as Listing[]));
  }, [userId]);

  useEffect(() => {
    if (!profile?.pro_until || !isProActive(profile.pro_until)) return;
    const seen = localStorage.getItem(PRO_SEEN_KEY);
    if (seen === profile.pro_until) return;
    setShowConfetti(true);
    localStorage.setItem(PRO_SEEN_KEY, profile.pro_until);
  }, [profile?.pro_until]);

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
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      {showTools && <ToolsPage onClose={() => setShowTools(false)} />}
      {showAdmin && <AdminPage onClose={() => setShowAdmin(false)} />}
      {showPro && userId && (
        <ProPage userId={userId} proUntil={profile?.pro_until ?? null} onClose={() => setShowPro(false)} />
      )}

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

      <button className="pro-toggle" onClick={() => setShowPro(true)}>
        <span>{isProActive(profile?.pro_until) ? "Свои Про — активен" : "Свои Про — оформить"}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

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
        .pro-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: calc(100% - var(--space-4) * 2);
          margin: 0 var(--space-4) var(--space-2);
          padding: var(--space-3);
          background: linear-gradient(135deg, var(--color-accent), #f0c874);
          color: var(--color-text-onaccent);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          font-weight: 800;
          font-family: var(--font-display);
          text-align: left;
        }
        .pro-toggle svg { width: 18px; height: 18px; flex-shrink: 0; margin-left: var(--space-2); }
        .tools-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: calc(100% - var(--space-4) * 2);
          margin: 0 var(--space-4) var(--space-2);
          padding: var(--space-3);
          background: var(--color-surface);
          color: var(--color-text-primary);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
          font-size: 14.5px;
          font-weight: 700;
          text-align: left;
        }
        .tools-toggle svg { width: 18px; height: 18px; flex-shrink: 0; margin-left: var(--space-2); color: var(--color-text-secondary); }
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

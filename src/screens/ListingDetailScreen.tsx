import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useListingsStore } from "@/store/useListingsStore";
import { TopBar } from "@/components/TopBar";
import type { ListingWithOwner } from "@/types";

function formatPrice(listing: ListingWithOwner) {
  if (listing.is_free) return "Даром";
  if (listing.is_barter) return "Обмен";
  if (listing.price == null) return "Цена не указана";
  return `${listing.price.toLocaleString("ru-RU")} ₽`;
}

const REPORT_REASONS = [
  "Мошенничество",
  "Запрещённый товар/услуга",
  "Спам или реклама",
  "Оскорбительное содержание",
  "Объявление устарело / уже продано",
  "Другое",
];

function ReportModal({
  listingId,
  userId,
  onClose,
}: {
  listingId: string;
  userId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    const { error } = await supabase.from("reports").insert({
      listing_id: listingId,
      reporter_id: userId,
      reason,
      comment: comment.trim() || null,
    });
    setSending(false);
    if (error) setError("Не получилось отправить, попробуйте ещё раз");
    else setSent(true);
  };

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h3>Спасибо</h3>
            <p className="report-modal__hint">Жалоба отправлена, мы её рассмотрим.</p>
            <button className="btn-primary" onClick={onClose}>
              Закрыть
            </button>
          </>
        ) : (
          <>
            <h3>Пожаловаться на объявление</h3>
            <div className="report-modal__reasons">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="report-modal__reason">
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <textarea
              className="report-modal__comment"
              placeholder="Комментарий (необязательно)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            {error && <p className="report-modal__error">{error}</p>}
            <div className="report-modal__actions">
              <button className="btn-secondary" onClick={onClose} disabled={sending}>
                Отмена
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={sending}>
                {sending ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`
        .report-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .report-modal {
          width: 100%;
          max-width: 480px;
          background: var(--color-bg);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: var(--space-5) var(--space-4) calc(var(--space-5) + var(--safe-bottom));
        }
        .report-modal h3 { font-size: 16.5px; font-weight: 700; margin-bottom: var(--space-3); }
        .report-modal__hint { font-size: 14px; color: var(--color-text-secondary); margin-bottom: var(--space-4); }
        .report-modal__reasons {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .report-modal__reason {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          font-size: 14px;
        }
        .report-modal__reason input { accent-color: var(--color-primary); width: 16px; height: 16px; }
        .report-modal__comment {
          width: 100%;
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: 14px;
          font-family: inherit;
          resize: none;
          margin-bottom: var(--space-3);
        }
        .report-modal__error { color: var(--color-danger); font-size: 13px; margin-bottom: var(--space-2); }
        .report-modal__actions { display: flex; gap: var(--space-2); }
        .report-modal__actions .btn-primary,
        .report-modal__actions .btn-secondary { flex: 1; width: auto; }
      `}</style>
    </div>
  );
}

export function ListingDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuthStore();
  const { openOrCreateChat } = useChatStore();
  const { deleteListing, republishListing } = useListingsStore();
  const [listing, setListing] = useState<ListingWithOwner | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loadedPhotos, setLoadedPhotos] = useState<Set<number>>(new Set());
  const [contacting, setContacting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const justSwiped = useRef(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("listings")
      .select(
        "*, owner:profiles!listings_owner_id_fkey(id,display_name,avatar_url,rating), category:categories!listings_category_id_fkey(slug,title,icon), subcategory:subcategories!listings_subcategory_id_fkey(slug,title)"
      )
      .eq("id", id)
      .single()
      .then(({ data }) => data && setListing(data as unknown as ListingWithOwner));
  }, [id]);

  const photoCount = listing?.photos.length ?? 0;

  const goToPhoto = (index: number) => {
    if (photoCount === 0) return;
    setActivePhoto((index + photoCount) % photoCount);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    const SWIPE_THRESHOLD = 40;
    if (delta > SWIPE_THRESHOLD) {
      justSwiped.current = true;
      goToPhoto(activePhoto - 1);
    } else if (delta < -SWIPE_THRESHOLD) {
      justSwiped.current = true;
      goToPhoto(activePhoto + 1);
    }
  };

  if (!listing) {
    return (
      <div className="screen screen--no-tab-padding">
        <TopBar title="Объявление" onBack />
        <div className="empty-state">
          <h3>Загружаем…</h3>
        </div>
      </div>
    );
  }

  const isOwnListing = listing.owner_id === userId;

  const handleContact = async () => {
    if (!userId) return navigate("/auth");
    setContacting(true);
    try {
      const chatId = await openOrCreateChat(listing.id, userId, listing.owner_id);
      navigate(`/chats/${chatId}`);
    } finally {
      setContacting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmingDelete) return setConfirmingDelete(true);
    setBusy(true);
    const { error } = await deleteListing(listing.id);
    setBusy(false);
    if (!error) navigate("/profile");
  };

  const handleRepublish = async () => {
    setBusy(true);
    const { error } = await republishListing(listing.id);
    setBusy(false);
    if (!error) setListing({ ...listing, status: "pending_review", created_at: new Date().toISOString() });
  };

  const handleReportClick = () => {
    if (!userId) return navigate("/auth");
    setShowReport(true);
  };

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title={listing.subcategory?.title ?? listing.category?.title ?? "Объявление"} onBack />

      {showReport && userId && (
        <ReportModal listingId={listing.id} userId={userId} onClose={() => setShowReport(false)} />
      )}

      <div
        className="gallery"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartX.current = null;
          touchDeltaX.current = 0;
        }}
      >
        {photoCount > 0 ? (
          <div
            className="gallery__track"
            style={{ transform: `translateX(-${activePhoto * 100}%)` }}
            onClick={(e) => {
              if (justSwiped.current) {
                justSwiped.current = false;
                return;
              }
              if (photoCount < 2) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const tapX = e.clientX - rect.left;
              if (tapX < rect.width * 0.35) goToPhoto(activePhoto - 1);
              else if (tapX > rect.width * 0.65) goToPhoto(activePhoto + 1);
            }}
          >
            {listing.photos.map((url, i) => (
              <img
                key={url + i}
                src={url}
                alt={listing.title}
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                className={loadedPhotos.has(i) ? "is-loaded" : ""}
                onLoad={() => setLoadedPhotos((prev) => new Set(prev).add(i))}
              />
            ))}
          </div>
        ) : (
          <div className="gallery__placeholder">Без фото</div>
        )}

        {photoCount > 1 && (
          <>
            <button
              className="gallery__arrow gallery__arrow--left"
              onClick={() => goToPhoto(activePhoto - 1)}
              aria-label="Предыдущее фото"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              className="gallery__arrow gallery__arrow--right"
              onClick={() => goToPhoto(activePhoto + 1)}
              aria-label="Следующее фото"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            <div className="gallery__counter">{activePhoto + 1} / {photoCount}</div>
            <div className="gallery__dots">
              {listing.photos.map((_, i) => (
                <span key={i} className={`dot${i === activePhoto ? " is-active" : ""}`} onClick={() => goToPhoto(i)} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="detail-body">
        <p className="detail-price price-tag">{formatPrice(listing)}</p>
        <h2 className="detail-title">{listing.title}</h2>
        <p className="detail-meta">{listing.district} · {new Date(listing.created_at).toLocaleDateString("ru-RU")}</p>

        <div className="detail-section">
          <h3>Описание</h3>
          <p className="detail-description">{listing.description || "Продавец не оставил описания."}</p>
        </div>

        <div className="seller-card">
          <div className="seller-card__avatar">
            {listing.owner.avatar_url ? <img src={listing.owner.avatar_url} alt="" /> : listing.owner.display_name[0]}
          </div>
          <div className="seller-card__info">
            <p className="seller-card__name">{listing.owner.display_name}</p>
            <p className="seller-card__rating">★ {listing.owner.rating?.toFixed(1) ?? "5.0"}</p>
          </div>
        </div>

        {!isOwnListing && (
          <button className="report-link" onClick={handleReportClick}>
            Пожаловаться на объявление
          </button>
        )}
      </div>

      {isOwnListing && listing.status === "expired" && (
        <div className="expired-banner">
          <p>Объявление снято с публикации — прошёл месяц с момента размещения.</p>
          <button className="btn-primary" onClick={handleRepublish} disabled={busy}>
            {busy ? "Публикуем…" : "Опубликовать заново"}
          </button>
        </div>
      )}

      {!isOwnListing && (
        <div className="detail-cta">
          <div className="detail-cta__row">
            {listing.contact_phone && (
              <a className="btn-secondary detail-cta__call" href={`tel:${listing.contact_phone}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.36 2.3.56 3.5.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.5 21 3 13.5 3 4.5a1 1 0 0 1 1-1H6.5a1 1 0 0 1 1 1c0 1.2.2 2.4.56 3.5a1 1 0 0 1-.25 1L6.6 10.8Z" />
                </svg>
                Позвонить
              </a>
            )}
            <button className="btn-primary" onClick={handleContact} disabled={contacting}>
              {contacting ? "Открываем чат…" : "Написать продавцу"}
            </button>
          </div>
        </div>
      )}

      {isOwnListing && listing.status !== "expired" && (
        <div className="detail-cta">
          <div className="detail-cta__row">
            <button className="btn-secondary" onClick={() => navigate(`/listing/${listing.id}/edit`)}>
              Редактировать
            </button>
            <button
              className={`btn-secondary detail-cta__delete${confirmingDelete ? " is-confirming" : ""}`}
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? "Удаляем…" : confirmingDelete ? "Точно удалить?" : "Удалить"}
            </button>
          </div>
          {confirmingDelete && (
            <button className="detail-cta__cancel" onClick={() => setConfirmingDelete(false)}>
              Отмена
            </button>
          )}
        </div>
      )}

      <style>{`
        .gallery {
          position: relative;
          aspect-ratio: 1 / 1;
          background: var(--color-accent-soft);
          overflow: hidden;
          touch-action: pan-y;
        }
        .gallery__track {
          display: flex;
          width: 100%;
          height: 100%;
          transition: transform 0.25s ease;
          touch-action: pan-y;
        }
        .gallery__track img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          flex: 0 0 100%;
          user-select: none;
          -webkit-user-drag: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          background: var(--color-accent-soft);
        }
        .gallery__track img.is-loaded {
          opacity: 1;
        }
        .gallery__placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
        }
        .gallery__arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 34px; height: 34px;
          border-radius: 50%;
          background: rgba(23, 21, 34, 0.45);
          backdrop-filter: blur(4px);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .gallery__arrow svg { width: 20px; height: 20px; }
        .gallery__arrow--left { left: var(--space-3); }
        .gallery__arrow--right { right: var(--space-3); }
        .gallery__counter {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          background: rgba(23, 21, 34, 0.45);
          backdrop-filter: blur(4px);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
        }
        .gallery__dots {
          position: absolute;
          bottom: var(--space-3);
          left: 0; right: 0;
          display: flex;
          justify-content: center;
          gap: 6px;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.6); transition: all 0.15s ease; }
        .dot.is-active { background: #fff; width: 18px; border-radius: 3px; }
        .detail-body { padding: var(--space-4); padding-bottom: 100px; }
        .detail-price { font-size: 26px; margin-bottom: var(--space-1); }
        .detail-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
        .detail-meta { font-size: 13px; color: var(--color-text-secondary); }
        .detail-section { margin-top: var(--space-5); }
        .detail-section h3 { font-size: 14px; margin-bottom: var(--space-2); }
        .detail-description { font-size: 14.5px; line-height: 1.55; color: var(--color-text-primary); }
        .seller-card {
          margin-top: var(--space-5);
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-card);
        }
        .seller-card__avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-weight: 700;
          overflow: hidden;
        }
        .seller-card__avatar img { width: 100%; height: 100%; object-fit: cover; }
        .seller-card__name { font-weight: 600; font-size: 14.5px; }
        .seller-card__rating { font-size: 12.5px; color: var(--color-accent); margin-top: 2px; }
        .report-link {
          display: block;
          margin: var(--space-3) auto 0;
          font-size: 12.5px;
          color: var(--color-text-secondary);
          text-decoration: underline;
        }
        .detail-cta {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-width: 480px;
          margin: 0 auto;
          padding: var(--space-3) var(--space-4) calc(var(--space-3) + var(--safe-bottom));
          background: linear-gradient(to top, var(--color-bg) 70%, transparent);
        }
        .detail-cta__row {
          display: flex;
          gap: var(--space-2);
        }
        .detail-cta__row .btn-primary,
        .detail-cta__row .btn-secondary {
          width: auto;
          flex: 1;
        }
        .detail-cta__call {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 0 0 auto;
          min-width: 130px;
        }
        .detail-cta__call svg { width: 18px; height: 18px; }
        .detail-cta__delete.is-confirming {
          background: var(--color-danger-soft);
          border-color: var(--color-danger);
          color: var(--color-danger);
        }
        .detail-cta__cancel {
          display: block;
          margin: var(--space-2) auto 0;
          font-size: 12.5px;
          color: var(--color-text-secondary);
          text-align: center;
        }
        .expired-banner {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-width: 480px;
          margin: 0 auto;
          padding: var(--space-4);
          padding-bottom: calc(var(--space-4) + var(--safe-bottom));
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
        }
        .expired-banner p {
          font-size: 13.5px;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-3);
          text-align: center;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
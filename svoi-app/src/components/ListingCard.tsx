import { useNavigate } from "react-router-dom";
import type { ListingWithOwner } from "@/types";

function formatPrice(listing: ListingWithOwner) {
  if (listing.is_free) return "Даром";
  if (listing.is_barter) return "Обмен";
  if (listing.price == null) return "Цена не указана";
  return `${listing.price.toLocaleString("ru-RU")} ₽`;
}

interface ListingCardProps {
  listing: ListingWithOwner;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function ListingCard({ listing, isFavorite, onToggleFavorite }: ListingCardProps) {
  const navigate = useNavigate();
  const cover = listing.photos[0];

  return (
    <article className="listing-card" onClick={() => navigate(`/listing/${listing.id}`)}>
      <div className="listing-card__photo">
        {cover ? (
          <img src={cover} alt={listing.title} loading="lazy" />
        ) : (
          <div className="listing-card__placeholder">Свои</div>
        )}
        <button
          className={`listing-card__fav${isFavorite ? " is-active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label="В избранное"
        >
          <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 20s-7-4.5-9.3-8.8C1.2 8 2.5 4.8 5.6 4.1c2-.5 3.9.4 5 2.1a5.6 5.6 0 0 1 5-2.1c3.1.7 4.4 3.9 2.9 7.1C19 15.5 12 20 12 20Z" />
          </svg>
        </button>
        <span className="listing-card__tag price-tag">{formatPrice(listing)}</span>
      </div>
      <div className="listing-card__body">
        <p className="listing-card__title">{listing.title}</p>
        <p className="listing-card__meta">{listing.district} · {listing.subcategory?.title ?? listing.category?.title}</p>
      </div>

      <style>{`
        .listing-card {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        .listing-card__photo {
          position: relative;
          aspect-ratio: 4 / 3;
          background: var(--color-accent-soft);
        }
        .listing-card__photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .listing-card__placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          color: #b98a2f;
          opacity: 0.5;
          font-size: 15px;
        }
        .listing-card__fav {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
          width: 30px;
          height: 30px;
          border-radius: var(--radius-pill);
          background: rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
        }
        .listing-card__fav.is-active {
          color: var(--color-danger);
        }
        .listing-card__fav svg { width: 16px; height: 16px; }
        .listing-card__tag {
          position: absolute;
          left: var(--space-2);
          bottom: var(--space-2);
          background: var(--color-surface);
          padding: 4px 10px;
          border-radius: var(--radius-sm) var(--radius-sm) var(--radius-sm) 2px;
          font-size: 13px;
          box-shadow: var(--shadow-card);
        }
        .listing-card__body {
          padding: var(--space-2) var(--space-3) var(--space-3);
        }
        .listing-card__title {
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.7em;
        }
        .listing-card__meta {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }
      `}</style>
    </article>
  );
}

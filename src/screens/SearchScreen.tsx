import { useState } from "react";
import { useListingsStore } from "@/store/useListingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ListingCard } from "@/components/ListingCard";

const DISTRICTS = ["Все районы", "Артёмовский", "Ленинский", "Каменнобродский", "Жовтневый"];

export function SearchScreen() {
  const [input, setInput] = useState("");
  const { listings, favoriteIds, setFilters, toggleFavorite } = useListingsStore();
  const { userId } = useAuthStore();

  return (
    <div className="screen">
      <div className="search-header">
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            className="search-input"
            placeholder="Что ищете?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFilters({ query: input })}
          />
        </div>
        <div className="district-row">
          {DISTRICTS.map((d) => (
            <button
              key={d}
              className="district-chip"
              onClick={() => setFilters({ district: d === "Все районы" ? "all" : d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="empty-state">
          <h3>Ничего не нашлось</h3>
          <p>Попробуйте другой запрос или район</p>
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

      <style>{`
        .search-header {
          padding: calc(var(--space-3) + var(--safe-top)) var(--space-4) var(--space-3);
        }
        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
        }
        .search-input-wrap svg { width: 18px; height: 18px; color: var(--color-text-secondary); flex-shrink: 0; }
        .search-input {
          border: none;
          outline: none;
          flex: 1;
          font-size: 15px;
          background: transparent;
        }
        .district-row {
          display: flex;
          gap: var(--space-2);
          overflow-x: auto;
          margin-top: var(--space-3);
        }
        .district-chip {
          flex-shrink: 0;
          padding: 7px 14px;
          border-radius: var(--radius-pill);
          background: var(--color-accent-soft);
          color: #7a5410;
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
        }
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

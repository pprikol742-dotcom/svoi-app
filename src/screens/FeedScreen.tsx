import { useEffect } from "react";
import { useListingsStore } from "@/store/useListingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ListingCard } from "@/components/ListingCard";
import { CategoryChip } from "@/components/CategoryChip";
import { FAB } from "@/components/FAB";

export function FeedScreen() {
  const { categories, listings, filters, favoriteIds, isLoading, loadCategories, loadFeed, setFilters, toggleFavorite } =
    useListingsStore();
  const { userId } = useAuthStore();

  useEffect(() => {
    loadCategories().then(loadFeed);
  }, []);

  return (
    <div className="screen">
      <div className="feed-header">
        <div className="feed-header__brand">
          <span className="feed-header__logo">Свои</span>
          <span className="feed-header__place">Луганск</span>
        </div>
      </div>

      <div className="chip-row">
        <CategoryChip label="Все" isActive={filters.categorySlug === "all"} onClick={() => setFilters({ categorySlug: "all" })} />
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.title}
            isActive={filters.categorySlug === cat.slug}
            onClick={() => setFilters({ categorySlug: cat.slug })}
          />
        ))}
      </div>

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
        .chip-row {
          display: flex;
          gap: var(--space-2);
          overflow-x: auto;
          padding: var(--space-1) var(--space-4) var(--space-3);
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

import { useEffect, useState } from "react";
import { useListingsStore } from "@/store/useListingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ListingCard } from "@/components/ListingCard";
import { CategoryPickerModal } from "@/components/CategoryPickerModal";
import { FAB } from "@/components/FAB";

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
  const { userId } = useAuthStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadCategories(), loadSubcategories()]).then(loadFeed);
  }, []);

  const activeCategory = categories.find((c) => c.slug === filters.categorySlug);
  const activeSubcategory = subcategories.find((s) => s.id === filters.subcategoryId);
  const filterLabel = activeSubcategory
    ? `${activeCategory?.title ?? ""} · ${activeSubcategory.title}`
    : activeCategory?.title ?? "Все категории";

  return (
    <div className="screen">
      <div className="feed-header">
        <div className="feed-header__brand">
          <span className="feed-header__logo">Свои</span>
          <span className="feed-header__place">Луганск</span>
        </div>
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

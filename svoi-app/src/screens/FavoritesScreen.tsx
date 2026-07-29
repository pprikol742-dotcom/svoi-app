import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useListingsStore } from "@/store/useListingsStore";
import { ListingCard } from "@/components/ListingCard";
import { TopBar } from "@/components/TopBar";

export function FavoritesScreen() {
  const { userId } = useAuthStore();
  const { favoriteListings, favoriteIds, isLoading, loadFavoriteListings, toggleFavorite } = useListingsStore();

  useEffect(() => {
    if (userId) loadFavoriteListings(userId);
  }, [userId]);

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title="Избранное" onBack />

      {isLoading && favoriteListings.length === 0 ? (
        <div className="empty-state">
          <h3>Загружаем…</h3>
        </div>
      ) : favoriteListings.length === 0 ? (
        <div className="empty-state">
          <h3>Пока пусто</h3>
          <p>Нажмите на сердечко на карточке объявления, чтобы сохранить его сюда</p>
        </div>
      ) : (
        <div className="listing-grid">
          {favoriteListings.map((listing) => (
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
        .listing-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
          padding: var(--space-4);
        }
      `}</style>
    </div>
  );
}

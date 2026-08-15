import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useListingsStore } from "@/store/useListingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ListingCard } from "@/components/ListingCard";

const DISTRICTS = ["Все районы", "Артёмовский", "Ленинский", "Каменнобродский", "Жовтневый"];

interface SavedSearchRow {
  id: string;
  query: string | null;
  district: string | null;
  created_at: string;
  last_checked_at: string;
  newCount: number;
}

export function SearchScreen() {
  const [input, setInput] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const { listings, favoriteIds, setFilters, toggleFavorite } = useListingsStore();
  const { userId } = useAuthStore();
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>([]);
  const [saving, setSaving] = useState(false);

  const loadSavedSearches = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!data) return;

    const withCounts = await Promise.all(
      data.map(async (s) => {
        let q = supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .gt("created_at", s.last_checked_at);
        if (s.query) q = q.ilike("title", `%${s.query}%`);
        if (s.district) q = q.eq("district", s.district);
        const { count } = await q;
        return { ...s, newCount: count ?? 0 };
      })
    );
    setSavedSearches(withCounts);
  };

  useEffect(() => {
    loadSavedSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSaveSearch = async () => {
    if (!userId || saving) return;
    if (!input.trim() && selectedDistrict === "all") return;
    setSaving(true);
    await supabase.from("saved_searches").insert({
      user_id: userId,
      query: input.trim() || null,
      district: selectedDistrict === "all" ? null : selectedDistrict,
    });
    setSaving(false);
    loadSavedSearches();
  };

  const applySavedSearch = async (s: SavedSearchRow) => {
    const query = s.query ?? "";
    const district = s.district ?? "all";
    setInput(query);
    setSelectedDistrict(district);
    setFilters({ query, district });
    await supabase.from("saved_searches").update({ last_checked_at: new Date().toISOString() }).eq("id", s.id);
    setSavedSearches((prev) => prev.map((row) => (row.id === s.id ? { ...row, newCount: 0 } : row)));
  };

  const deleteSavedSearch = async (id: string) => {
    await supabase.from("saved_searches").delete().eq("id", id);
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const selectDistrict = (d: string) => {
    const val = d === "Все районы" ? "all" : d;
    setSelectedDistrict(val);
    setFilters({ district: val });
  };

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
          {DISTRICTS.map((d) => {
            const val = d === "Все районы" ? "all" : d;
            return (
              <button
                key={d}
                className={`district-chip${selectedDistrict === val ? " is-active" : ""}`}
                onClick={() => selectDistrict(d)}
              >
                {d}
              </button>
            );
          })}
        </div>

        {userId && (input.trim() || selectedDistrict !== "all") && (
          <button className="save-search-btn" onClick={handleSaveSearch} disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить этот поиск"}
          </button>
        )}

        {savedSearches.length > 0 && (
          <div className="saved-searches-row">
            {savedSearches.map((s) => (
              <div key={s.id} className="saved-search-chip" onClick={() => applySavedSearch(s)}>
                <span className="saved-search-chip__label">
                  {s.query || s.district || "Все объявления"}
                </span>
                {s.newCount > 0 && <span className="saved-search-chip__badge">{s.newCount}</span>}
                <span
                  className="saved-search-chip__remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedSearch(s.id);
                  }}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
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
          color: var(--color-text-primary);
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
        .district-chip.is-active {
          background: var(--color-primary);
          color: var(--color-text-onprimary);
        }
        .save-search-btn {
          margin-top: var(--space-3);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-primary);
          padding: 8px 14px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
        }
        .saved-searches-row {
          display: flex;
          gap: var(--space-2);
          overflow-x: auto;
          margin-top: var(--space-3);
        }
        .saved-search-chip {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px 7px 14px;
          border-radius: var(--radius-pill);
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
        }
        .saved-search-chip__label { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
        .saved-search-chip__badge {
          background: var(--color-danger);
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
        .saved-search-chip__remove {
          color: var(--color-text-secondary);
          font-size: 16px;
          line-height: 1;
          padding: 2px 4px;
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
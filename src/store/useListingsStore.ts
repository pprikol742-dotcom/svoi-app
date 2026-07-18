import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Category, CategorySlug, ListingWithOwner, Subcategory } from "@/types";

const LISTING_SELECT =
  "*, owner:profiles!listings_owner_id_fkey(id,display_name,avatar_url,rating), category:categories!listings_category_id_fkey(slug,title,icon), subcategory:subcategories!listings_subcategory_id_fkey(slug,title)";

interface Filters {
  categorySlug: CategorySlug | "all";
  subcategoryId: string | "all";
  query: string;
  district: string | "all";
}

interface ListingsState {
  categories: Category[];
  subcategories: Subcategory[];
  listings: ListingWithOwner[];
  favoriteIds: Set<string>;
  favoriteListings: ListingWithOwner[];
  filters: Filters;
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  loadSubcategories: () => Promise<void>;
  loadFeed: () => Promise<void>;
  setFilters: (partial: Partial<Filters>) => void;
  toggleFavorite: (listingId: string, userId: string) => Promise<void>;
  loadFavorites: (userId: string) => Promise<void>;
  loadFavoriteListings: (userId: string) => Promise<void>;
  updateListing: (listingId: string, fields: Record<string, unknown>) => Promise<{ error: string | null }>;
  deleteListing: (listingId: string) => Promise<{ error: string | null }>;
  republishListing: (listingId: string) => Promise<{ error: string | null }>;
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  categories: [],
  subcategories: [],
  listings: [],
  favoriteIds: new Set(),
  favoriteListings: [],
  filters: { categorySlug: "all", subcategoryId: "all", query: "", district: "all" },
  isLoading: false,

  loadCategories: async () => {
    const { data } = await supabase.from("categories").select("*").order("title");
    if (data) set({ categories: data as Category[] });
  },

  loadSubcategories: async () => {
    // Таблица маленькая (десятки строк) — проще и быстрее загрузить всю сразу
    // и фильтровать по category_id на клиенте, чем гонять отдельный запрос на каждую категорию.
    const { data } = await supabase.from("subcategories").select("*").order("title");
    if (data) set({ subcategories: data as Subcategory[] });
  },

  loadFeed: async () => {
    set({ isLoading: true });
    const { categorySlug, subcategoryId, query, district } = get().filters;

    let request = supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (categorySlug !== "all") {
      const cat = get().categories.find((c) => c.slug === categorySlug);
      if (cat) request = request.eq("category_id", cat.id);
    }
    if (subcategoryId !== "all") request = request.eq("subcategory_id", subcategoryId);
    if (district !== "all") request = request.eq("district", district);
    if (query.trim()) request = request.ilike("title", `%${query.trim()}%`);

    const { data, error } = await request;
    if (!error && data) set({ listings: data as unknown as ListingWithOwner[] });
    set({ isLoading: false });
  },

  setFilters: (partial) => {
    set((state) => {
      const nextFilters = { ...state.filters, ...partial };
      // Подкатегория привязана к конкретной категории — при смене категории
      // сбрасываем выбранную подкатегорию, чтобы не остался "чужой" фильтр.
      if (partial.categorySlug !== undefined && partial.subcategoryId === undefined) {
        nextFilters.subcategoryId = "all";
      }
      return { filters: nextFilters };
    });
    get().loadFeed();
  },

  loadFavorites: async (userId: string) => {
    const { data } = await supabase.from("favorites").select("listing_id").eq("user_id", userId);
    if (data) set({ favoriteIds: new Set(data.map((f) => f.listing_id)) });
  },

  toggleFavorite: async (listingId: string, userId: string) => {
    const { favoriteIds } = get();
    const isFav = favoriteIds.has(listingId);
    const next = new Set(favoriteIds);

    if (isFav) {
      next.delete(listingId);
      set((state) => ({
        favoriteIds: next,
        favoriteListings: state.favoriteListings.filter((l) => l.id !== listingId),
      }));
      await supabase.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId);
    } else {
      next.add(listingId);
      set({ favoriteIds: next });
      await supabase.from("favorites").insert({ user_id: userId, listing_id: listingId });
    }
  },

  loadFavoriteListings: async (userId: string) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from("favorites")
      .select(`listing:listings!favorites_listing_id_fkey(${LISTING_SELECT})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      const listings = data
        .map((row) => row.listing)
        .filter(Boolean) as unknown as ListingWithOwner[];
      set({ favoriteListings: listings });
    }
    set({ isLoading: false });
  },

  updateListing: async (listingId, fields) => {
    const { error } = await supabase.from("listings").update(fields).eq("id", listingId);
    return { error: error?.message ?? null };
  },

  deleteListing: async (listingId) => {
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (!error) {
      set((state) => ({
        listings: state.listings.filter((l) => l.id !== listingId),
        favoriteListings: state.favoriteListings.filter((l) => l.id !== listingId),
      }));
    }
    return { error: error?.message ?? null };
  },

  // Переподача: сбрасывает дату создания на "сейчас" (снова месяц до истечения)
  // и отправляет на повторную проверку — тот же путь, что и у нового объявления.
  republishListing: async (listingId) => {
    const { error } = await supabase
      .from("listings")
      .update({ status: "pending_review", created_at: new Date().toISOString() })
      .eq("id", listingId);
    return { error: error?.message ?? null };
  },
}));

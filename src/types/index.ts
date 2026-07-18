export type CategorySlug =
  | "transport"
  | "realty"
  | "electronics"
  | "home"
  | "services"
  | "animals"
  | "jobs";

export interface Category {
  id: string;
  slug: CategorySlug;
  title: string;
  icon: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  slug: string;
  title: string;
}

export interface Profile {
  id: string;
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  district: string | null;
  created_at: string;
  rating: number | null;
  listings_count: number | null;
}

export type ListingStatus = "active" | "reserved" | "sold" | "pending_review" | "rejected" | "expired";

export interface Listing {
  id: string;
  owner_id: string;
  category_id: string;
  subcategory_id: string | null;
  title: string;
  description: string;
  price: number | null;
  is_free: boolean;
  is_barter: boolean;
  district: string;
  photos: string[];
  status: ListingStatus;
  views_count: number;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingWithOwner extends Listing {
  owner: Pick<Profile, "id" | "display_name" | "avatar_url" | "rating">;
  category: Pick<Category, "slug" | "title" | "icon">;
  subcategory: Pick<Subcategory, "slug" | "title"> | null;
}

export interface Chat {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  last_message_at: string | null;
}

export interface ChatWithParticipants extends Chat {
  buyer: Pick<Profile, "id" | "display_name" | "avatar_url">;
  seller: Pick<Profile, "id" | "display_name" | "avatar_url">;
  listing: Pick<Listing, "title" | "photos">;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Favorite {
  user_id: string;
  listing_id: string;
  created_at: string;
}

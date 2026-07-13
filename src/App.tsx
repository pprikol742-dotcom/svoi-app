import { useEffect } from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useListingsStore } from "@/store/useListingsStore";
import { BottomNav } from "@/components/BottomNav";
import { FeedScreen } from "@/screens/FeedScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ProfileEditScreen } from "@/screens/ProfileEditScreen";
import { FavoritesScreen } from "@/screens/FavoritesScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { ListingDetailScreen } from "@/screens/ListingDetailScreen";
import { CreateListingScreen } from "@/screens/CreateListingScreen";

function Shell() {
  const location = useLocation();
  const hideNav = ["/listing", "/create", "/auth", "/chats/", "/profile/edit", "/favorites"].some(
    (p) => location.pathname.startsWith(p) && location.pathname !== "/chats"
  );

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<FeedScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/chats" element={<ChatListScreen />} />
        <Route path="/chats/:chatId" element={<ChatScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/profile/edit" element={<ProfileEditScreen />} />
        <Route path="/favorites" element={<FavoritesScreen />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/listing/:id" element={<ListingDetailScreen />} />
        <Route path="/create" element={<CreateListingScreen />} />
        <Route path="/listing/:id/edit" element={<CreateListingScreen />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  const { init, userId } = useAuthStore();
  const { loadFavorites } = useListingsStore();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (userId) loadFavorites(userId);
  }, [userId]);

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { ChatWithParticipants, Message } from "@/types";

const CHAT_SELECT =
  "*, buyer:profiles!chats_buyer_id_fkey(id,display_name,avatar_url), seller:profiles!chats_seller_id_fkey(id,display_name,avatar_url), listing:listings!chats_listing_id_fkey(title,photos)";

interface ChatState {
  chats: ChatWithParticipants[];
  chatMeta: Record<string, ChatWithParticipants>;
  messagesByChat: Record<string, Message[]>;
  loadChats: (userId: string) => Promise<void>;
  loadChatMeta: (chatId: string) => Promise<void>;
  openOrCreateChat: (listingId: string, buyerId: string, sellerId: string) => Promise<string>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, senderId: string, body: string) => Promise<void>;
  subscribeToChat: (chatId: string) => () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  chatMeta: {},
  messagesByChat: {},

  loadChats: async (userId: string) => {
    const { data } = await supabase
      .from("chats")
      .select(CHAT_SELECT)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (data) set({ chats: data as unknown as ChatWithParticipants[] });
  },

  loadChatMeta: async (chatId: string) => {
    const existing = get().chatMeta[chatId];
    if (existing) return;
    const { data } = await supabase.from("chats").select(CHAT_SELECT).eq("id", chatId).single();
    if (data) {
      set((state) => ({ chatMeta: { ...state.chatMeta, [chatId]: data as unknown as ChatWithParticipants } }));
    }
  },

  openOrCreateChat: async (listingId, buyerId, sellerId) => {
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .maybeSingle();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("chats")
      .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Не удалось открыть чат");
    return data.id;
  },

  loadMessages: async (chatId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    if (data) {
      set((state) => ({
        messagesByChat: { ...state.messagesByChat, [chatId]: data as Message[] },
      }));
    }
  },

  sendMessage: async (chatId, senderId, body) => {
    await supabase.from("messages").insert({ chat_id: chatId, sender_id: senderId, body });
  },

  subscribeToChat: (chatId: string) => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMessage = payload.new as Message;
          set((state) => ({
            messagesByChat: {
              ...state.messagesByChat,
              [chatId]: [...(state.messagesByChat[chatId] ?? []), newMessage],
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

import { create } from "zustand";
import { supabase, PHOTOS_BUCKET } from "@/lib/supabase";
import { resizeImage } from "@/lib/imageResize";
import { safeId } from "@/lib/id";
import type { ChatWithParticipants, Message } from "@/types";

const CHAT_SELECT =
  "*, buyer:profiles!chats_buyer_id_fkey(id,display_name,avatar_url), seller:profiles!chats_seller_id_fkey(id,display_name,avatar_url), listing:listings!chats_listing_id_fkey(title,photos)";

const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 час — совпадает с ограничением в RLS-политике

interface ChatState {
  chats: ChatWithParticipants[];
  chatMeta: Record<string, ChatWithParticipants>;
  messagesByChat: Record<string, Message[]>;
  loadChats: (userId: string) => Promise<void>;
  loadChatMeta: (chatId: string) => Promise<void>;
  openOrCreateChat: (listingId: string, buyerId: string, sellerId: string) => Promise<string>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, senderId: string, body: string) => Promise<void>;
  sendImageMessage: (chatId: string, senderId: string, file: File) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newBody: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  markChatAsRead: (chatId: string, userId: string) => Promise<void>;
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
    await get().markChatAsRead(chatId, senderId);
  },

  sendImageMessage: async (chatId, senderId, file) => {
    const compressed = await resizeImage(file);
    const path = `${senderId}/chat-${chatId}-${safeId()}-${compressed.name}`;
    const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, compressed);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    const { error: insertError } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, sender_id: senderId, body: "📷 Фото", image_url: data.publicUrl });
    if (insertError) throw new Error(insertError.message);
    await get().markChatAsRead(chatId, senderId);
  },

  editMessage: async (chatId, messageId, newBody) => {
    const trimmed = newBody.trim();
    if (!trimmed) return;
    const editedAt = new Date().toISOString();
    const { error } = await supabase
      .from("messages")
      .update({ body: trimmed, edited_at: editedAt })
      .eq("id", messageId);
    if (error) throw new Error(error.message);
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] ?? []).map((m) =>
          m.id === messageId ? { ...m, body: trimmed, edited_at: editedAt } : m
        ),
      },
    }));
  },

  deleteMessage: async (chatId, messageId) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) throw new Error(error.message);
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
  },

  markChatAsRead: async (chatId, userId) => {
    const chat = get().chats.find((c) => c.id === chatId) ?? get().chatMeta[chatId];
    if (!chat) return;
    const isBuyer = chat.buyer_id === userId;
    const column = isBuyer ? "buyer_last_read_at" : "seller_last_read_at";
    const now = new Date().toISOString();
    await supabase.from("chats").update({ [column]: now }).eq("id", chatId);
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, [column]: now } : c)),
      chatMeta: state.chatMeta[chatId]
        ? { ...state.chatMeta, [chatId]: { ...state.chatMeta[chatId], [column]: now } }
        : state.chatMeta,
    }));
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const updated = payload.new as Message;
          set((state) => ({
            messagesByChat: {
              ...state.messagesByChat,
              [chatId]: (state.messagesByChat[chatId] ?? []).map((m) => (m.id === updated.id ? updated : m)),
            },
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const deletedId = (payload.old as Message).id;
          set((state) => ({
            messagesByChat: {
              ...state.messagesByChat,
              [chatId]: (state.messagesByChat[chatId] ?? []).filter((m) => m.id !== deletedId),
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

export function isChatUnread(chat: ChatWithParticipants, userId: string): boolean {
  if (!chat.last_message_at) return false;
  const isBuyer = chat.buyer_id === userId;
  const lastRead = isBuyer ? chat.buyer_last_read_at : chat.seller_last_read_at;
  if (!lastRead) return true;
  return new Date(chat.last_message_at) > new Date(lastRead);
}

export function canEditMessage(message: Message): boolean {
  return Date.now() - new Date(message.created_at).getTime() < EDIT_WINDOW_MS;
}

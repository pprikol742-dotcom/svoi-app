import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface AuthState {
  userId: string | null;
  profile: Profile | null;
  isLoading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (fields: Partial<Pick<Profile, "display_name" | "phone" | "district">>) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  profile: null,
  isLoading: true,
  initialized: false,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id ?? null;
    set({ userId, isLoading: false, initialized: true });
    if (userId) await get().refreshProfile();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ userId: session?.user.id ?? null });
      if (session?.user.id) await get().refreshProfile();
      else set({ profile: null });
    });
  },

  // Бесплатно: Supabase отправляет письма со своего сервиса без сторонних платных провайдеров.
  // Если в настройках проекта (Authentication → Providers → Email) выключено "Confirm email",
  // session придёт сразу же, без перехода по ссылке в письме.
  signUpWithEmail: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    return { error: null, needsConfirmation: !data.session };
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ userId: null, profile: null });
  },

  refreshProfile: async () => {
    const { userId } = get();
    if (!userId) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) set({ profile: data as Profile });
  },

  updateProfile: async (fields) => {
    const { userId } = get();
    if (!userId) return { error: "Не авторизованы" };
    const { data, error } = await supabase.from("profiles").update(fields).eq("id", userId).select("*").single();
    if (error) return { error: error.message };
    if (data) set({ profile: data as Profile });
    return { error: null };
  },
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { askDeepSeek, DeepSeekMessage } from "@/lib/deepseek";

export interface SecretMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface Quota {
  tokensLimit: number;
  tokensUsed: number;
  purchasedTokens: number;
  isLifetime: boolean;
  remaining: number;
}

interface QuotaRow {
  tokens_limit: number;
  tokens_used: number;
  purchased_tokens: number;
  is_lifetime: boolean;
  remaining: number;
}

interface SecretChatState {
  messages: SecretMessage[];
  isThinking: boolean;
  quota: Quota | null;
  quotaLoading: boolean;
  loadQuota: () => Promise<void>;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: "Ты — полезный ассистент внутри секретного чата приложения. Отвечай кратко и по делу на русском языке.",
};

export const useSecretChatStore = create<SecretChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isThinking: false,
      quota: null,
      quotaLoading: false,

      loadQuota: async () => {
        set({ quotaLoading: true });
        const { data, error } = await supabase.rpc("get_my_ai_quota").single<QuotaRow>();
        if (!error && data) {
          set({
            quota: {
              tokensLimit: data.tokens_limit,
              tokensUsed: data.tokens_used,
              purchasedTokens: data.purchased_tokens,
              isLifetime: data.is_lifetime,
              remaining: data.remaining,
            },
          });
        }
        set({ quotaLoading: false });
      },

      send: async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const quota = get().quota;
        if (quota && quota.remaining <= 0) return;

        const userMsg: SecretMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, userMsg], isThinking: true }));

        try {
          const history: DeepSeekMessage[] = [
            SYSTEM_PROMPT,
            ...get().messages.map((m) => ({ role: m.role, content: m.content } as DeepSeekMessage)),
          ];
          const { content, usage } = await askDeepSeek(history);

          set((s) => ({
            messages: [...s.messages, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: content || "…",
              createdAt: Date.now(),
            }],
            isThinking: false,
          }));

          if (usage.totalTokens > 0) {
            supabase.rpc("increment_ai_quota_usage", { p_tokens: usage.totalTokens }).then();
            set((s) => s.quota ? {
              quota: {
                ...s.quota,
                tokensUsed: s.quota.tokensUsed + usage.totalTokens,
                remaining: Math.max(s.quota.remaining - usage.totalTokens, 0),
              },
            } : {});
          }
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          set((s) => ({
            messages: [...s.messages, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `⚠️ Ошибка запроса к DeepSeek:\n${detail}`,
              createdAt: Date.now(),
            }],
            isThinking: false,
          }));
          console.error("DeepSeek error", err);
        }
      },

      clear: () => set({ messages: [] }),
    }),
    { name: "secret-ai-chat", partialize: (s) => ({ messages: s.messages }) }
  )
);

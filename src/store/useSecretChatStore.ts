import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { askDeepSeek, analyzeItemPhoto, DeepSeekMessage, ItemAnalysis } from "@/lib/deepseek";

export interface SimilarListing {
  id: string;
  title: string;
  price: number | null;
  photos: string[];
}

export interface SecretMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  imageUrl?: string;
  analysis?: ItemAnalysis | null;
  similarListings?: SimilarListing[];
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
  requestLog: number[];
  loadQuota: () => Promise<void>;
  send: (text: string, isAdmin?: boolean) => Promise<void>;
  sendPhoto: (file: File, isAdmin?: boolean) => Promise<void>;
  clear: () => void;
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: "Ты — полезный ассистент внутри секретного чата приложения. Отвечай кратко и по делу на русском языке.",
};

// Скрытый лимит: не более RATE_LIMIT_COUNT сообщений (текст + фото вместе)
// за скользящее окно RATE_LIMIT_WINDOW_MS. Не применяется к админу.
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 час

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function deductQuota(set: (fn: (s: SecretChatState) => Partial<SecretChatState>) => void, totalTokens: number) {
  if (totalTokens <= 0) return;
  supabase.rpc("increment_ai_quota_usage", { p_tokens: totalTokens }).then();
  set((s) =>
    s.quota
      ? {
          quota: {
            ...s.quota,
            tokensUsed: s.quota.tokensUsed + totalTokens,
            remaining: Math.max(s.quota.remaining - totalTokens, 0),
          },
        }
      : {}
  );
}

function formatRetryMinutes(ms: number) {
  return Math.max(1, Math.ceil(ms / 60000));
}

export const useSecretChatStore = create<SecretChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isThinking: false,
      quota: null,
      quotaLoading: false,
      requestLog: [],

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

      send: async (text: string, isAdmin = false) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const quota = get().quota;
        if (quota && quota.remaining <= 0) return;

        if (!isAdmin) {
          const now = Date.now();
          const recent = get().requestLog.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
          if (recent.length >= RATE_LIMIT_COUNT) {
            const oldestInWindow = Math.min(...recent);
            const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
            const userMsg: SecretMessage = {
              id: crypto.randomUUID(),
              role: "user",
              content: trimmed,
              createdAt: now,
            };
            set((s) => ({
              messages: [...s.messages, userMsg, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Вы уже отправили ${RATE_LIMIT_COUNT} сообщений за последний час. Пожалуйста, вернитесь через ${formatRetryMinutes(waitMs)} мин 🙏`,
                createdAt: now,
              }],
            }));
            return;
          }
        }

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

          if (!isAdmin) {
            const now = Date.now();
            set((s) => ({ requestLog: [...s.requestLog.filter((t) => now - t < RATE_LIMIT_WINDOW_MS), now] }));
          }

          deductQuota(set, usage.totalTokens);
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

      sendPhoto: async (file: File, isAdmin = false) => {
        const quota = get().quota;
        if (quota && quota.remaining <= 0) return;

        if (!isAdmin) {
          const now = Date.now();
          const recent = get().requestLog.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
          if (recent.length >= RATE_LIMIT_COUNT) {
            const oldestInWindow = Math.min(...recent);
            const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
            set((s) => ({
              messages: [...s.messages, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Вы уже отправили ${RATE_LIMIT_COUNT} сообщений за последний час. Пожалуйста, вернитесь через ${formatRetryMinutes(waitMs)} мин 🙏`,
                createdAt: now,
              }],
            }));
            return;
          }
        }

        let dataUrl: string;
        try {
          dataUrl = await fileToDataUrl(file);
        } catch (err) {
          console.error("Не удалось прочитать файл фото", err);
          return;
        }

        const userMsg: SecretMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: "📷 Фото товара",
          imageUrl: dataUrl,
          createdAt: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, userMsg], isThinking: true }));

        try {
          const { analysis, rawText, usage } = await analyzeItemPhoto(dataUrl);

          let similarListings: SimilarListing[] = [];
          if (analysis?.search_keywords) {
            const firstKeyword = analysis.search_keywords.trim().split(/\s+/)[0];
            if (firstKeyword && firstKeyword.length >= 2) {
              const { data: listingsData } = await supabase
                .from("listings")
                .select("id, title, price, photos")
                .eq("status", "active")
                .ilike("title", `%${firstKeyword}%`)
                .limit(5);
              similarListings = (listingsData as SimilarListing[]) ?? [];
            }
          }

          const summary = analysis
            ? `${analysis.title_guess}\n${analysis.description}`
            : rawText || "Не удалось разобрать ответ ИИ.";

          set((s) => ({
            messages: [...s.messages, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: summary,
              analysis,
              similarListings,
              createdAt: Date.now(),
            }],
            isThinking: false,
          }));

          if (!isAdmin) {
            const now = Date.now();
            set((s) => ({ requestLog: [...s.requestLog.filter((t) => now - t < RATE_LIMIT_WINDOW_MS), now] }));
          }

          deductQuota(set, usage.totalTokens);
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          set((s) => ({
            messages: [...s.messages, {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `⚠️ Ошибка анализа фото:\n${detail}`,
              createdAt: Date.now(),
            }],
            isThinking: false,
          }));
          console.error("DeepSeek vision error", err);
        }
      },

      clear: () => set({ messages: [] }),
    }),
    { name: "secret-ai-chat", partialize: (s) => ({ messages: s.messages, requestLog: s.requestLog }) }
  )
);

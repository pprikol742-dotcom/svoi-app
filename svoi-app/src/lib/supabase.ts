import { createClient } from "@supabase/supabase-js";

// .trim() спасает от той же болезни, что была с keystore: если значение в GitHub Secret
// скопировано с хвостовым \r\n (частый случай при копировании из Блокнота на Windows),
// URL/ключ становится невалидным и Supabase падает на инициализации — молча, без React.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const supabaseConfigError: string | null = !supabaseUrl
  ? "VITE_SUPABASE_URL не задан"
  : !isValidUrl(supabaseUrl)
    ? `VITE_SUPABASE_URL повреждён или не является корректным URL: "${supabaseUrl}"`
    : !supabaseAnonKey
      ? "VITE_SUPABASE_ANON_KEY не задан"
      : null;

// Если конфиг битый — не даём createClient() уронить весь модульный граф исключением
// на этапе импорта (это и убивает React ещё до вызова render). Подставляем безобидную
// заглушку; реальный экран ошибки показывает <ConfigErrorScreen> в App.tsx.
export const supabase = supabaseConfigError
  ? (createClient("https://placeholder.invalid", "placeholder-anon-key") as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

export const PHOTOS_BUCKET = "listing-photos";
export const AVATARS_BUCKET = "avatars";

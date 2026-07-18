/**
 * crypto.randomUUID() поддерживается не во всех WebView на Android
 * (нужен относительно свежий Chromium и secure context) — на части
 * бюджетных/старых устройств он просто отсутствует, и вызов тихо
 * бросает ошибку, из-за которой вся загрузка файла срывается без
 * понятного сообщения. Эта функция работает везде без исключений.
 */
export function safeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // падаем в запасной вариант ниже
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

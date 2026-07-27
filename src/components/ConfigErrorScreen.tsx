export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        fontFamily: "-apple-system, system-ui, sans-serif",
        background: "#f7f5f1",
        color: "#1c2b33",
      }}
    >
      <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>Ошибка конфигурации</h1>
      <p style={{ fontSize: "14px", color: "#6b7680", maxWidth: "320px", marginBottom: "16px" }}>
        Приложение не может подключиться к серверу.
      </p>
      <code
        style={{
          fontSize: "12px",
          background: "#eae7e0",
          padding: "10px 14px",
          borderRadius: "8px",
          maxWidth: "100%",
          wordBreak: "break-word",
        }}
      >
        {message}
      </code>
      <p style={{ fontSize: "12px", color: "#9aa3ac", marginTop: "16px", maxWidth: "300px" }}>
        Проверьте секреты VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в настройках репозитория на GitHub — вероятно, при
        копировании в значение попал лишний пробел или перенос строки.
      </p>
    </div>
  );
}

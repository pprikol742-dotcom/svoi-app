import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
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
          <h1 style={{ fontSize: "18px", marginBottom: "8px" }}>Что-то пошло не так</h1>
          <p style={{ fontSize: "14px", color: "#6b7680", maxWidth: "320px" }}>
            Приложение столкнулось с ошибкой при запуске. Попробуйте закрыть и открыть его заново.
          </p>
          <pre
            style={{
              marginTop: "20px",
              fontSize: "11px",
              color: "#9aa3ac",
              maxWidth: "100%",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              textAlign: "left",
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

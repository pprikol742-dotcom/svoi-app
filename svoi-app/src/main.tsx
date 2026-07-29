import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConfigErrorScreen } from "@/components/ConfigErrorScreen";
import { supabaseConfigError } from "@/lib/supabase";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {supabaseConfigError ? <ConfigErrorScreen message={supabaseConfigError} /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);

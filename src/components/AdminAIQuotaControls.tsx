import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function AdminAIQuotaControls({ userId }: { userId: string }) {
  const [amount, setAmount] = useState(1000000);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = async () => {
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.rpc("admin_reset_ai_quota", { p_user_id: userId });
    setStatus(error ? "Ошибка: " + error.message : "Сброшено ✓");
    setLoading(false);
  };

  const addTokens = async () => {
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.rpc("admin_add_ai_tokens", { p_user_id: userId, p_amount: amount });
    setStatus(error ? "Ошибка: " + error.message : "Начислено " + amount + " ✓");
    setLoading(false);
  };

  return (
    <div className="admin-ai-quota">
      <button onClick={reset} disabled={loading}>Сбросить лимит</button>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        step={100000}
      />
      <button onClick={addTokens} disabled={loading}>Начислить</button>
      {status && <span className="admin-ai-quota__status">{status}</span>}

      <style>{`
        .admin-ai-quota {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .admin-ai-quota button {
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          font-size: 13px;
        }
        .admin-ai-quota input {
          width: 110px;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          font-size: 13px;
        }
        .admin-ai-quota__status {
          font-size: 12.5px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
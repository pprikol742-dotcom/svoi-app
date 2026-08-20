import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

function isProActive(proUntil: string | null | undefined) {
  return !!proUntil && new Date(proUntil) > new Date();
}

export function AIAgentButton() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  if (!isProActive(profile?.pro_until)) return null;

  return (
    <button
      className="ai-agent-fab"
      onClick={() => navigate("/secret-chat")}
      aria-label="Твой ИИ агент"
    >
      <span className="ai-agent-fab__glow" />
      <span className="ai-agent-fab__icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.5c.35 0 .66.23.76.57l.9 3.06 3.06.9a.8.8 0 0 1 0 1.54l-3.06.9-.9 3.06a.8.8 0 0 1-1.54 0l-.9-3.06-3.06-.9a.8.8 0 0 1 0-1.54l3.06-.9.9-3.06c.1-.34.41-.57.76-.57Z" fill="currentColor"/>
          <path d="M18.5 13c.22 0 .42.15.48.36l.4 1.4 1.4.4a.5.5 0 0 1 0 .96l-1.4.4-.4 1.4a.5.5 0 0 1-.96 0l-.4-1.4-1.4-.4a.5.5 0 0 1 0-.96l1.4-.4.4-1.4c.06-.21.26-.36.48-.36Z" fill="currentColor"/>
        </svg>
      </span>
      <span className="ai-agent-fab__label">Твой ИИ агент</span>

      <style>{`
        .ai-agent-fab {
          position: fixed;
          left: 50%;
          bottom: calc(var(--tab-bar-height, 64px) + var(--safe-bottom) + 14px);
          transform: translateX(-50%);
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 999px;
          background: linear-gradient(135deg, #2f7bff 0%, #1e5fe0 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.1px;
          box-shadow: 0 6px 20px rgba(30, 95, 224, 0.45), 0 2px 6px rgba(30, 95, 224, 0.3);
          animation: fab-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .ai-agent-fab:active { transform: translateX(-50%) scale(0.96); }
        .ai-agent-fab__glow {
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(47,123,255,0.55) 0%, rgba(47,123,255,0) 70%);
          z-index: -1;
          animation: fab-pulse 2.6s ease-in-out infinite;
        }
        .ai-agent-fab__icon { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
        .ai-agent-fab__icon svg { width: 100%; height: 100%; }
        .ai-agent-fab__label { white-space: nowrap; }
        @keyframes fab-in {
          from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.9); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes fab-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-agent-fab, .ai-agent-fab__glow { animation: none; }
        }
      `}</style>
    </button>
  );
}
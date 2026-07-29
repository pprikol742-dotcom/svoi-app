import { useNavigate } from "react-router-dom";

export function FAB() {
  const navigate = useNavigate();
  return (
    <button className="fab" onClick={() => navigate("/create")} aria-label="Разместить объявление">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <style>{`
        .fab {
          position: absolute;
          right: var(--space-4);
          bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + var(--space-3));
          width: 56px;
          height: 56px;
          border-radius: var(--radius-pill);
          background: var(--color-accent);
          color: var(--color-text-onaccent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-raised);
          z-index: 15;
        }
        .fab:active {
          transform: scale(0.94);
        }
        .fab svg { width: 24px; height: 24px; }
      `}</style>
    </button>
  );
}

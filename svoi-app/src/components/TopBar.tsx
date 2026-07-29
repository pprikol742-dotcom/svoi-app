import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
  onBack?: boolean;
  right?: ReactNode;
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="top-bar">
      {onBack ? (
        <button className="top-bar__back" onClick={() => navigate(-1)} aria-label="Назад">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <div className="top-bar__spacer" />
      )}
      <h1 className="top-bar__title">{title}</h1>
      <div className="top-bar__right">{right}</div>
      <style>{`
        .top-bar {
          height: calc(var(--top-bar-height) + var(--safe-top));
          padding-top: var(--safe-top);
          display: flex;
          align-items: center;
          padding-left: var(--space-3);
          padding-right: var(--space-3);
          background: var(--color-bg);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .top-bar__back, .top-bar__spacer {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .top-bar__back svg { width: 22px; height: 22px; color: var(--color-text-primary); }
        .top-bar__title {
          flex: 1;
          font-size: 17px;
          font-weight: 700;
          text-align: center;
        }
        .top-bar__right {
          min-width: 36px;
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </header>
  );
}

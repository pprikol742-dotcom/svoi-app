import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

function isProActive(proUntil: string | null | undefined) {
  return !!proUntil && new Date(proUntil) > new Date();
}

const TABS = [
  { to: "/", label: "Лента", icon: HomeIcon, end: true },
  { to: "/search", label: "Поиск", icon: SearchIcon, end: false },
  { to: "/chats", label: "Чаты", icon: ChatIcon, end: false },
  { to: "/profile", label: "Профиль", icon: UserIcon, end: false },
];

export function BottomNav() {
  const { profile } = useAuthStore();
  const isPro = isProActive(profile?.pro_until);

  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <span className="bottom-nav__icon-wrap">
                <Icon active={isActive} />
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}

      {isPro && (
        <NavLink
          to="/secret-chat"
          className={({ isActive }) => `bottom-nav__item bottom-nav__item--ai${isActive ? " is-active" : ""}`}
        >
          <span className="bottom-nav__ai-badge">
            <AIIcon />
          </span>
          <span>ИИ</span>
        </NavLink>
      )}

      <style>{`
        .bottom-nav {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: calc(var(--bottom-nav-height) + var(--safe-bottom));
          padding-bottom: var(--safe-bottom);
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: stretch;
          z-index: 20;
        }
        .bottom-nav__item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: var(--color-text-secondary);
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          transition: color 0.15s ease;
        }
        .bottom-nav__item.is-active {
          color: var(--color-primary);
        }
        .bottom-nav__icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: var(--radius-pill);
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .bottom-nav__item.is-active .bottom-nav__icon-wrap {
          background: var(--color-accent-soft);
          transform: translateY(-1px);
        }
        .bottom-nav__item svg {
          width: 22px;
          height: 22px;
        }
        .bottom-nav__item:active .bottom-nav__icon-wrap {
          transform: scale(0.88);
        }

        /* --- ИИ-вкладка: неоново-фиолетовый переливающийся значок --- */
        .bottom-nav__item--ai {
          color: var(--color-text-secondary);
        }
        .bottom-nav__item--ai.is-active {
          color: #c084fc;
        }
        .bottom-nav__ai-badge {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #d946ef 45%, #22d3ee 90%);
          background-size: 220% 220%;
          animation: ai-shimmer 3.2s ease-in-out infinite, ai-pulse 2.4s ease-in-out infinite;
          box-shadow: 0 0 0 rgba(168, 85, 247, 0.5);
          margin-bottom: 1px;
        }
        .bottom-nav__ai-badge svg {
          width: 18px;
          height: 18px;
          color: #fff;
          position: relative;
          z-index: 1;
        }
        .bottom-nav__item--ai:active .bottom-nav__ai-badge {
          transform: scale(0.88);
        }
        @keyframes ai-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes ai-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.45); }
          50% { box-shadow: 0 0 0 6px rgba(168, 85, 247, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bottom-nav__ai-badge { animation: none; }
        }
      `}</style>
    </nav>
  );
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11.2 12 4l8.5 7.2" fill="none" />
      <path d="M5.5 10v8.5a1 1 0 0 0 1 1h3.5v-5.5h4v5.5H17.5a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function SearchIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ChatIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h16A1.5 1.5 0 0 1 21.5 7v9A1.5 1.5 0 0 1 20 17.5H9l-4.5 3.8a.5.5 0 0 1-.82-.38V17.5h-.18A1.5 1.5 0 0 1 3 16V7a1.5 1.5 0 0 1 1-1.5Z" />
    </svg>
  );
}

function UserIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.4-4.2 5-6.3 7.5-6.3s6.1 2.1 7.5 6.3" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5c.35 0 .66.23.76.57l.9 3.06 3.06.9a.8.8 0 0 1 0 1.54l-3.06.9-.9 3.06a.8.8 0 0 1-1.54 0l-.9-3.06-3.06-.9a.8.8 0 0 1 0-1.54l3.06-.9.9-3.06c.1-.34.41-.57.76-.57Z" fill="currentColor"/>
      <path d="M18.5 13c.22 0 .42.15.48.36l.4 1.4 1.4.4a.5.5 0 0 1 0 .96l-1.4.4-.4 1.4a.5.5 0 0 1-.96 0l-.4-1.4-1.4-.4a.5.5 0 0 1 0-.96l1.4-.4.4-1.4c.06-.21.26-.36.48-.36Z" fill="currentColor"/>
    </svg>
  );
}

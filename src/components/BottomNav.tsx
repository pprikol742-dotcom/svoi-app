import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Лента", icon: HomeIcon },
  { to: "/search", label: "Поиск", icon: SearchIcon },
  { to: "/chats", label: "Чаты", icon: ChatIcon },
  { to: "/profile", label: "Профиль", icon: UserIcon },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => `bottom-nav__item${isActive ? " is-active" : ""}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
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
        }
        .bottom-nav__item.is-active {
          color: var(--color-primary);
        }
        .bottom-nav__item svg {
          width: 22px;
          height: 22px;
        }
      `}</style>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" />
    </svg>
  );
}

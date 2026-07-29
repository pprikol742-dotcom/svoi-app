interface CategoryChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryChip({ label, isActive, onClick }: CategoryChipProps) {
  return (
    <button className={`chip${isActive ? " is-active" : ""}`} onClick={onClick}>
      {label}
      <style>{`
        .chip {
          flex-shrink: 0;
          padding: 9px 16px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 13.5px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
        .chip.is-active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-text-onprimary);
        }
      `}</style>
    </button>
  );
}

import { useEffect, useRef, useState } from "react";

export interface AutocompleteOption {
  id: string;
  label: string;
}

interface AutocompleteFieldProps {
  label: string;
  options: AutocompleteOption[];
  value: string;
  placeholder?: string;
  emptyHint?: string;
  onChange: (text: string) => void;
  onSelect: (option: AutocompleteOption) => void;
}

/**
 * Текстовое поле с выпадающим списком подсказок, отфильтрованных по вводу —
 * тот же паттерн, что и в строке поиска, но переиспользуемый на любых полях формы.
 */
export function AutocompleteField({
  label,
  options,
  value,
  placeholder,
  emptyHint,
  onChange,
  onSelect,
}: AutocompleteFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim().length === 0
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(value.trim().toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="autocomplete" ref={wrapRef}>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="autocomplete-list">
          {filtered.length === 0 ? (
            <div className="autocomplete-empty">{emptyHint ?? "Совпадений не найдено"}</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                className="autocomplete-item"
                onMouseDown={(e) => {
                  // onMouseDown, а не onClick — срабатывает раньше blur/click-outside
                  e.preventDefault();
                  onSelect(o);
                  setIsOpen(false);
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}

      <style>{`
        .autocomplete { position: relative; }
        .autocomplete-list {
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-raised);
          max-height: 220px;
          overflow-y: auto;
          z-index: 20;
          padding: var(--space-1);
        }
        .autocomplete-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          color: var(--color-text-primary);
        }
        .autocomplete-item:active {
          background: var(--color-accent-soft);
        }
        .autocomplete-empty {
          padding: 10px 12px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}

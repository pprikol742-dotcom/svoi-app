import { useState } from "react";
import type { Category, Subcategory } from "@/types";

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  subcategories: Subcategory[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onSelectCategory: (category: Category | null) => void;
  onSelectSubcategory: (subcategory: Subcategory | null) => void;
  /** Показывать варианты "Все категории" / "Все в категории X" — нужно для фильтра ленты,
   *  не нужно при выборе категории для нового объявления. */
  allowAll?: boolean;
  title?: string;
}

export function CategoryPickerModal({
  isOpen,
  onClose,
  categories,
  subcategories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
  allowAll = false,
  title = "Категория",
}: CategoryPickerModalProps) {
  const [drill, setDrill] = useState<Category | null>(null);

  if (!isOpen) return null;

  const close = () => {
    setDrill(null);
    onClose();
  };

  const pick = (category: Category | null, subcategory: Subcategory | null) => {
    onSelectCategory(category);
    onSelectSubcategory(subcategory);
    close();
  };

  const subsOf = (categoryId: string) => subcategories.filter((s) => s.category_id === categoryId);

  return (
    <div className="cp-overlay" onClick={close}>
      <div className="cp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="cp-sheet__handle" />

        <div className="cp-sheet__header">
          {drill ? (
            <button className="cp-sheet__back" onClick={() => setDrill(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              {drill.title}
            </button>
          ) : (
            <h3>{title}</h3>
          )}
          <button className="cp-sheet__close" onClick={close} aria-label="Закрыть">×</button>
        </div>

        <div className="cp-sheet__list">
          {!drill &&
            (allowAll && (
              <button
                className={`cp-row${!selectedCategoryId ? " is-active" : ""}`}
                onClick={() => pick(null, null)}
              >
                <span className="cp-row__icon">🗂️</span>
                <span className="cp-row__label">Все категории</span>
              </button>
            ))}

          {!drill &&
            categories.map((cat) => {
              const subs = subsOf(cat.id);
              const isActive = selectedCategoryId === cat.id && !selectedSubcategoryId;
              return (
                <button
                  key={cat.id}
                  className={`cp-row${isActive ? " is-active" : ""}`}
                  onClick={() => (subs.length > 0 ? setDrill(cat) : pick(cat, null))}
                >
                  <span className="cp-row__icon">{cat.icon}</span>
                  <span className="cp-row__label">{cat.title}</span>
                  {subs.length > 0 && (
                    <svg className="cp-row__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </button>
              );
            })}

          {drill && allowAll && (
            <button
              className={`cp-row${selectedCategoryId === drill.id && !selectedSubcategoryId ? " is-active" : ""}`}
              onClick={() => pick(drill, null)}
            >
              <span className="cp-row__label">Все в категории «{drill.title}»</span>
            </button>
          )}

          {drill &&
            subsOf(drill.id).map((sub) => (
              <button
                key={sub.id}
                className={`cp-row${selectedSubcategoryId === sub.id ? " is-active" : ""}`}
                onClick={() => pick(drill, sub)}
              >
                <span className="cp-row__label">{sub.title}</span>
              </button>
            ))}
        </div>
      </div>

      <style>{`
        .cp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 24, 26, 0.45);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .cp-sheet {
          width: 100%;
          max-width: 480px;
          max-height: 74vh;
          background: var(--color-surface);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          box-shadow: var(--shadow-raised);
          display: flex;
          flex-direction: column;
          animation: cp-slide-up 0.22s ease;
        }
        @keyframes cp-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .cp-sheet__handle {
          width: 36px; height: 4px;
          border-radius: var(--radius-pill);
          background: var(--color-border);
          margin: var(--space-3) auto var(--space-1);
          flex-shrink: 0;
        }
        .cp-sheet__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2) var(--space-4) var(--space-3);
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .cp-sheet__header h3 {
          font-size: 16px;
          font-weight: 700;
        }
        .cp-sheet__back {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .cp-sheet__back svg { width: 20px; height: 20px; flex-shrink: 0; }
        .cp-sheet__close {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          color: var(--color-text-secondary);
          border-radius: 50%;
        }
        .cp-sheet__list {
          overflow-y: auto;
          padding: var(--space-2) 0 var(--space-4);
        }
        .cp-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 12px var(--space-4);
          font-size: 14.5px;
          font-weight: 600;
          color: var(--color-text-primary);
          text-align: left;
        }
        .cp-row.is-active {
          color: var(--color-primary);
          background: var(--color-accent-soft);
        }
        .cp-row__icon { font-size: 18px; flex-shrink: 0; width: 22px; text-align: center; }
        .cp-row__label { flex: 1; }
        .cp-row__chevron { width: 18px; height: 18px; flex-shrink: 0; color: var(--color-text-secondary); }
      `}</style>
    </div>
  );
}

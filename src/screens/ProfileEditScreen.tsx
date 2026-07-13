import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { TopBar } from "@/components/TopBar";

const DISTRICTS = ["Артёмовский", "Ленинский", "Каменнобродский", "Жовтневый"];

export function ProfileEditScreen() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [district, setDistrict] = useState(profile?.district ?? DISTRICTS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (displayName.trim().length < 2) return setError("Введите имя");
    setSaving(true);
    setError(null);
    const { error } = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || null,
      district,
    });
    setSaving(false);
    if (error) return setError(error);
    navigate("/profile");
  };

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title="Редактировать профиль" onBack />
      <div className="edit-body">
        <label className="field-label">Имя</label>
        <input className="field-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Как вас видят другие" />

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Телефон</label>
        <input className="field-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000 00 00" />
        <p className="field-hint">Будет подставляться в новые объявления автоматически</p>

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Район</label>
        <div className="cat-grid">
          {DISTRICTS.map((d) => (
            <button key={d} className={`cat-btn${district === d ? " is-active" : ""}`} onClick={() => setDistrict(d)}>
              {d}
            </button>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" style={{ marginTop: "var(--space-5)" }} onClick={handleSave} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      <style>{`
        .edit-body { padding: var(--space-4); }
        .field-hint { font-size: 12px; color: var(--color-text-secondary); margin-top: 6px; }
        .cat-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
        .cat-btn {
          padding: 9px 14px;
          border-radius: var(--radius-pill);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .cat-btn.is-active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-text-onprimary);
        }
        .form-error { color: var(--color-danger); font-size: 13px; margin-top: var(--space-3); }
      `}</style>
    </div>
  );
}

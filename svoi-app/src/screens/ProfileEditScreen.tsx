import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, AVATARS_BUCKET } from "@/lib/supabase";
import { resizeImage } from "@/lib/imageResize";
import { safeId } from "@/lib/id";
import { useAuthStore } from "@/store/useAuthStore";
import { TopBar } from "@/components/TopBar";

const DISTRICTS = ["Артёмовский", "Ленинский", "Каменнобродский", "Жовтневый"];

export function ProfileEditScreen() {
  const navigate = useNavigate();
  const { userId, profile, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [district, setDistrict] = useState(profile?.district ?? DISTRICTS[0]);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    setError(null);
    try {
      const compressed = await resizeImage(file, 600, 0.85);
      const path = `${userId}/avatar-${safeId()}-${compressed.name}`;
      const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(path, compressed);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) return setError("Введите имя");
    setSaving(true);
    setError(null);
    const { error } = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || null,
      district,
      avatar_url: avatarUrl || null,
    });
    setSaving(false);
    if (error) return setError(error);
    navigate("/profile");
  };

  const shownAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title="Редактировать профиль" onBack />
      <div className="edit-body">
        <div className="avatar-picker">
          <label className="avatar-picker__circle">
            <input type="file" accept="image/*" onChange={handleAvatarPick} hidden />
            {shownAvatar ? (
              <img src={shownAvatar} alt="" />
            ) : (
              <span className="avatar-picker__initial">{displayName[0] ?? "С"}</span>
            )}
            <span className="avatar-picker__badge">
              {uploadingAvatar ? (
                "…"
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              )}
            </span>
          </label>
          <p className="avatar-picker__hint">Нажмите на фото, чтобы изменить</p>
        </div>

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

        <button className="btn-primary" style={{ marginTop: "var(--space-5)" }} onClick={handleSave} disabled={saving || uploadingAvatar}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      <style>{`
        .edit-body { padding: var(--space-4); }
        .avatar-picker { display: flex; flex-direction: column; align-items: center; margin-bottom: var(--space-5); }
        .avatar-picker__circle {
          position: relative;
          width: 88px; height: 88px;
          border-radius: 50%;
          background: var(--color-primary);
          color: var(--color-text-onprimary);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .avatar-picker__circle img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-picker__initial { font-family: var(--font-display); font-weight: 800; font-size: 32px; }
        .avatar-picker__badge {
          position: absolute;
          right: -2px; bottom: -2px;
          width: 30px; height: 30px;
          border-radius: 50%;
          background: var(--color-accent);
          color: var(--color-text-onaccent);
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--color-bg);
        }
        .avatar-picker__badge svg { width: 15px; height: 15px; }
        .avatar-picker__hint { font-size: 12px; color: var(--color-text-secondary); margin-top: var(--space-2); }
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

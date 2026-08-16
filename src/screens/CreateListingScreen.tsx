import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase, PHOTOS_BUCKET } from "@/lib/supabase";
import { resizeImage } from "@/lib/imageResize";
import { safeId } from "@/lib/id";
import { useAuthStore } from "@/store/useAuthStore";
import { useListingsStore } from "@/store/useListingsStore";
import { TopBar } from "@/components/TopBar";
import { CategoryPickerModal } from "@/components/CategoryPickerModal";

const DISTRICTS = ["Артёмовский", "Ленинский", "Каменнобродский", "Жовтневый"];
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

interface SimilarListing {
  id: string;
  title: string;
  price: number;
}

export function CreateListingScreen() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const { userId, profile } = useAuthStore();
  const { categories, subcategories, loadCategories, loadSubcategories, updateListing } = useListingsStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [phone, setPhone] = useState("");
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([]);

  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, []);

  useEffect(() => {
    if (categories.length && !categoryId && !isEditMode) setCategoryId(categories[0].id);
  }, [categories]);

  useEffect(() => {
    if (profile?.phone && !phone && !isEditMode) setPhone(profile.phone);
  }, [profile]);

  // В режиме редактирования подгружаем текущее объявление и заполняем форму
  useEffect(() => {
    if (!editId) return;
    supabase
      .from("listings")
      .select("*")
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTitle(data.title);
        setDescription(data.description ?? "");
        setPrice(data.price ? String(data.price) : "");
        setIsFree(data.is_free);
        setCategoryId(data.category_id);
        setSubcategoryId(data.subcategory_id ?? "");
        setDistrict(data.district);
        setPhone(data.contact_phone ?? "");
        setExistingPhotos(data.photos ?? []);
        setLoadingExisting(false);
      });
  }, [editId]);

  // Похожие объявления — по категории и первому слову названия, с debounce.
  useEffect(() => {
    if (!categoryId || title.trim().length < 3) {
      setSimilarListings([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const firstWord = title.trim().split(/\s+/)[0];
      let query = supabase
        .from("listings")
        .select("id, title, price")
        .eq("category_id", categoryId)
        .eq("status", "active")
        .not("price", "is", null)
        .neq("id", editId ?? EMPTY_UUID)
        .limit(20);
      if (firstWord.length >= 3) {
        query = query.ilike("title", `%${firstWord}%`);
      }
      const { data } = await query;
      setSimilarListings((data as SimilarListing[]) ?? []);
    }, 500);
    return () => clearTimeout(timeout);
  }, [categoryId, title, editId]);

  const similarPrices = similarListings.map((l) => l.price);
  const avgPrice = similarPrices.length
    ? Math.round(similarPrices.reduce((a, b) => a + b, 0) / similarPrices.length)
    : null;
  const minPrice = similarPrices.length ? Math.min(...similarPrices) : null;
  const maxPrice = similarPrices.length ? Math.max(...similarPrices) : null;

  const digitsOnly = phone.replace(/\D/g, "");
  const totalPhotoCount = existingPhotos.length + files.length;
  const visibleSubcategories = subcategories.filter((s) => s.category_id === categoryId);
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId) ?? null;
  const categoryFieldLabel = selectedSubcategory
    ? `${selectedCategory?.title ?? ""} · ${selectedSubcategory.title}`
    : selectedCategory?.title ?? "Выберите категорию";

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 6 - totalPhotoCount);
    setFiles((prev) => [...prev, ...picked]);
  };

  const handleTakePhoto = async () => {
    if (totalPhotoCount >= 6) return;
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
      if (!photo.webPath) return;
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      setFiles((prev) => [...prev, file]);
    } catch {
      // Пользователь закрыл камеру без съёмки — ничего не делаем.
    }
  };

  const removeExistingPhoto = (url: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p !== url));
  };

  const handleSubmit = async () => {
    if (!userId) return navigate("/auth");
    if (title.trim().length < 3) return setError("Название слишком короткое");
    if (!categoryId) return setError("Выберите категорию");
    if (visibleSubcategories.length > 0 && !subcategoryId) return setError("Выберите подкатегорию");
    if (digitsOnly.length < 10) return setError("Введите номер телефона для связи с покупателями");

    setSubmitting(true);
    setError(null);
    try {
      const newPhotoUrls: string[] = [];
      for (const file of files) {
        const compressed = await resizeImage(file);
        const path = `${userId}/${safeId()}-${compressed.name}`;
        const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, compressed);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
        newPhotoUrls.push(data.publicUrl);
      }
      const allPhotos = [...existingPhotos, ...newPhotoUrls];

      if (isEditMode && editId) {
        const { error: updateError } = await updateListing(editId, {
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          title: title.trim(),
          description: description.trim(),
          price: isFree ? null : price ? Number(price) : null,
          is_free: isFree,
          district,
          photos: allPhotos,
          contact_phone: phone.trim(),
        });
        if (updateError) throw new Error(updateError);
        navigate(`/listing/${editId}`);
      } else {
        const { error: insertError } = await supabase.from("listings").insert({
          owner_id: userId,
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          title: title.trim(),
          description: description.trim(),
          price: isFree ? null : price ? Number(price) : null,
          is_free: isFree,
          district,
          photos: allPhotos,
          status: "pending_review",
          contact_phone: phone.trim(),
        });
        if (insertError) throw insertError;
        navigate("/profile");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить объявление");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="screen screen--no-tab-padding">
        <TopBar title="Редактирование" onBack />
        <div className="empty-state">
          <h3>Загружаем…</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--no-tab-padding">
      <TopBar title={isEditMode ? "Редактировать объявление" : "Новое объявление"} onBack />

      <div className="form">
        <div className="photo-row">
          {existingPhotos.map((url) => (
            <div className="photo-thumb" key={url}>
              <img src={url} alt="" />
              <button className="photo-remove" onClick={() => removeExistingPhoto(url)} aria-label="Удалить фото">×</button>
            </div>
          ))}
          {files.map((f, i) => (
            <div className="photo-thumb" key={i}>
              <img src={URL.createObjectURL(f)} alt="" />
            </div>
          ))}
          {totalPhotoCount < 6 && (
            <>
              <button type="button" className="photo-add" onClick={handleTakePhoto}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Камера</span>
              </button>
              <label className="photo-add">
                <input type="file" accept="image/*" multiple onChange={handleFiles} hidden />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Из галереи</span>
              </label>
            </>
          )}
        </div>

        <label className="field-label">Название</label>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, детская коляска" />

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Категория</label>
        <button type="button" className="field-select" onClick={() => setPickerOpen(true)}>
          <span className={selectedCategory ? "" : "field-select__placeholder"}>{categoryFieldLabel}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <CategoryPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          categories={categories}
          subcategories={subcategories}
          selectedCategoryId={categoryId || null}
          selectedSubcategoryId={subcategoryId || null}
          onSelectCategory={(c) => setCategoryId(c?.id ?? "")}
          onSelectSubcategory={(s) => setSubcategoryId(s?.id ?? "")}
        />

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Описание</label>
        <textarea
          className="field-input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Состояние, детали, причина продажи…"
        />

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Цена, ₽</label>
        <input
          className="field-input"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
          disabled={isFree}
          placeholder="0"
        />
        <label className="checkbox-row">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Отдам даром
        </label>

        {avgPrice != null && (
          <div className="similar-listings">
            <h4>Похожие объявления в этой категории</h4>
            <p className="similar-listings__range">
              от {minPrice!.toLocaleString("ru-RU")} до {maxPrice!.toLocaleString("ru-RU")} ₽
              <span className="similar-listings__avg"> · в среднем {avgPrice.toLocaleString("ru-RU")} ₽</span>
            </p>
            <div className="similar-listings__list">
              {similarListings.slice(0, 5).map((l) => (
                <div key={l.id} className="similar-listings__item">
                  <span className="similar-listings__item-title">{l.title}</span>
                  <span className="similar-listings__item-price">{l.price.toLocaleString("ru-RU")} ₽</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Район</label>
        <div className="cat-grid">
          {DISTRICTS.map((d) => (
            <button key={d} className={`cat-btn${district === d ? " is-active" : ""}`} onClick={() => setDistrict(d)}>
              {d}
            </button>
          ))}
        </div>

        <label className="field-label" style={{ marginTop: "var(--space-4)" }}>Телефон для связи</label>
        <input
          className="field-input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 900 000 00 00"
        />
        <p className="field-hint">Покупатели смогут позвонить прямо со страницы объявления</p>

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" style={{ marginTop: "var(--space-5)" }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Сохраняем…" : isEditMode ? "Сохранить изменения" : "Опубликовать"}
        </button>
        {!isEditMode && (
          <p className="form-hint">Объявление появится в ленте после короткой проверки (обычно около минуты)</p>
        )}
      </div>

      <style>{`
        .form { padding: var(--space-4); padding-bottom: var(--space-6); }
        .photo-row { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4); }
        .photo-thumb, .photo-add {
          width: 76px; height: 76px;
          border-radius: var(--radius-md);
          overflow: hidden;
          position: relative;
        }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .photo-remove {
          position: absolute;
          top: 2px; right: 2px;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: rgba(0,0,0,0.55);
          color: #fff;
          font-size: 14px;
          line-height: 1;
          display: flex; align-items: center; justify-content: center;
        }
        .photo-add {
          border: 1.5px dashed var(--color-border);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px;
          color: var(--color-text-secondary);
          font-size: 10.5px;
          font-family: var(--font-display);
          font-weight: 600;
          text-align: center;
        }
        .photo-add svg { width: 20px; height: 20px; }
        .field-select {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          padding: 12px 14px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--color-border);
          background: var(--color-surface);
          font-size: 14.5px;
          font-weight: 600;
          color: var(--color-text-primary);
          text-align: left;
        }
        .field-select svg { width: 18px; height: 18px; flex-shrink: 0; color: var(--color-text-secondary); }
        .field-select__placeholder { color: var(--color-text-secondary); font-weight: 500; }
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
        .checkbox-row {
          display: flex; align-items: center; gap: var(--space-2);
          margin-top: var(--space-2);
          font-size: 14px;
          color: var(--color-text-secondary);
        }
        .similar-listings {
          margin-top: var(--space-3);
          padding: var(--space-3);
          background: var(--color-accent-soft);
          border-radius: var(--radius-md);
        }
        .similar-listings h4 { font-size: 12.5px; font-weight: 700; margin-bottom: 4px; }
        .similar-listings__range { font-size: 13.5px; font-weight: 700; color: var(--color-primary); }
        .similar-listings__avg { font-weight: 500; color: var(--color-text-secondary); }
        .similar-listings__list { margin-top: var(--space-2); display: flex; flex-direction: column; gap: 4px; }
        .similar-listings__item { display: flex; justify-content: space-between; gap: var(--space-2); font-size: 12px; }
        .similar-listings__item-title { color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .similar-listings__item-price { flex-shrink: 0; font-weight: 600; }
        .form-error {
          color: var(--color-danger);
          font-size: 13px;
          margin-top: var(--space-3);
        }
        .form-hint {
          font-size: 12px;
          color: var(--color-text-secondary);
          text-align: center;
          margin-top: var(--space-2);
        }
        .field-hint {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
/**
 * Сжимает изображение перед загрузкой на сервер: уменьшает разрешение
 * и пережимает в JPEG с разумным качеством. Фото с камеры телефона обычно
 * весят 3-8 МБ при разрешении, для показа в приложении никогда не нужном —
 * после сжатия обычно получается 150-400 КБ без заметной потери качества
 * на экране телефона, что кардинально ускоряет и публикацию, и просмотр.
 */
export function resizeImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    // Не трогаем то, что и так уже маленькое (например, скриншоты) — не тратим время на канвас зря.
    if (file.size < 300 * 1024) {
      resolve(file);
      return;
    }

    let settled = false;
    const finish = (result: File) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // Предохранитель: на некоторых WebView (особенно на Android) canvas/декодирование
    // изображения может зависнуть без ошибки — не даём загрузке "повиснуть" навсегда,
    // через 8 секунд просто публикуем исходный файл как есть.
    const safetyTimer = setTimeout(() => finish(file), 8000);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        clearTimeout(safetyTimer);
        finish(file); // на всякий случай — если канвас недоступен, отдаём оригинал, а не роняем публикацию
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          clearTimeout(safetyTimer);
          if (!blob) {
            finish(file);
            return;
          }
          const resized = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
          });
          finish(resized);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      clearTimeout(safetyTimer);
      finish(file); // не смогли прочитать — публикуем оригинал, лучше так, чем сломать форму
    };

    img.src = objectUrl;
  });
}

-- Выполнить в SQL Editor вашего уже существующего проекта Supabase.
-- Полный schema.sql заново запускать не нужно (он упадёт на "уже существует") —
-- этот файл добавляет только то, что появилось нового.

alter table listings add column if not exists contact_phone text;

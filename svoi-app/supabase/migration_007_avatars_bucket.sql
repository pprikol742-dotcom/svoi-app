-- Миграция 007: гарантированно создаём хранилище avatars и права на него
-- (на случай, если оно было только в общем schema.sql, но не выполнялось отдельно)
-- Безопасно выполнять повторно — ничего не сломает, если всё уже есть.
-- Выполнить в Supabase: SQL Editor → New query → вставить целиком → Run

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Аватары публично доступны" on storage.objects;
create policy "Аватары публично доступны"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Пользователь загружает свой аватар" on storage.objects;
create policy "Пользователь загружает свой аватар"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Пользователь обновляет свой аватар" on storage.objects;
create policy "Пользователь обновляет свой аватар"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Проверка: должна появиться строка avatars
select id, name, public from storage.buckets where id = 'avatars';

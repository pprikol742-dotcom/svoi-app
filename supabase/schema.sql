-- =========================================================
-- Свои — схема базы данных (Supabase / Postgres)
-- Выполнить в SQL Editor проекта Supabase одним файлом.
-- =========================================================

create extension if not exists moddatetime schema extensions;
create extension if not exists pg_cron;

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Пользователь',
  phone text,
  avatar_url text,
  district text,
  rating numeric(2,1) default 5.0,
  listings_count int default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Профили видны всем" on profiles
  for select using (true);

create policy "Пользователь редактирует только свой профиль" on profiles
  for update using (auth.uid() = id);

-- Автосоздание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Пользователь'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  icon text not null
);

alter table categories enable row level security;
create policy "Категории видны всем" on categories for select using (true);

insert into categories (slug, title, icon) values
  ('transport', 'Транспорт', 'car'),
  ('realty', 'Недвижимость', 'home'),
  ('electronics', 'Электроника', 'smartphone'),
  ('home', 'Дом и сад', 'sofa'),
  ('services', 'Услуги', 'wrench')
on conflict (slug) do nothing;

-- ---------- LISTINGS ----------
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id),
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '',
  price numeric(12,2),
  is_free boolean not null default false,
  is_barter boolean not null default false,
  district text not null,
  photos text[] not null default '{}',
  status text not null default 'pending_review'
    check (status in ('active','reserved','sold','pending_review','rejected','expired')),
  views_count int not null default 0,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listings_status_created on listings (status, created_at desc);
create index if not exists idx_listings_category on listings (category_id);
create index if not exists idx_listings_owner on listings (owner_id);

alter table listings enable row level security;

create policy "Активные объявления видны всем" on listings
  for select using (status = 'active' or owner_id = auth.uid());

create policy "Пользователь создаёт объявления от своего имени" on listings
  for insert with check (owner_id = auth.uid());

create policy "Владелец редактирует своё объявление" on listings
  for update using (owner_id = auth.uid());

create policy "Владелец удаляет своё объявление" on listings
  for delete using (owner_id = auth.uid());

create trigger set_listings_updated_at
  before update on listings
  for each row execute procedure moddatetime(updated_at);

-- ---------- FAVORITES ----------
create table if not exists favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table favorites enable row level security;

create policy "Пользователь видит только свои избранные" on favorites
  for select using (user_id = auth.uid());

create policy "Пользователь управляет своим избранным" on favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- CHATS ----------
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (listing_id, buyer_id)
);

alter table chats enable row level security;

create policy "Участники видят свой чат" on chats
  for select using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "Покупатель создаёт чат" on chats
  for insert with check (buyer_id = auth.uid());

-- ---------- MESSAGES ----------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_messages_chat_created on messages (chat_id, created_at);

alter table messages enable row level security;

-- Без этого сообщения обновляются только при перезаходе в диалог —
-- Supabase не рассылает realtime-события по таблицам, не добавленным в публикацию.
alter publication supabase_realtime add table messages;

create policy "Участники чата видят сообщения" on messages
  for select using (
    exists (
      select 1 from chats
      where chats.id = messages.chat_id
        and (chats.buyer_id = auth.uid() or chats.seller_id = auth.uid())
    )
  );

create policy "Участники чата пишут сообщения" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from chats
      where chats.id = messages.chat_id
        and (chats.buyer_id = auth.uid() or chats.seller_id = auth.uid())
    )
  );

-- Обновляем last_message_at при новом сообщении
create or replace function public.touch_chat_last_message()
returns trigger as $$
begin
  update chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_message
  after insert on messages
  for each row execute procedure public.touch_chat_last_message();

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Фото объявлений публично доступны"
  on storage.objects for select using (bucket_id = 'listing-photos');

create policy "Авторизованные пользователи загружают фото"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');

create policy "Аватары публично доступны"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Пользователь загружает свой аватар"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Пользователь обновляет свой аватар"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- ---------- АВТОПУБЛИКАЦИЯ ----------
-- Каждую минуту переключает объявления старше 1 минуты со статуса
-- "на проверке" на "активно" — без ручного вмешательства.
-- Чтобы изменить задержку — поменяйте "1 minute" на нужный интервал.
select cron.schedule(
  'auto-publish-listings',
  '* * * * *',
  $$
    update listings
    set status = 'active'
    where status = 'pending_review'
      and created_at <= now() - interval '1 minute'
  $$
);

-- Снимает объявления с публикации через месяц — владелец увидит статус
-- "Истекло" в профиле и сможет переподать заново одной кнопкой.
select cron.schedule(
  'expire-old-listings',
  '0 * * * *',
  $$
    update listings
    set status = 'expired'
    where status = 'active'
      and created_at <= now() - interval '1 month'
  $$
);

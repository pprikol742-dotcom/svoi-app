-- Миграция 005: подкатегории (как на Авито)
-- Выполнить в Supabase: SQL Editor → New query → вставить целиком → Run

-- ---------- Таблица подкатегорий ----------
create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  slug text not null,
  title text not null,
  unique (category_id, slug)
);

create index if not exists idx_subcategories_category on subcategories(category_id);

alter table subcategories enable row level security;

drop policy if exists "subcategories_select_all" on subcategories;
create policy "subcategories_select_all" on subcategories for select using (true);

-- ---------- Привязка объявления к подкатегории (необязательное поле) ----------
alter table listings add column if not exists subcategory_id uuid references subcategories(id);
create index if not exists idx_listings_subcategory on listings(subcategory_id);

-- ---------- Наполнение подкатегорий ----------
-- Подставляем category_id по slug родительской категории — сработает,
-- только если в categories уже есть строки с этими slug (они уже есть в вашем проекте).

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('cars', 'Легковые автомобили'),
  ('moto', 'Мотоциклы и мототехника'),
  ('trucks', 'Грузовики и спецтехника'),
  ('parts', 'Запчасти и аксессуары'),
  ('water', 'Водный транспорт')
) as v(slug, title)
where categories.slug = 'transport'
on conflict (category_id, slug) do nothing;

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('apartments', 'Квартиры'),
  ('houses', 'Дома, дачи, коттеджи'),
  ('rooms', 'Комнаты'),
  ('garages', 'Гаражи и машиноместа'),
  ('commercial', 'Коммерческая недвижимость'),
  ('land', 'Земельные участки')
) as v(slug, title)
where categories.slug = 'realty'
on conflict (category_id, slug) do nothing;

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('phones', 'Телефоны'),
  ('computers', 'Компьютеры и ноутбуки'),
  ('appliances', 'Бытовая техника'),
  ('audio_video', 'Аудио и видео'),
  ('games', 'Игры и приставки')
) as v(slug, title)
where categories.slug = 'electronics'
on conflict (category_id, slug) do nothing;

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('furniture', 'Мебель'),
  ('household', 'Товары для дома'),
  ('repair_materials', 'Ремонт и стройматериалы'),
  ('garden', 'Сад и огород'),
  ('tools', 'Инструменты')
) as v(slug, title)
where categories.slug = 'home'
on conflict (category_id, slug) do nothing;

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('repair_services', 'Ремонт и строительство'),
  ('beauty', 'Красота и здоровье'),
  ('education', 'Обучение и курсы'),
  ('transport_services', 'Грузоперевозки'),
  ('other_services', 'Прочие услуги')
) as v(slug, title)
where categories.slug = 'services'
on conflict (category_id, slug) do nothing;

-- Проверка результата:
select c.title as категория, s.title as подкатегория
from subcategories s join categories c on c.id = s.category_id
order by c.title, s.title;

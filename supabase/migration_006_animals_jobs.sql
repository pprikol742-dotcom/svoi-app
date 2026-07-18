-- Миграция 006: категории "Животные" и "Работа" + их подкатегории
-- Выполнить в Supabase: SQL Editor → New query → вставить целиком → Run

insert into categories (slug, title, icon) values
  ('animals', 'Животные', '🐾'),
  ('jobs', 'Работа', '💼')
on conflict (slug) do nothing;

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('dogs', 'Собаки'),
  ('cats', 'Кошки'),
  ('birds', 'Птицы'),
  ('other_animals', 'Другие животные'),
  ('pet_goods', 'Товары для животных')
) as v(slug, title)
where categories.slug = 'animals'
on conflict (category_id, slug) do nothing;

insert into subcategories (category_id, slug, title)
select id, v.slug, v.title from categories, (values
  ('vacancies', 'Вакансии'),
  ('resumes', 'Резюме'),
  ('part_time', 'Подработка'),
  ('remote', 'Удалённая работа')
) as v(slug, title)
where categories.slug = 'jobs'
on conflict (category_id, slug) do nothing;

-- Проверка результата:
select c.title as категория, s.title as подкатегория
from subcategories s join categories c on c.id = s.category_id
where c.slug in ('animals', 'jobs')
order by c.title, s.title;

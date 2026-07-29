-- Выполнить в SQL Editor вашего уже существующего проекта Supabase.

create extension if not exists pg_cron;

-- Каждую минуту переключает объявления старше 1 минуты со статуса
-- "на проверке" на "активно" — без ручного вмешательства.
-- Чтобы изменить задержку — поменяйте "1 minute" на нужный интервал
-- (например, '10 minutes' или '1 hour').
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

-- Если позже захотите вернуть ручную модерацию — отключить джобу можно так:
-- select cron.unschedule('auto-publish-listings');

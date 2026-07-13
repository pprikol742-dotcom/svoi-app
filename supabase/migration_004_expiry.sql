-- Выполнить в SQL Editor вашего уже существующего проекта Supabase.

-- Разрешаем новый статус "expired" в уже существующем ограничении
alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check
  check (status in ('active','reserved','sold','pending_review','rejected','expired'));

-- Снимает объявления с публикации через месяц
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

-- Выполнить в SQL Editor вашего уже существующего проекта Supabase.
-- Без этого сообщения в чате обновляются только при повторном открытии диалога —
-- Supabase не шлёт realtime-события по таблицам вне публикации supabase_realtime.

alter publication supabase_realtime add table messages;

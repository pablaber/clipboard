create table public.clips (
  id          bigint generated always as identity primary key,
  code        text not null unique check (code ~ '^[0-9]{8}$'),
  content     text not null check (octet_length(content) between 1 and 100000),
  user_id     uuid references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index clips_user_idx    on public.clips (user_id, created_at desc);
create index clips_expires_idx on public.clips (expires_at);

alter table public.clips enable row level security;   -- no policies: server-only
revoke all on public.clips from anon, authenticated;   -- browser roles never touch this table
grant select, insert, delete on public.clips to service_role;

create extension if not exists pg_cron;
select cron.schedule('purge-expired-clips', '*/5 * * * *',
  $$delete from public.clips where expires_at < now()$$);

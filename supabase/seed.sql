-- Local-only demo data, applied by `npm run db:reset`: an anonymous clip to open at /12345678.
insert into public.clips (code, content, expires_at)
values ('12345678', 'Hello from the local seed', now() + interval '1 day');

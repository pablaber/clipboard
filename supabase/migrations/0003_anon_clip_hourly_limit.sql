-- Anonymous clips: at most 5 per client IP per rolling hour. The Worker stores a SHA-256 of the
-- IP (never the raw address); anonymous rows are purged ~1 hour after creation, so the hash goes too.
alter table public.clips add column creator_ip_hash text;
create index clips_anon_ip_idx on public.clips (creator_ip_hash, created_at)
  where user_id is null;

-- Enforced here, not just in the Worker, so concurrent saves cannot race past the count.
-- The advisory lock serialises inserts per IP hash for the rest of the transaction.
create function public.enforce_anon_clip_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id is null and new.creator_ip_hash is not null then
    perform pg_advisory_xact_lock(hashtext('anon_clip:' || new.creator_ip_hash));
    if (select count(*) from public.clips
        where user_id is null
          and creator_ip_hash = new.creator_ip_hash
          and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'anonymous clip limit reached' using errcode = 'P0429';
    end if;
  end if;
  return new;
end;
$$;

create trigger clips_anon_limit before insert on public.clips
  for each row execute function public.enforce_anon_clip_limit();

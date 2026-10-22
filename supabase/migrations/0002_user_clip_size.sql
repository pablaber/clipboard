-- Logged-in users can save up to 1 MB; anonymous clips stay at 100 KB.
alter table public.clips drop constraint clips_content_check;
alter table public.clips add constraint clips_content_check check (
  octet_length(content) between 1 and (case when user_id is null then 100000 else 1000000 end)
);

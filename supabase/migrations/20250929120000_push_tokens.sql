-- Device push tokens. One Expo token can move between accounts on the same phone.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "own push tokens - select"
  on public.push_tokens for select
  using (auth.uid() = user_id);

-- Inserts and account switches go through register_push_token.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'token required';
  end if;

  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (trim(p_token), auth.uid(), nullif(trim(p_platform), ''), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;

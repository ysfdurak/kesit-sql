-- Kesit SQL: Supabase veritabanı kurulumu
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.
-- Birden çok kez çalıştırmak güvenlidir.

-- 1) Her kullanıcının öğrenme ilerlemesi tek satırda, JSON olarak tutulur.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint progress_size check (pg_column_size(data) < 2000000)   -- en fazla ~2 MB
);

-- 2) Satır düzeyi güvenlik: herkes yalnızca kendi satırını görür ve değiştirir.
alter table public.progress enable row level security;

drop policy if exists "kendi ilerlemesini okur"     on public.progress;
drop policy if exists "kendi ilerlemesini ekler"    on public.progress;
drop policy if exists "kendi ilerlemesini günceller" on public.progress;
drop policy if exists "kendi ilerlemesini siler"    on public.progress;

create policy "kendi ilerlemesini okur"      on public.progress for select to authenticated using (auth.uid() = user_id);
create policy "kendi ilerlemesini ekler"     on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "kendi ilerlemesini günceller" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "kendi ilerlemesini siler"     on public.progress for delete to authenticated using (auth.uid() = user_id);

-- 3) Kullanıcının kendi hesabını silebilmesi (KVKK: silme hakkı).
--    Hesap silinince ilerleme satırı da "on delete cascade" ile silinir.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş yapılmamış';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 4) (İsteğe bağlı) Yönetici için özet: kaç kullanıcı, kaçı son 7 günde aktif.
--    Supabase SQL Editor'da çalıştırılabilir; uygulamadan erişilemez.
-- select count(*) as kullanici,
--        count(*) filter (where updated_at > now() - interval '7 days') as son_7_gun_aktif,
--        round(avg((data->>'xp')::numeric)) as ort_xp
-- from public.progress;

-- Tabelas e bucket Storage para a biblioteca de rostos do gerador de carrossel.

-- Tabela de presets de rosto
create table if not exists public.face_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Tabela de imagens de cada preset
create table if not exists public.face_preset_images (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.face_presets(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  original_name text,
  created_at timestamptz not null default now()
);

create index if not exists face_preset_images_preset_idx
  on public.face_preset_images(preset_id);

-- RLS
alter table public.face_presets enable row level security;
alter table public.face_preset_images enable row level security;

-- Policies: app pessoal MVP — anon pode tudo
drop policy if exists "anon_all_face_presets" on public.face_presets;
create policy "anon_all_face_presets"
  on public.face_presets for all
  using (true) with check (true);

drop policy if exists "anon_all_face_preset_images" on public.face_preset_images;
create policy "anon_all_face_preset_images"
  on public.face_preset_images for all
  using (true) with check (true);

-- Bucket Storage público pra leitura (URL pública) com write via anon
insert into storage.buckets (id, name, public)
values ('face-images', 'face-images', true)
on conflict (id) do update set public = true;

-- Policies do Storage: INSERT + SELECT + UPDATE (upsert exige os 3) + DELETE
drop policy if exists "anon_insert_face_images" on storage.objects;
create policy "anon_insert_face_images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'face-images');

drop policy if exists "anon_select_face_images" on storage.objects;
create policy "anon_select_face_images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'face-images');

drop policy if exists "anon_update_face_images" on storage.objects;
create policy "anon_update_face_images"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'face-images') with check (bucket_id = 'face-images');

drop policy if exists "anon_delete_face_images" on storage.objects;
create policy "anon_delete_face_images"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'face-images');

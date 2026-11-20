-- Jalankan di Supabase: SQL Editor -> New query -> paste -> Run
-- Aman dijalankan ulang (tidak membuat data atau aturan ganda).

-- 1. TABEL
create table if not exists public.products (
  sku        text primary key,
  name       text not null,
  category   text not null,
  material   text not null,
  rack       text not null,
  stock      integer not null default 0 check (stock >= 0),
  price      bigint  not null default 0 check (price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.mutation_logs (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  sku           text not null references public.products(sku) on update cascade,
  name          text not null,
  type          text not null,
  qty           integer not null,
  current_stock integer not null
);

-- 2. KEAMANAN (Row Level Security): hanya user yang sudah login yang boleh akses
alter table public.products      enable row level security;
alter table public.mutation_logs enable row level security;

drop policy if exists "admin baca produk"   on public.products;
drop policy if exists "admin tambah produk" on public.products;
drop policy if exists "admin ubah produk"   on public.products;
drop policy if exists "admin baca log"      on public.mutation_logs;
drop policy if exists "admin tambah log"    on public.mutation_logs;

create policy "admin baca produk"   on public.products      for select to authenticated using (true);
create policy "admin tambah produk" on public.products      for insert to authenticated with check (true);
create policy "admin ubah produk"   on public.products      for update to authenticated using (true) with check (true);
create policy "admin baca log"      on public.mutation_logs for select to authenticated using (true);
create policy "admin tambah log"    on public.mutation_logs for insert to authenticated with check (true);

-- 3. FUNGSI MUTASI STOK (atomik: stok + log berubah bersamaan, aman dari tabrakan)
create or replace function public.mutate_stock(p_sku text, p_type text, p_qty integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_new     integer;
  v_label   text;
begin
  if p_qty is null or p_qty < 1 then raise exception 'QTY_TIDAK_VALID'; end if;

  select * into v_product from public.products where sku = p_sku for update;
  if not found then raise exception 'SKU_TIDAK_DITEMUKAN'; end if;

  if p_type = 'in' then
    v_new := v_product.stock + p_qty;  v_label := 'Barang Masuk';
  elsif p_type = 'out' then
    if v_product.stock < p_qty then raise exception 'STOK_TIDAK_CUKUP'; end if;
    v_new := v_product.stock - p_qty;  v_label := 'Barang Keluar';
  else
    raise exception 'JENIS_TIDAK_VALID';
  end if;

  update public.products set stock = v_new where sku = p_sku;
  insert into public.mutation_logs (sku, name, type, qty, current_stock)
  values (p_sku, v_product.name, v_label, p_qty, v_new);

  return v_new;
end;
$$;

revoke execute on function public.mutate_stock(text, text, integer) from public, anon;
grant  execute on function public.mutate_stock(text, text, integer) to authenticated;

-- 4. DATA AWAL (sama seperti data contoh di versi localStorage)
insert into public.products (sku, name, category, material, rack, stock, price) values
 ('WPM-PREM-001','Wallpaper Premium Damask Gold','Wallpaper','Vinyl Bertekstur 0.5m x 10m','Gudang Utama - A1',18,185000),
 ('WPM-CLSC-002','Wallpaper Classic Floral Silver','Wallpaper','Vinyl Bertekstur 0.5m x 10m','Gudang Utama - A3',3,175000),
 ('WPM-3DFM-003','3D Foam Brick Putih Modern','Foam','PE Foam 70cm x 77cm','Gudang B - B1',65,25000),
 ('WPM-VNYL-004','Lantai Vinyl Wood Grain Natural','Vinyl','Plank 3mm Premium','Gudang B - C2',2,145000)
on conflict (sku) do nothing;

-- Log awal hanya dibuat jika tabel log masih kosong
insert into public.mutation_logs (sku, name, type, qty, current_stock)
select sku, name, 'Registrasi Baru', stock, stock from public.products
where not exists (select 1 from public.mutation_logs);
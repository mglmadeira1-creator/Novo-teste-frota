-- Módulo Combustíveis: estrutura para separar viatura, motorista, TAG e abastecimento

create table if not exists public.combustivel_motoristas (
    id uuid primary key default gen_random_uuid(),
    external_driver_id text unique,
    nome text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.combustivel_tags (
    id uuid primary key default gen_random_uuid(),
    codigo text unique not null,
    motorista_id uuid references public.combustivel_motoristas(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.combustivel_abastecimentos (
    id uuid primary key default gen_random_uuid(),
    abastecimento_ts timestamptz not null,
    cartrack_vehicle_id text not null,
    registration text not null,
    vehicle_model text,
    motorista_id uuid references public.combustivel_motoristas(id) on delete set null,
    tag_id uuid references public.combustivel_tags(id) on delete set null,
    motorista_nome_snapshot text,
    tag_codigo_snapshot text,
    fuel_type text not null check (fuel_type in ('gasoleo','gasolina','adblue','gpl','eletrico','outro')),
    liters numeric(10,2) not null check (liters > 0),
    price_per_liter numeric(10,3) not null check (price_per_liter >= 0),
    total_cost numeric(12,2) not null check (total_cost >= 0),
    odometer_km integer,
    station_name text,
    station_location text,
    cost_center text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_combustivel_abastecimentos_ts on public.combustivel_abastecimentos(abastecimento_ts desc);
create index if not exists idx_combustivel_abastecimentos_registration on public.combustivel_abastecimentos(registration);
create index if not exists idx_combustivel_abastecimentos_vehicle_id on public.combustivel_abastecimentos(cartrack_vehicle_id);
create index if not exists idx_combustivel_abastecimentos_driver_id on public.combustivel_abastecimentos(motorista_id);
create index if not exists idx_combustivel_abastecimentos_tag_id on public.combustivel_abastecimentos(tag_id);
create index if not exists idx_combustivel_abastecimentos_cost_center on public.combustivel_abastecimentos(cost_center);
create index if not exists idx_combustivel_abastecimentos_station on public.combustivel_abastecimentos(station_name);

alter table public.combustivel_motoristas enable row level security;
alter table public.combustivel_tags enable row level security;
alter table public.combustivel_abastecimentos enable row level security;

create policy "Permitir leitura pública combustivel_motoristas" on public.combustivel_motoristas for select using (true);
create policy "Permitir escrita pública combustivel_motoristas" on public.combustivel_motoristas for all using (true);

create policy "Permitir leitura pública combustivel_tags" on public.combustivel_tags for select using (true);
create policy "Permitir escrita pública combustivel_tags" on public.combustivel_tags for all using (true);

create policy "Permitir leitura pública combustivel_abastecimentos" on public.combustivel_abastecimentos for select using (true);
create policy "Permitir escrita pública combustivel_abastecimentos" on public.combustivel_abastecimentos for all using (true);
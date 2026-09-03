-- Integração BP Fleet EU: armazenamento de transações reais e estado de sincronização

do $$
begin
    if to_regclass('public.combustivel_motoristas') is null then
        create table public.combustivel_motoristas (
            id uuid primary key default gen_random_uuid(),
            external_driver_id text unique,
            nome text,
            created_at timestamptz default now(),
            updated_at timestamptz default now()
        );
    end if;
end $$;

create table if not exists public.bp_sync_runs (
    id uuid primary key default gen_random_uuid(),
    status text not null check (status in ('running', 'success', 'error')),
    environment text not null check (environment in ('sandbox', 'production')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    imported_count integer not null default 0,
    updated_count integer not null default 0,
    duplicate_count integer not null default 0,
    fetched_count integer not null default 0,
    message text,
    error_details text,
    created_at timestamptz not null default now()
);

create index if not exists idx_bp_sync_runs_started_at on public.bp_sync_runs(started_at desc);
create index if not exists idx_bp_sync_runs_status on public.bp_sync_runs(status);

create table if not exists public.bp_tag_associations (
    id uuid primary key default gen_random_uuid(),
    driver_tag text unique not null,
    cartrack_vehicle_id text,
    vehicle_registration text,
    driver_id uuid references public.combustivel_motoristas(id) on delete set null,
    driver_name_override text,
    cost_center text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_bp_tag_associations_tag on public.bp_tag_associations(driver_tag);
create index if not exists idx_bp_tag_associations_registration on public.bp_tag_associations(vehicle_registration);

create table if not exists public.bp_fuel_transactions (
    id uuid primary key default gen_random_uuid(),
    transaction_id text unique not null,
    transaction_datetime timestamptz,
    transaction_date date,
    transaction_time text,
    card_id text,
    driver_tag text,
    vehicle_id text,
    vehicle_registration text,
    driver_id uuid references public.combustivel_motoristas(id) on delete set null,
    driver_name text,
    fuel_type text,
    litres numeric(12,3),
    price_per_litre numeric(12,4),
    total_amount numeric(14,4),
    currency text,
    odometer numeric(14,2),
    site_id text,
    site_name text,
    site_address text,
    country text,
    invoice_number text,
    cost_center text,
    raw_data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_bp_fuel_transactions_datetime on public.bp_fuel_transactions(transaction_datetime desc);
create index if not exists idx_bp_fuel_transactions_date on public.bp_fuel_transactions(transaction_date desc);
create index if not exists idx_bp_fuel_transactions_tag on public.bp_fuel_transactions(driver_tag);
create index if not exists idx_bp_fuel_transactions_registration on public.bp_fuel_transactions(vehicle_registration);
create index if not exists idx_bp_fuel_transactions_driver_id on public.bp_fuel_transactions(driver_id);
create index if not exists idx_bp_fuel_transactions_site on public.bp_fuel_transactions(site_id);

alter table public.bp_sync_runs enable row level security;
alter table public.bp_tag_associations enable row level security;
alter table public.bp_fuel_transactions enable row level security;

create policy "Permitir leitura pública bp_sync_runs" on public.bp_sync_runs for select using (true);
create policy "Permitir escrita pública bp_sync_runs" on public.bp_sync_runs for all using (true);

create policy "Permitir leitura pública bp_tag_associations" on public.bp_tag_associations for select using (true);
create policy "Permitir escrita pública bp_tag_associations" on public.bp_tag_associations for all using (true);

create policy "Permitir leitura pública bp_fuel_transactions" on public.bp_fuel_transactions for select using (true);
create policy "Permitir escrita pública bp_fuel_transactions" on public.bp_fuel_transactions for all using (true);

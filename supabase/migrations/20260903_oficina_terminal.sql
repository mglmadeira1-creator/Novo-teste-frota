-- FASE 1: Oficina terminal access, mechanic codes, and audit trail
-- Incremental migration: does not remove existing tables/data

create extension if not exists pgcrypto;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )
  );
$$;

do $$
begin
  if to_regclass('public.combustivel_motoristas') is null then
    raise exception 'Pré-requisito em falta: executa primeiro a migration 20260902_combustiveis.sql (tabela public.combustivel_motoristas).';
  end if;
end $$;

create table if not exists public.oficina_mecanicos_acessos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_lookup_hash text not null unique,
  codigo_hash text not null,
  codigo_salt text not null,
  codigo_hint text not null,
  estado text not null default 'ativo' check (estado in ('ativo', 'bloqueado', 'revogado')),
  criado_por_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ultimo_acesso_at timestamptz,
  bloqueado_at timestamptz,
  revogado_at timestamptz
);

create index if not exists idx_oficina_mecanicos_estado on public.oficina_mecanicos_acessos(estado);
create index if not exists idx_oficina_mecanicos_ultimo_acesso on public.oficina_mecanicos_acessos(ultimo_acesso_at desc);
create index if not exists idx_oficina_mecanicos_lookup on public.oficina_mecanicos_acessos(codigo_lookup_hash);

create table if not exists public.oficina_terminais (
  id uuid primary key default gen_random_uuid(),
  codigo_terminal text not null unique,
  nome_terminal text not null,
  oficina_nome text,
  estado text not null default 'ativo' check (estado in ('ativo', 'bloqueado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ultimo_ping_at timestamptz
);

insert into public.oficina_terminais (codigo_terminal, nome_terminal, oficina_nome, estado)
values ('OF-TERM-01', 'Terminal Oficina 01', 'Oficina Principal', 'ativo')
on conflict (codigo_terminal) do nothing;

create index if not exists idx_oficina_terminais_estado on public.oficina_terminais(estado);

create table if not exists public.oficina_sessoes (
  id uuid primary key default gen_random_uuid(),
  mecanico_acesso_id uuid not null references public.oficina_mecanicos_acessos(id) on delete cascade,
  terminal_id uuid not null references public.oficina_terminais(id) on delete restrict,
  token_hash text not null,
  token_salt text not null,
  expira_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip text,
  user_agent text
);

create index if not exists idx_oficina_sessoes_mecanico on public.oficina_sessoes(mecanico_acesso_id);
create index if not exists idx_oficina_sessoes_terminal on public.oficina_sessoes(terminal_id);
create index if not exists idx_oficina_sessoes_expira on public.oficina_sessoes(expira_at);

create table if not exists public.combustivel_motorista_cartoes (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references public.combustivel_motoristas(id) on delete cascade,
  qr_token_id uuid not null unique default gen_random_uuid(),
  estado text not null default 'ativo' check (estado in ('ativo', 'bloqueado', 'revogado')),
  descricao text,
  criado_por_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  bloqueado_at timestamptz,
  revogado_at timestamptz
);

create index if not exists idx_motorista_cartoes_motorista on public.combustivel_motorista_cartoes(motorista_id);
create index if not exists idx_motorista_cartoes_estado on public.combustivel_motorista_cartoes(estado);

create table if not exists public.oficina_operacoes_abastecimento (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid references public.combustivel_motoristas(id) on delete set null,
  motorista_nome_snapshot text not null,
  motorista_qr_codigo text,
  cartrack_vehicle_id text not null,
  registration text not null,
  mecanico_acesso_id uuid not null references public.oficina_mecanicos_acessos(id) on delete restrict,
  mecanico_nome_snapshot text not null,
  terminal_id uuid not null references public.oficina_terminais(id) on delete restrict,
  fuel_type text not null check (fuel_type in ('gasoleo', 'gasolina', 'adblue', 'gpl', 'eletrico', 'outro')),
  litros numeric(10,2) not null check (litros > 0),
  quilometragem_km integer not null check (quilometragem_km > 0),
  operacao_ts timestamptz not null default now(),
  origem text not null default 'OFICINA' check (origem = 'OFICINA'),
  created_at timestamptz not null default now()
);

create index if not exists idx_oficina_ops_ts on public.oficina_operacoes_abastecimento(operacao_ts desc);
create index if not exists idx_oficina_ops_registration on public.oficina_operacoes_abastecimento(registration);
create index if not exists idx_oficina_ops_vehicle on public.oficina_operacoes_abastecimento(cartrack_vehicle_id);
create index if not exists idx_oficina_ops_motorista on public.oficina_operacoes_abastecimento(motorista_id);
create index if not exists idx_oficina_ops_mecanico on public.oficina_operacoes_abastecimento(mecanico_acesso_id);
create index if not exists idx_oficina_ops_terminal on public.oficina_operacoes_abastecimento(terminal_id);

-- Architecture-ready consolidated source view (BP + OFICINA)
do $$
begin
  if to_regclass('public.bp_fuel_transactions') is not null then
    execute $view$
      create or replace view public.combustivel_origens_consolidado as
      select
        b.id::text as id,
        'BP'::text as origem,
        b.transaction_datetime as evento_ts,
        b.driver_id as motorista_id,
        b.driver_name as motorista_nome,
        b.vehicle_id as cartrack_vehicle_id,
        b.vehicle_registration as registration,
        null::uuid as mecanico_acesso_id,
        null::text as mecanico_nome,
        null::uuid as terminal_id,
        b.fuel_type as fuel_type,
        b.litres::numeric as litros,
        b.odometer::integer as quilometragem_km,
        b.total_amount::numeric as total_valor,
        b.currency::text as moeda
      from public.bp_fuel_transactions b
      union all
      select
        o.id::text as id,
        o.origem,
        o.operacao_ts as evento_ts,
        o.motorista_id,
        o.motorista_nome_snapshot as motorista_nome,
        o.cartrack_vehicle_id,
        o.registration,
        o.mecanico_acesso_id,
        o.mecanico_nome_snapshot as mecanico_nome,
        o.terminal_id,
        o.fuel_type,
        o.litros::numeric,
        o.quilometragem_km,
        null::numeric as total_valor,
        'EUR'::text as moeda
      from public.oficina_operacoes_abastecimento o
    $view$;
  else
    execute $view$
      create or replace view public.combustivel_origens_consolidado as
      select
        o.id::text as id,
        o.origem,
        o.operacao_ts as evento_ts,
        o.motorista_id,
        o.motorista_nome_snapshot as motorista_nome,
        o.cartrack_vehicle_id,
        o.registration,
        o.mecanico_acesso_id,
        o.mecanico_nome_snapshot as mecanico_nome,
        o.terminal_id,
        o.fuel_type,
        o.litros::numeric as litros,
        o.quilometragem_km,
        null::numeric as total_valor,
        'EUR'::text as moeda
      from public.oficina_operacoes_abastecimento o
    $view$;
  end if;
end $$;

alter table public.oficina_mecanicos_acessos enable row level security;
alter table public.oficina_terminais enable row level security;
alter table public.oficina_sessoes enable row level security;
alter table public.combustivel_motorista_cartoes enable row level security;
alter table public.oficina_operacoes_abastecimento enable row level security;

-- oficina_mecanicos_acessos: admin only
create policy "oficina_mecanicos_admin_select"
on public.oficina_mecanicos_acessos
for select
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "oficina_mecanicos_admin_insert"
on public.oficina_mecanicos_acessos
for insert
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "oficina_mecanicos_admin_update"
on public.oficina_mecanicos_acessos
for update
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador')
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "oficina_mecanicos_admin_delete"
on public.oficina_mecanicos_acessos
for delete
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

-- oficina_terminais: admin/gestor can read, only admin writes
create policy "oficina_terminais_ops_select"
on public.oficina_terminais
for select
using (
  auth.role() = 'authenticated'
  and public.current_app_role() in ('administrador', 'gestor')
);

create policy "oficina_terminais_admin_insert"
on public.oficina_terminais
for insert
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "oficina_terminais_admin_update"
on public.oficina_terminais
for update
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador')
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "oficina_terminais_admin_delete"
on public.oficina_terminais
for delete
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

-- combustivel_motorista_cartoes: admin/gestor operational read, admin write
create policy "motorista_cartoes_ops_select"
on public.combustivel_motorista_cartoes
for select
using (
  auth.role() = 'authenticated'
  and public.current_app_role() in ('administrador', 'gestor')
);

create policy "motorista_cartoes_admin_insert"
on public.combustivel_motorista_cartoes
for insert
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "motorista_cartoes_admin_update"
on public.combustivel_motorista_cartoes
for update
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador')
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

create policy "motorista_cartoes_admin_delete"
on public.combustivel_motorista_cartoes
for delete
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

-- oficina_operacoes_abastecimento: admin/gestor audit read
create policy "oficina_operacoes_ops_select"
on public.oficina_operacoes_abastecimento
for select
using (
  auth.role() = 'authenticated'
  and public.current_app_role() in ('administrador', 'gestor')
);

-- oficina_sessoes intentionally has no client policies.
-- Service role in Edge Functions bypasses RLS for secure session operations.

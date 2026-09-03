-- FASE 1 (Cartao de Abastecimento ALGARTEMPO): numero de cartao, estados, restricao de viaturas por motorista
-- Incremental migration: nao remove tabelas/dados existentes

do $$
begin
  if to_regclass('public.combustivel_motorista_cartoes') is null then
    raise exception 'Pre-requisito em falta: executa primeiro a migration 20260903_oficina_terminal.sql.';
  end if;
end $$;

-- 1) Numero de cartao (identificador humano, nao sensivel, mostrado no cartao fisico/digital)
alter table public.combustivel_motorista_cartoes
  add column if not exists numero_cartao text;

update public.combustivel_motorista_cartoes
set numero_cartao = (
  select string_agg(
    lpad((('x' || substr(md5(id::text || '-' || s.i::text), 1, 8))::bit(32)::bigint % 10000)::text, 4, '0'),
    ' ' order by s.i
  )
  from generate_series(1, 4) as s(i)
)
where numero_cartao is null;

alter table public.combustivel_motorista_cartoes
  alter column numero_cartao set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'combustivel_motorista_cartoes_numero_cartao_key'
  ) then
    alter table public.combustivel_motorista_cartoes
      add constraint combustivel_motorista_cartoes_numero_cartao_key unique (numero_cartao);
  end if;
end $$;

create index if not exists idx_motorista_cartoes_numero on public.combustivel_motorista_cartoes(numero_cartao);

-- 2) Estados do cartao: exatamente ativo / bloqueado / suspenso (substitui "revogado")
update public.combustivel_motorista_cartoes
set estado = 'suspenso'
where estado = 'revogado';

alter table public.combustivel_motorista_cartoes
  drop constraint if exists combustivel_motorista_cartoes_estado_check;

alter table public.combustivel_motorista_cartoes
  add constraint combustivel_motorista_cartoes_estado_check
  check (estado in ('ativo', 'bloqueado', 'suspenso'));

alter table public.combustivel_motorista_cartoes
  drop column if exists revogado_at;

-- 3) Restricao de viaturas por motorista (por omissao, todas as viaturas ativas)
alter table public.combustivel_motoristas
  add column if not exists acesso_viaturas text not null default 'todas' check (acesso_viaturas in ('todas', 'restrito'));

create table if not exists public.combustivel_motorista_viaturas_permitidas (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references public.combustivel_motoristas(id) on delete cascade,
  cartrack_vehicle_id text not null,
  created_at timestamptz not null default now(),
  unique (motorista_id, cartrack_vehicle_id)
);

create index if not exists idx_motorista_viaturas_permitidas_motorista on public.combustivel_motorista_viaturas_permitidas(motorista_id);

alter table public.combustivel_motorista_viaturas_permitidas enable row level security;

create policy "motorista_viaturas_permitidas_ops_select"
on public.combustivel_motorista_viaturas_permitidas
for select
using (
  auth.role() = 'authenticated'
  and public.current_app_role() in ('administrador', 'gestor')
);

create policy "motorista_viaturas_permitidas_admin_write"
on public.combustivel_motorista_viaturas_permitidas
for all
using (auth.role() = 'authenticated' and public.current_app_role() = 'administrador')
with check (auth.role() = 'authenticated' and public.current_app_role() = 'administrador');

-- 4) Rastreabilidade direta cartao -> abastecimento (auditoria)
alter table public.oficina_operacoes_abastecimento
  add column if not exists cartao_id uuid references public.combustivel_motorista_cartoes(id) on delete set null;

create index if not exists idx_oficina_ops_cartao on public.oficina_operacoes_abastecimento(cartao_id);

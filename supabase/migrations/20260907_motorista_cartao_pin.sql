-- PIN seguro para acesso do motorista e limpeza inicial dos registos de teste da oficina.
-- Esta migration remove apenas acessos de mecanicos, sessoes de oficina e cartoes.

create table if not exists public.motorista_sessoes (
  id uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references public.combustivel_motorista_cartoes(id) on delete cascade,
  token_hash text not null unique,
  expira_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_motorista_sessoes_cartao on public.motorista_sessoes(cartao_id);
create index if not exists idx_motorista_sessoes_expira on public.motorista_sessoes(expira_at);

alter table public.combustivel_motorista_cartoes
  add column if not exists pin_hash text,
  add column if not exists pin_salt text;

alter table public.motorista_sessoes enable row level security;

-- Os PINs sao sempre validados pela Edge Function com service role.
-- Nao existem policies de cliente para esta tabela.

-- Limpeza explicita dos dados de teste solicitada pelo administrador.
delete from public.oficina_sessoes;
delete from public.combustivel_motorista_cartoes;
delete from public.oficina_mecanicos_acessos;

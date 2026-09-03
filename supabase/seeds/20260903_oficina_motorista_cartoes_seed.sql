-- Seed idempotente para cartões QR opacos de motoristas
-- Objetivo: gerar cartões de teste para o Terminal Oficina sem dados sensíveis no QR.
-- Requisitos:
-- 1) Tabela public.combustivel_motoristas já existente.
-- 2) Tabela public.combustivel_motorista_cartoes criada pela migration 20260903_oficina_terminal.sql.

do $$
begin
  if to_regclass('public.combustivel_motoristas') is null then
    raise exception 'Tabela public.combustivel_motoristas não existe. Executa primeiro as migrations de combustíveis.';
  end if;

  if to_regclass('public.combustivel_motorista_cartoes') is null then
    raise exception 'Tabela public.combustivel_motorista_cartoes não existe. Executa primeiro a migration 20260903_oficina_terminal.sql.';
  end if;
end $$;

begin;

-- Cria 1 cartão ativo por motorista que ainda não tenha cartão ativo.
insert into public.combustivel_motorista_cartoes (
  motorista_id,
  estado,
  descricao,
  criado_por_user_id,
  created_at,
  updated_at
)
select
  m.id,
  'ativo',
  'Seed inicial Oficina',
  null,
  now(),
  now()
from public.combustivel_motoristas m
where not exists (
  select 1
  from public.combustivel_motorista_cartoes c
  where c.motorista_id = m.id
    and c.estado = 'ativo'
);

commit;

-- Consulta para obter payloads QR prontos para teste no tablet.
-- Formato do QR: FPM:<uuid-opaco>
select
  c.id as cartao_id,
  m.id as motorista_id,
  coalesce(m.nome, 'Motorista sem nome') as motorista_nome,
  c.estado,
  c.qr_token_id,
  concat('FPM:', c.qr_token_id::text) as qr_payload,
  c.created_at,
  c.last_used_at
from public.combustivel_motorista_cartoes c
join public.combustivel_motoristas m on m.id = c.motorista_id
where c.estado = 'ativo'
order by m.nome nulls last, c.created_at desc;

-- Opcional: bloquear todos os cartões de teste criados por este seed.
-- update public.combustivel_motorista_cartoes
-- set estado = 'bloqueado', updated_at = now(), bloqueado_at = now()
-- where descricao = 'Seed inicial Oficina' and estado = 'ativo';

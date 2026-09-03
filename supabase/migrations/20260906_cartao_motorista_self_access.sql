-- FASE 5 (Cartao Digital do Motorista): liga combustivel_motoristas a um utilizador Supabase Auth
-- para permitir que o proprio motorista veja o seu cartao (RLS por auth.uid()).
-- Incremental: nao remove nem altera dados existentes.

alter table public.combustivel_motoristas
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_combustivel_motoristas_auth_user on public.combustivel_motoristas(auth_user_id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'combustivel_motorista_cartoes'
      and policyname = 'motorista_cartoes_self_select'
  ) then
    create policy "motorista_cartoes_self_select"
    on public.combustivel_motorista_cartoes
    for select
    using (
      auth.role() = 'authenticated'
      and exists (
        select 1 from public.combustivel_motoristas m
        where m.id = combustivel_motorista_cartoes.motorista_id
          and m.auth_user_id = auth.uid()
      )
    );
  end if;
end $$;

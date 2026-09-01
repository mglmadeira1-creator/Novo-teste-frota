-- DDL de Criação de Tabelas Administrativas de Viaturas no Supabase
-- Chave dupla: cartrack_vehicle_id e cartrack_registration

create table if not exists public.veiculos_admin (
    id uuid primary key default gen_random_uuid(),
    cartrack_vehicle_id text unique not null,    -- ID telemático único na Cartrack
    cartrack_registration text not null,        -- Matrícula na Cartrack
    id_interno text,                            -- Código interno da empresa (ex: V-001)
    centro_custo text,                          -- Ex: Logística / Obras Sul
    cliente text,                               -- Cliente / Projeto associado
    categoria_interna text,                     -- Ex: Ligeiro Mercadorias, Pesados, Passageiros
    motorista_associado_id uuid,                -- ID do motorista atribuído
    motorista_nome text,                        -- Nome do motorista para visualização direta
    observacoes text,
    propriedade text default 'proprio',         -- proprio, leasing, renting, ald
    data_aquisicao date,
    valor_aquisicao numeric(12,2),
    ativo boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_veiculos_admin_cartrack_vid on public.veiculos_admin(cartrack_vehicle_id);
create index if not exists idx_veiculos_admin_cartrack_reg on public.veiculos_admin(cartrack_registration);

create table if not exists public.veiculos_documentos (
    id uuid primary key default gen_random_uuid(),
    cartrack_vehicle_id text not null references public.veiculos_admin(cartrack_vehicle_id) on delete cascade,
    tipo_documento text not null, -- seguro, ipo, dua, cartao_combustivel, outro
    numero_documento text,
    entidade_emissora text,
    data_emissao date,
    data_validade date,
    ficheiro_url text,
    alertar_dias_antes integer default 30,
    observacoes text,
    created_at timestamptz default now()
);

create table if not exists public.veiculos_manutencao_agenda (
    id uuid primary key default gen_random_uuid(),
    cartrack_vehicle_id text not null references public.veiculos_admin(cartrack_vehicle_id) on delete cascade,
    tipo_servico text not null, -- Mudança Óleo, Revisão X km, Calibração, Pneus
    intervalo_kms integer,
    intervalo_dias integer,
    ultimo_odometro_servico integer,
    ultima_data_servico date,
    status text default 'pendente', -- pendente, agendado, concluido
    created_at timestamptz default now()
);

-- Habilitar RLS e criar políticas públicas para desenvolvimento
alter table public.veiculos_admin enable row level security;
alter table public.veiculos_documentos enable row level security;
alter table public.veiculos_manutencao_agenda enable row level security;

create policy "Permitir leitura pública veiculos_admin" on public.veiculos_admin for select using (true);
create policy "Permitir escrita pública veiculos_admin" on public.veiculos_admin for all using (true);

create policy "Permitir leitura pública veiculos_documentos" on public.veiculos_documentos for select using (true);
create policy "Permitir escrita pública veiculos_documentos" on public.veiculos_documentos for all using (true);

create policy "Permitir leitura pública veiculos_manutencao" on public.veiculos_manutencao_agenda for select using (true);
create policy "Permitir escrita pública veiculos_manutencao" on public.veiculos_manutencao_agenda for all using (true);

-- Assinaturas e papéis (base para vender o app como assinatura mensal).
--
-- papel             : 'admin' (gerencia usuários) | 'trader' (cliente)
-- plano             : texto livre por enquanto ('mensal', 'teste', 'cortesia'...)
-- status_assinatura : 'teste' | 'ativa' | 'suspensa' | 'cancelada'
-- assinatura_ate    : último dia de acesso; null = sem vencimento
--
-- Segurança: a policy usuarios_own deixa o usuário fazer UPDATE na própria linha.
-- Sem restringir colunas, qualquer cliente poderia se promover a admin ou
-- reativar a própria assinatura. Por isso o cliente só pode gravar as colunas
-- de dados do app; papel/plano/status/vencimento só mudam via Edge Function
-- admin-usuarios (service role).

alter table public.usuarios
  add column if not exists papel             text not null default 'trader',
  add column if not exists plano             text not null default 'mensal',
  add column if not exists status_assinatura text not null default 'ativa',
  add column if not exists assinatura_ate    date,
  add column if not exists criado_por        text;

alter table public.usuarios drop constraint if exists usuarios_papel_chk;
alter table public.usuarios add  constraint usuarios_papel_chk
  check (papel in ('admin','trader'));

alter table public.usuarios drop constraint if exists usuarios_status_chk;
alter table public.usuarios add  constraint usuarios_status_chk
  check (status_assinatura in ('teste','ativa','suspensa','cancelada'));

-- Cliente: só colunas de dados do app
revoke insert, update on public.usuarios from anon, authenticated;
grant  insert (id, nome, email, criado_em, config, compliance, regras) on public.usuarios to authenticated;
grant  update (nome, email, config, compliance, regras)               on public.usuarios to authenticated;
-- Sem DELETE no próprio perfil: apagar e deixar o app recriar a linha seria um jeito de zerar a assinatura
revoke delete on public.usuarios from anon, authenticated;

-- Linhas existentes ficaram como ativa/mensal (default no add column acima).
-- Daqui em diante, qualquer perfil novo nasce como teste de 7 dias.
alter table public.usuarios alter column plano             set default 'teste';
alter table public.usuarios alter column status_assinatura set default 'teste';
alter table public.usuarios alter column assinatura_ate    set default (current_date + 7);

-- Dono da conta vira admin (e corrige o e-mail vazio do perfil)
update public.usuarios u
   set papel = 'admin',
       status_assinatura = 'ativa',
       email = case when coalesce(u.email, '') = '' then a.email else u.email end
  from auth.users a
 where a.id::text = u.id
   and a.email = 'felipe-garcia@hotmail.com';

-- Cadastro público (tela de login) entra como teste grátis de 7 dias.
-- Contas criadas pelo admin passam pela mesma trigger, mas a Edge Function
-- admin-usuarios sobrescreve plano/status/vencimento logo em seguida.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, email, criado_em, config, compliance, regras,
                               plano, status_assinatura, assinatura_ate)
  values (
    new.id::text,
    new.raw_user_meta_data->>'nome',
    new.email,
    now(),
    '{"bancaB3":3000,"bancaForex":200}'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb,
    'teste',
    'teste',
    current_date + 7
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

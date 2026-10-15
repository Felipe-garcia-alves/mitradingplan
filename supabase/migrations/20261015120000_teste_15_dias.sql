-- Teste grátis do cadastro público: 7 -> 15 dias
-- (manter igual a DIAS_TESTE em src/pages/Login.jsx)

alter table public.usuarios alter column assinatura_ate set default (current_date + 15);

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
    current_date + 15
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

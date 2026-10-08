-- Cria o perfil em public.usuarios quando um usuário é criado no Supabase Auth.
-- Substitui o setDoc no Firestore que o Login.jsx fazia no cliente: com confirmação
-- de e-mail não há sessão logo após o signUp, então um insert no cliente seria
-- bloqueado pela policy usuarios_own (auth.uid()::text = id).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, email, criado_em, config, compliance, regras)
  values (
    new.id::text,
    new.raw_user_meta_data->>'nome',
    new.email,
    now(),
    '{"bancaB3":3000,"bancaForex":200}'::jsonb,
    '{}'::jsonb,
    '[]'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Só a trigger deve executar a função; não expor via RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

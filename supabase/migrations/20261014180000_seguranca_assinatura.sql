-- 1) Funções da Macro: só o pg_cron (postgres) e a service_role chamam.
--    Antes estavam liberadas para qualquer um via /rest/v1/rpc/...
revoke execute on function public.macro_backfill()                  from public, anon, authenticated;
revoke execute on function public.macro_disparar(text)              from public, anon, authenticated;
revoke execute on function public.macro_disparar_resultado()        from public, anon, authenticated;
revoke execute on function public.macro_historico(text, integer)    from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()                 from public, anon, authenticated;

-- 2) Assinatura no banco, não só no app: diário e estratégias só abrem
--    com assinatura válida (admin sempre passa). O perfil (usuarios)
--    continua legível para o app poder mostrar a tela "assinatura venceu".
create or replace function public.assinatura_ativa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios u
     where u.id = auth.uid()::text
       and (
         u.papel = 'admin'
         or (u.status_assinatura in ('ativa','teste')
             and (u.assinatura_ate is null
                  or u.assinatura_ate >= (now() at time zone 'America/Sao_Paulo')::date))
       )
  );
$$;
revoke execute on function public.assinatura_ativa() from public, anon;
grant  execute on function public.assinatura_ativa() to authenticated;

drop policy if exists diario_own on public.diario;
create policy diario_own on public.diario
  for all to authenticated
  using      (auth.uid()::text = usuario_id and (select public.assinatura_ativa()))
  with check (auth.uid()::text = usuario_id and (select public.assinatura_ativa()));

drop policy if exists estrategias_own on public.estrategias;
create policy estrategias_own on public.estrategias
  for all to authenticated
  using      (auth.uid()::text = usuario_id and (select public.assinatura_ativa()))
  with check (auth.uid()::text = usuario_id and (select public.assinatura_ativa()));

-- 3) Macro é compartilhada entre todos os assinantes: só o admin grava o viés
--    (FEF2 manual). Antes qualquer usuário logado podia alterar o de todo mundo.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.usuarios u where u.id = auth.uid()::text and u.papel = 'admin');
$$;
revoke execute on function public.eh_admin() from public, anon;
grant  execute on function public.eh_admin() to authenticated;

drop policy if exists "atualiza autenticado" on public.macro_vies;
drop policy if exists "grava autenticado"    on public.macro_vies;
create policy "admin atualiza" on public.macro_vies for update to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy "admin grava"    on public.macro_vies for insert to authenticated
  with check ((select public.eh_admin()));

-- 4) Defesa em profundidade: anônimo não escreve em nada; ninguém do app trunca;
--    tabelas da Macro (exceto macro_vies, controlada acima) são só leitura.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke truncate, references, trigger    on all tables in schema public from authenticated;
revoke insert, update, delete on
  public.macro_assets, public.macro_quotes, public.macro_referencia, public.macro_leitura,
  public.macro_resultado, public.macro_calendario, public.macro_config, public.macro_vies_cesta,
  public.macro_calendario_fonte
  from authenticated;
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate on tables from anon;

-- 5) Fotos dos trades: só imagens, até 10 MB, e upload só com assinatura válida.
--    (o bucket vira privado em 20261014190000_bucket_privado.sql, junto com o deploy
--     do front que usa links assinados)
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id = 'diario-imagens';

drop policy if exists upload_own on storage.objects;
create policy upload_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'diario-imagens'
    and (auth.uid())::text = (string_to_array(name, '/'))[1]
    and (select public.assinatura_ativa())
  );

// admin-usuarios — gestão de usuários/assinaturas, só para papel = 'admin'.
//
// Roda com a chave secreta (SB_SECRET_KEY), que NUNCA vai para o app.
// Quem chama precisa mandar o próprio token de sessão no Authorization;
// a função confere o token e o papel antes de qualquer ação.
//
// Ações (POST JSON { acao, ... }):
//   listar                                   -> { usuarios: [...] }
//   criar     { nome, email, senha, plano, status_assinatura, assinatura_ate }
//   atualizar { id, plano?, status_assinatura?, assinatura_ate? }
//   senha     { id, senha }
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const STATUS = ["teste", "ativa", "suspensa", "cancelada"];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resp = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "Método não permitido" }, 405);

  const KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, KEY!, { auth: { persistSession: false } });

  // quem está chamando?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return resp({ erro: "Sem sessão" }, 401);
  const { data: auth, error: authErr } = await db.auth.getUser(token);
  if (authErr || !auth?.user) return resp({ erro: "Sessão inválida" }, 401);
  const eu = auth.user;

  const { data: perfil } = await db.from("usuarios").select("papel").eq("id", eu.id).maybeSingle();
  if (perfil?.papel !== "admin") return resp({ erro: "Acesso restrito ao administrador" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return resp({ erro: "JSON inválido" }, 400); }

  try {
    switch (body.acao) {
      case "listar": {
        const { data: linhas, error } = await db.from("usuarios")
          .select("id, nome, email, criado_em, papel, plano, status_assinatura, assinatura_ate")
          .order("criado_em", { ascending: false });
        if (error) throw error;
        const { data: lista } = await db.auth.admin.listUsers({ perPage: 1000 });
        const porId = new Map((lista?.users ?? []).map((u) => [u.id, u]));
        const usuarios = (linhas ?? []).map((l) => {
          const a = porId.get(l.id);
          return { ...l, email: l.email || a?.email || "", ultimo_acesso: a?.last_sign_in_at ?? null };
        });
        return resp({ usuarios });
      }

      case "criar": {
        const nome  = String(body.nome ?? "").trim();
        const email = String(body.email ?? "").trim().toLowerCase();
        const senha = String(body.senha ?? "");
        const plano = String(body.plano ?? "mensal").trim() || "mensal";
        const status = String(body.status_assinatura ?? "ativa");
        const ate = body.assinatura_ate ? String(body.assinatura_ate) : null;
        if (!nome) return resp({ erro: "Informe o nome." }, 400);
        if (!EMAIL_RE.test(email)) return resp({ erro: "E-mail inválido." }, 400);
        if (senha.length < 8) return resp({ erro: "A senha precisa de pelo menos 8 caracteres." }, 400);
        if (!STATUS.includes(status)) return resp({ erro: "Status inválido." }, 400);
        if (ate && !DATA_RE.test(ate)) return resp({ erro: "Data de vencimento inválida." }, 400);

        const { data: novo, error } = await db.auth.admin.createUser({
          email, password: senha, email_confirm: true, user_metadata: { nome },
        });
        if (error) {
          const msg = /already|registered|exists/i.test(error.message) ? "Já existe uma conta com esse e-mail." : error.message;
          return resp({ erro: msg }, 400);
        }
        // a trigger handle_new_user cria o perfil; completa com os dados da assinatura
        const { error: upErr } = await db.from("usuarios").upsert({
          id: novo.user.id, nome, email, plano, status_assinatura: status, assinatura_ate: ate, criado_por: eu.id,
        }, { onConflict: "id" });
        if (upErr) throw upErr;
        return resp({ ok: true, id: novo.user.id });
      }

      case "atualizar": {
        const id = String(body.id ?? "");
        if (!id) return resp({ erro: "Usuário não informado." }, 400);
        const campos: Record<string, unknown> = {};
        if (body.plano !== undefined) campos.plano = String(body.plano).trim() || "mensal";
        if (body.status_assinatura !== undefined) {
          if (!STATUS.includes(String(body.status_assinatura))) return resp({ erro: "Status inválido." }, 400);
          if (id === eu.id) return resp({ erro: "Você não pode alterar a sua própria assinatura." }, 400);
          campos.status_assinatura = body.status_assinatura;
        }
        if (body.assinatura_ate !== undefined) {
          const ate = body.assinatura_ate ? String(body.assinatura_ate) : null;
          if (ate && !DATA_RE.test(ate)) return resp({ erro: "Data de vencimento inválida." }, 400);
          campos.assinatura_ate = ate;
        }
        if (!Object.keys(campos).length) return resp({ erro: "Nada para atualizar." }, 400);
        const { error } = await db.from("usuarios").update(campos).eq("id", id);
        if (error) throw error;
        return resp({ ok: true });
      }

      case "senha": {
        const id = String(body.id ?? "");
        const senha = String(body.senha ?? "");
        if (!id) return resp({ erro: "Usuário não informado." }, 400);
        if (senha.length < 8) return resp({ erro: "A senha precisa de pelo menos 8 caracteres." }, 400);
        const { error } = await db.auth.admin.updateUserById(id, { password: senha });
        if (error) return resp({ erro: error.message }, 400);
        return resp({ ok: true });
      }

      default:
        return resp({ erro: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    console.error("admin-usuarios:", e);
    return resp({ erro: "Erro interno. Tente novamente." }, 500);
  }
});

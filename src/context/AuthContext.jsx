import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

// Marca de "recuperação de senha em andamento". Fica em sessionStorage para
// sobreviver a um F5 na tela de nova senha: o PASSWORD_RECOVERY só dispara uma
// vez, quando o supabase-js consome o link, e a sessão de recovery é uma sessão
// completa — sem a marca, o refresh cairia no app logado sem trocar a senha.
// Valor "1" = esqueci a senha; "convite" = conta criada pelo admin, ainda sem senha.
const MARCA_RECOVERY = "mtp:password-recovery";
function marca()      { try { return sessionStorage.getItem(MARCA_RECOVERY); } catch { return null; } }
function lerMarca()   { return !!marca(); }
function gravarMarca(v = "1"){ try { if (marca() !== "convite") sessionStorage.setItem(MARCA_RECOVERY, v); } catch { /* storage indisponível */ } }
function limparMarca(){ try { sessionStorage.removeItem(MARCA_RECOVERY); } catch { /* storage indisponível */ } }

// Link de convite: o Supabase volta com #...&type=invite e só dispara SIGNED_IN
// (sem PASSWORD_RECOVERY). Lido antes do supabase-js limpar a URL, para o cliente
// cair em "Crie sua senha" e não no app logado sem senha.
if (/[#&]type=invite(&|$)/.test(window.location.hash)) gravarMarca("convite");

// O PASSWORD_RECOVERY é disparado num setTimeout(0) agendado durante a
// inicialização. Registrar no import do módulo garante que o evento não se perde
// caso dispare antes do AuthProvider montar.
supabase.auth.onAuthStateChange(event => {
  if (event === "PASSWORD_RECOVERY") gravarMarca();
});

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [erroLink, setErroLink] = useState("");

  useEffect(() => {
    let ativo = true;

    supabase.auth.initialize().then(({ error }) => {
      // Link expirado/já usado: o Supabase redireciona com #error=...&error_code=otp_expired.
      // Não há evento nesse caso; o erro só aparece no retorno do initialize(), e a lib
      // não limpa a URL.
      if (error?.name === "AuthImplicitGrantRedirectError") {
        setErroLink("Este link expirou ou já foi usado. Clique em \"Esqueci minha senha\" para receber um novo.");
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
      // Um tick a mais: o PASSWORD_RECOVERY foi agendado antes de initialize() resolver,
      // então a marca já terá sido gravada quando este timer rodar. Sem isso o app
      // logado piscaria antes da tela de nova senha.
      setTimeout(async () => {
        if (!ativo) return;
        const { data: { session } } = await supabase.auth.getSession();
        // Sem sessão a marca é resíduo (sessão expirou sem SIGNED_OUT): descarta.
        if (!session) limparMarca();
        setUser(session?.user ?? null);
        setRecovery(lerMarca());
        setLoading(false);
      }, 0);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") { limparMarca(); setRecovery(false); }
    });

    return () => { ativo = false; subscription.unsubscribe(); };
  }, []);

  const logout = () => supabase.auth.signOut();

  const concluirRecovery = () => { limparMarca(); setRecovery(false); };

  const cancelarRecovery = () => { limparMarca(); setRecovery(false); return supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ user, loading, logout, recovery, convite: recovery && marca() === "convite", concluirRecovery, cancelarRecovery, erroLink }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { user: null, loading: true, logout: () => {}, recovery: false, convite: false, concluirRecovery: () => {}, cancelarRecovery: () => {}, erroLink: "" };
  return ctx;
}

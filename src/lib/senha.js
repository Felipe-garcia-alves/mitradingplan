// Mi Trading Plan - regras de senha (espelham Supabase › Auth › Email:
// mínimo 8, letras e números, bloqueio de senhas vazadas)

export const SENHA_MIN = 8;
export const REGRA_SENHA = "Mínimo 8 caracteres, com letras e números";

// Retorna a mensagem de erro, ou "" se a senha atende às regras
export function validarSenha(s) {
  if (!s || s.length < SENHA_MIN) return `A senha precisa de pelo menos ${SENHA_MIN} caracteres.`;
  if (!/[a-zA-Z]/.test(s) || !/\d/.test(s)) return "A senha precisa ter letras e números.";
  return "";
}

// Traduz os erros de senha fraca do Supabase (inclui senha vazada)
export function erroDeSenha(error) {
  if (!error) return "";
  const motivos = error.reasons || error.weak_password?.reasons || [];
  if (error.code === "weak_password" || error.name === "AuthWeakPasswordError" || /weak|pwned|leaked/i.test(error.message || "")) {
    if (motivos.includes("pwned") || /pwned|leaked/i.test(error.message || ""))
      return "Essa senha já apareceu em vazamentos de dados na internet. Escolha outra.";
    if (motivos.includes("length")) return `A senha precisa de pelo menos ${SENHA_MIN} caracteres.`;
    if (motivos.includes("characters")) return "A senha precisa ter letras e números.";
    return "Senha muito fraca. Use 8+ caracteres com letras e números.";
  }
  if (error.code === "same_password") return "A nova senha deve ser diferente da atual.";
  return "";
}

// Senha aleatória que sempre tem letra e número (sem caracteres ambíguos)
export function gerarSenha(tam = 10) {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const todos = letras + nums;
  const rnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = [letras[rnd(letras.length)], nums[rnd(nums.length)]];
  while (chars.length < tam) chars.push(todos[rnd(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

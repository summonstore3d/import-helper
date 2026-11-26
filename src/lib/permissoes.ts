export type NivelAcesso = "admin" | "gerente" | "vendedor";

/** Só administradores adicionam usuários e redefinem senhas. */
export function podeGerenciarUsuarios(nivel: NivelAcesso | null | undefined): boolean {
  return nivel === "admin";
}

const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const DIGITOS = "23456789";
const SIMBOLOS = "@#$%&*!?";
const TODOS = MAIUSCULAS + MINUSCULAS + DIGITOS + SIMBOLOS;

function aleatorio(ate: number): number {
  const limite = 4294967296 - (4294967296 % ate);
  const buf = new Uint32Array(1);
  let valor = 0;
  do {
    crypto.getRandomValues(buf);
    valor = buf[0] ?? 0;
  } while (valor >= limite);
  return valor % ate;
}

function escolher(pool: string): string {
  return pool.charAt(aleatorio(pool.length));
}

/** Senha inicial: 14 caracteres, sempre com maiúscula, minúscula, número e símbolo. */
export function gerarSenhaInicial(): string {
  const chars = [
    escolher(MAIUSCULAS),
    escolher(MINUSCULAS),
    escolher(DIGITOS),
    escolher(SIMBOLOS),
  ];
  while (chars.length < 14) chars.push(escolher(TODOS));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    const atual = chars[i] ?? "";
    chars[i] = chars[j] ?? "";
    chars[j] = atual;
  }
  return chars.join("");
}

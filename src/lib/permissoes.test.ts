import { describe, expect, it } from "vitest";
import {
  gerarSenhaInicial,
  podeExcluirUsuario,
  podeGerenciarUsuarios,
} from "./permissoes";

describe("gerenciar usuários", () => {
  it("só quem é administrador pode adicionar usuário e redefinir senha", () => {
    expect(podeGerenciarUsuarios("admin")).toBe(true);
    expect(podeGerenciarUsuarios("gerente")).toBe(false);
    expect(podeGerenciarUsuarios("vendedor")).toBe(false);
    expect(podeGerenciarUsuarios(null)).toBe(false);
    expect(podeGerenciarUsuarios(undefined)).toBe(false);
  });

  it("só administradores excluem contas, e nunca a própria conta", () => {
    expect(podeExcluirUsuario("admin", "outra-conta", "minha-conta")).toBe(true);
    expect(podeExcluirUsuario("admin", "minha-conta", "minha-conta")).toBe(false);
    expect(podeExcluirUsuario("admin", "outra-conta", null)).toBe(false);
    expect(podeExcluirUsuario("gerente", "outra-conta", "minha-conta")).toBe(false);
    expect(podeExcluirUsuario("vendedor", "outra-conta", "minha-conta")).toBe(false);
    expect(podeExcluirUsuario(null, "outra-conta", "minha-conta")).toBe(false);
  });

  it("a senha inicial gerada atende ao mínimo de 8 caracteres e tem variedade", () => {
    for (let i = 0; i < 50; i++) {
      const senha = gerarSenhaInicial();
      expect(senha.length).toBeGreaterThanOrEqual(8);
      expect(senha).toMatch(/[A-Z]/);
      expect(senha).toMatch(/[a-z]/);
      expect(senha).toMatch(/[0-9]/);
      expect(senha).toMatch(/[^A-Za-z0-9]/);
    }
  });
});

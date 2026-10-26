import type { Nivel } from "@/lib/acesso";

export function mostraDetalhesPrecificacao(nivel: Nivel | null, visaoVendedor: boolean) {
  return nivel === "gerente" || (nivel === "admin" && !visaoVendedor);
}
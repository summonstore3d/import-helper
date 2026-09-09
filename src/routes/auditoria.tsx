import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { dataHoraBR } from "@/lib/format";
import { usePrototype } from "@/state/prototype";
import { DemoTag, KPI, PageHeader, Panel, Td, Th } from "@/components/ui-kit";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — Rastro de Alterações" },
      {
        name: "description",
        content:
          "Registro de quem alterou o quê na precificação: módulo, campo, valor anterior, valor novo, motivo e data.",
      },
      { property: "og:title", content: "Auditoria — Rastro de Alterações" },
      {
        property: "og:description",
        content: "Governança sobre custos e preços: nada muda sem deixar rastro.",
      },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  const { auditoria } = usePrototype();
  const [modulo, setModulo] = useState("TODOS");
  const modulos = Array.from(new Set(auditoria.map((a) => a.modulo)));
  const linhas = auditoria.filter((a) => modulo === "TODOS" || a.modulo === modulo);
  const daSessao = auditoria.filter((a) => a.origem === "Sessão de demonstração").length;

  return (
    <>
      <PageHeader
        titulo="Auditoria"
        descricao="Toda alteração de custo, estrutura ou parâmetro fica registrada com autor, data e motivo. É o controle que uma planilha compartilhada não consegue oferecer."
        acoes={
          <select
            value={modulo}
            onChange={(e) => setModulo(e.target.value)}
            className="h-9 rounded-sm border border-input bg-background px-2 text-sm outline-none focus:border-ring"
          >
            <option value="TODOS">Todos os módulos</option>
            {modulos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPI rotulo="Eventos registrados" valor={String(auditoria.length)} />
        <KPI rotulo="Módulos monitorados" valor={String(modulos.length)} />
        <KPI
          rotulo="Alterações desta sessão"
          valor={String(daSessao)}
          detalhe="Geradas ao navegar no protótipo"
          destaque
        />
      </div>

      <Panel className="mt-4" titulo="Trilha de auditoria" bodyClassName="p-0">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Data / hora</Th>
                <Th>Usuário</Th>
                <Th>Módulo</Th>
                <Th>Registro</Th>
                <Th>Campo</Th>
                <Th>De</Th>
                <Th>Para</Th>
                <Th>Motivo</Th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((a) => (
                <tr key={a.id} className="odd:bg-secondary/30">
                  <Td className="whitespace-nowrap text-xs">{dataHoraBR(a.data)}</Td>
                  <Td className="text-xs font-semibold">{a.usuario}</Td>
                  <Td className="text-xs">{a.modulo}</Td>
                  <Td className="max-w-[16rem] truncate text-xs">{a.registro}</Td>
                  <Td className="max-w-[16rem] truncate text-xs">{a.campo}</Td>
                  <Td className="text-xs text-muted-foreground">{a.valorAnterior}</Td>
                  <Td className="text-xs font-semibold">{a.valorNovo}</Td>
                  <Td className="max-w-[14rem] truncate text-xs">
                    {a.motivo}{" "}
                    {a.origem === "Demonstração" ? <DemoTag>Demonstrativo</DemoTag> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-4" titulo="Controles de governança previstos">
        <ul className="grid gap-2 md:grid-cols-2">
          {[
            "Perfis de acesso por módulo: engenharia altera estrutura, controladoria altera custo, comercial só consulta preço.",
            "Aprovação obrigatória para alteração de margem, comissão e inadimplência.",
            "Bloqueio de precificação quando o produto tem pendência crítica de dados.",
            "Registro imutável de cada versão de preço enviada ao comercial.",
            "Alerta automático quando um insumo relevante varia acima de um limite definido.",
            "Exportação da memória de cálculo em PDF para defesa comercial e fiscal.",
          ].map((t) => (
            <li
              key={t}
              className="rounded-md border-l-4 border-l-green border-border bg-secondary/40 px-3 py-2 text-sm"
            >
              {t}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

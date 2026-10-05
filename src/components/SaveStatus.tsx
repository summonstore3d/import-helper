import { AlertCircle, Check, Loader2 } from "lucide-react";
import { usePrototype } from "@/state/prototype";

/** Indicador discreto do resultado da última gravação. */
export function SaveStatus() {
  const { gravacao, autenticado } = usePrototype();
  if (!autenticado || gravacao.estado === "ocioso") return null;
  if (gravacao.estado === "salvando")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
        <Loader2 className="size-3.5 animate-spin" /> Salvando…
      </span>
    );
  if (gravacao.estado === "salvo")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green" role="status">
        <Check className="size-3.5" /> Salvo
      </span>
    );
  return (
    <span className="inline-flex max-w-72 items-center gap-1 text-xs font-semibold text-destructive" role="alert">
      <AlertCircle className="size-3.5 shrink-0" /> {gravacao.mensagem}
    </span>
  );
}

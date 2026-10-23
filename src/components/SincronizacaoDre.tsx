import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type EstadoSincronizacaoDre =
  | { estado: "salvando"; arquivo: string }
  | { estado: "salvo"; arquivo: string; taxa: string }
  | { estado: "erro"; arquivo: string; mensagem: string };

export function SincronizacaoDre({ estado, onFechar, onTentarNovamente }: {
  estado: EstadoSincronizacaoDre | null;
  onFechar: () => void;
  onTentarNovamente: () => void;
}) {
  const salvando = estado?.estado === "salvando";
  return (
    <AlertDialog open={estado !== null} onOpenChange={(aberto) => { if (!aberto && !salvando) onFechar(); }}>
      <AlertDialogContent className="max-w-md rounded-md" onEscapeKeyDown={(e) => { if (salvando) e.preventDefault(); }}>
        <div className="flex flex-col items-center gap-4 py-3" role="status" aria-live="polite" aria-busy={salvando}>
          <div className="relative flex h-28 w-60 items-center justify-center">
            {salvando ? <LoaderCircle aria-hidden="true" className="absolute size-28 animate-spin text-primary/20 motion-reduce:animate-none" strokeWidth={1} /> : null}
            <div className="relative bg-background px-3 text-center text-primary" aria-label="D’AGOSTINI — Indústria de concreto">
              <p className="text-2xl font-black leading-none">D&apos;AGOSTINI</p>
              <p className="mt-1 text-[10px] font-medium">INDÚSTRIA DE CONCRETO</p>
            </div>
            {estado?.estado === "salvo" ? <Check className="absolute bottom-0 size-6 text-green" /> : null}
            {estado?.estado === "erro" ? <AlertCircle className="absolute bottom-0 size-6 text-destructive" /> : null}
          </div>
          <AlertDialogHeader className="w-full items-center text-center sm:text-center">
            <AlertDialogTitle>{salvando ? "Sincronizando despesas…" : estado?.estado === "salvo" ? "Despesas sincronizadas" : "Não foi possível sincronizar"}</AlertDialogTitle>
            <AlertDialogDescription className="w-full break-words">
              {estado?.estado === "erro" ? estado.mensagem : estado?.arquivo}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {estado?.estado === "salvo" ? <p className="text-sm text-muted-foreground">Percentual aplicado no preço: <strong className="text-green">{estado.taxa}</strong></p> : null}
        </div>
        {!salvando ? <div className="flex justify-end gap-2">
          {estado?.estado === "erro" ? <Button variant="outline" onClick={onTentarNovamente}>Tentar novamente</Button> : null}
          <Button onClick={onFechar}>{estado?.estado === "salvo" ? "Concluir" : "Fechar"}</Button>
        </div> : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
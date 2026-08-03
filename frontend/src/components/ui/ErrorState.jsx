import { AlertTriangle } from "lucide-react";
import Button from "./Button.jsx";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="grid min-h-36 place-items-center gap-3 rounded-md border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center text-[var(--color-danger-soft)]">
      <AlertTriangle size={28} aria-hidden="true" />
      <div className="grid gap-1">
        <h3 className="text-base font-bold text-[var(--color-text)]">Não foi possível carregar os dados.</h3>
        <p className="text-sm leading-snug">{message || "Verifique se a API está rodando e tente novamente."}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

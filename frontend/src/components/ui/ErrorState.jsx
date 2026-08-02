import { AlertTriangle } from "lucide-react";
import Button from "./Button.jsx";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="grid min-h-36 place-items-center gap-3 rounded-md border border-[rgba(255,103,103,0.25)] bg-[rgba(255,103,103,0.08)] p-6 text-center text-[#ffd3d3]">
      <AlertTriangle size={28} aria-hidden="true" />
      <div className="grid gap-1">
        <h3 className="text-base font-bold text-[#f3f4f6]">Não foi possível carregar os dados.</h3>
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

import { AlertTriangle } from "lucide-react";
import Button from "./Button.jsx";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state-box">
      <AlertTriangle size={28} aria-hidden="true" />
      <div>
        <h3>Não foi possível carregar os dados.</h3>
        <p>{message || "Verifique se a API está rodando e tente novamente."}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}


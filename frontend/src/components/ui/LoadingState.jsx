import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Carregando..." }) {
  return (
    <div className="state-box">
      <Loader2 className="loading-spinner" size={28} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}


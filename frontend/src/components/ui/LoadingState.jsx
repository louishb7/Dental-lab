import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Carregando..." }) {
  return (
    <div
      role="status"
      className="grid min-h-36 content-center justify-items-center gap-3 p-6 text-center text-[var(--color-text-muted)]"
    >
      <Loader2 className="animate-spin text-primary" size={28} aria-hidden="true" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

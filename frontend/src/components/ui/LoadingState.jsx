import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Carregando..." }) {
  return (
    <div className="grid min-h-36 place-items-center gap-3 rounded-md border border-dashed border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.03)] p-6 text-center text-[#aeb7c2]">
      <Loader2 className="animate-spin text-[#ff8a2a]" size={28} aria-hidden="true" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

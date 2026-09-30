import { useRegisterSW } from "virtual:pwa-register/react";
import Button from "../components/ui/Button.jsx";
import useApiAvailability from "./useApiAvailability.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function PwaStatus() {
  const apiAvailability = useApiAvailability();
  const { session, revalidateSession } = useAuth();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && apiAvailability !== "unavailable") return null;

  return (
    <div className="flex flex-col gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-[var(--space-page-x)] py-2 text-xs sm:text-sm">
      {apiAvailability === "unavailable" && (
        <div role="status" className="flex flex-wrap items-center gap-2 text-[var(--color-text)]">
          <span className="flex-1">API indisponível. Dados podem estar desatualizados.</span>
          {session && (
            <Button variant="ghost" size="sm" onClick={() => void revalidateSession()}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      {needRefresh && (
        <div role="status" className="flex flex-wrap items-center gap-2 text-[var(--color-text)]">
          <span className="min-w-0 flex-1 font-medium">Nova versão disponível</span>
          <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
            Depois
          </Button>
          <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </Button>
        </div>
      )}
    </div>
  );
}

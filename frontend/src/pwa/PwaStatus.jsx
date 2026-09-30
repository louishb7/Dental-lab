import { createPortal } from "react-dom";
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

  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col items-end gap-2 text-sm sm:inset-x-5 sm:bottom-5">
      {apiAvailability === "unavailable" && (
        <div
          role="status"
          className="pointer-events-auto flex max-w-lg flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] shadow-[var(--shadow-soft)]"
        >
          <span>
            API indisponível. Dados podem estar desatualizados; alterações precisam de conexão.
          </span>
          {session && (
            <Button variant="ghost" size="sm" onClick={() => void revalidateSession()}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      {needRefresh && (
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-sm flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text)] shadow-[var(--shadow-soft)]"
        >
          <span className="min-w-0 flex-1 font-medium">Nova versão disponível</span>
          <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
            Depois
          </Button>
          <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </Button>
        </div>
      )}
    </div>,
    document.body,
  );
}

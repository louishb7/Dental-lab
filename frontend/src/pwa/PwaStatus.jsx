import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import Button from "../components/ui/Button.jsx";

export default function PwaStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
    };
  }, []);

  if (!needRefresh && online) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col items-end gap-2 text-sm sm:inset-x-5 sm:bottom-5">
      {!online && (
        <p
          role="status"
          className="pointer-events-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] shadow-[var(--shadow-soft)]"
        >
          Sem conexão. Dados e alterações precisam de internet.
        </p>
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

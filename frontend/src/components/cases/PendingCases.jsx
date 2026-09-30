import Button from "../ui/Button.jsx";
import { formatDate } from "../../utils/formatters.js";

export default function PendingCases({ cases, doctors, syncingCaseId, onReview, onCancel }) {
  if (!cases.length) return null;
  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor.name]));

  return (
    <section
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      aria-label="Casos aguardando sincronização"
    >
      <h2 className="text-sm font-semibold">Casos salvos neste dispositivo</h2>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Ainda não são casos oficiais no servidor.
      </p>
      <div className="mt-3 grid gap-2">
        {cases.map((localCase) => {
          const syncing = syncingCaseId === localCase.id;
          return (
            <div
              key={localCase.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3"
            >
              <div className="min-w-0 flex-1">
                <strong className="block break-words text-sm">
                  {localCase.payload.patient_ref}
                </strong>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {doctorById.get(localCase.doctorId) ||
                    (localCase.doctorId === null
                      ? "Avulso"
                      : `Dentista #${localCase.doctorId}`)}{" "}
                  · {formatDate(localCase.payload.deadline)}
                </span>
              </div>
              <span
                className="text-xs font-semibold text-[var(--color-warning-soft)]"
                role="status"
              >
                {syncing
                  ? "Sincronizando…"
                  : localCase.state === "failed"
                    ? "Não foi possível sincronizar"
                    : "Aguardando sincronização"}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={syncing}
                  onClick={() => onReview(localCase)}
                >
                  Revisar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={syncing}
                  onClick={() => onCancel(localCase)}
                >
                  Remover
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

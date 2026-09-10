import { useState } from "react";
import { ChevronRight, PackageCheck } from "lucide-react";
import Button from "../ui/Button.jsx";
import DeadlineBadge from "../ui/DeadlineBadge.jsx";
import Modal from "../ui/Modal.jsx";

export default function ReadyQueue({ cases, busy, onOpenCase, onDeliverCase }) {
  const [open, setOpen] = useState(false);
  const count = cases.length;

  function rows() {
    return (
      <div className="divide-y divide-[var(--color-border)]">
        {cases.map((caseItem) => (
          <article key={caseItem.id} className="grid gap-1.5 py-3 first:pt-0 last:pb-0">
            <button
              type="button"
              className="grid min-h-11 min-w-0 gap-0.5 text-left hover:text-primary"
              onClick={() => onOpenCase(caseItem.id)}
            >
              <strong className="break-words text-sm font-semibold">{caseItem.patient_ref}</strong>
              <span className="break-words text-xs text-[var(--color-text-muted)]">{caseItem.doctor_name}</span>
            </button>
            <div className="flex items-center justify-between gap-2">
              <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                aria-label={`Entregar caso de ${caseItem.patient_ref}`}
                onClick={() => onDeliverCase(caseItem.id)}
              >
                <PackageCheck size={14} /> Entregar
              </Button>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0 lg:col-start-2 lg:row-start-1">
      <button
        type="button"
        className={`flex w-full items-center gap-3 rounded-lg text-left lg:hidden ${count ? "min-h-14 border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2" : "min-h-11 px-1 text-[var(--color-text-muted)]"}`}
        aria-label={`${count} ${count === 1 ? "caso pronto" : "casos prontos"} para entrega. Abrir fila de saída`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <PackageCheck size={18} className="shrink-0 text-[var(--color-text-muted)]" />
        <span className={count ? "text-sm font-medium" : "text-xs"}>
          {count ? `${count} ${count === 1 ? "pronto" : "prontos"} para entrega` : "Nenhum caso pronto para entrega"}
        </span>
        <ChevronRight size={16} className="ml-auto shrink-0 text-[var(--color-text-muted)]" />
      </button>

      <section className="hidden lg:block" aria-label="Fila de saída">
        <h2 className="mb-3 flex min-h-7 items-center gap-2 text-sm font-semibold">
          <PackageCheck size={16} className="text-[var(--color-text-muted)]" />
          Prontos para entrega
          <span className="ml-auto text-xs font-normal tabular-nums text-[var(--color-text-muted)]">{count}</span>
        </h2>
        {count ? (
          <div
            className="max-h-[480px] overflow-y-auto overscroll-contain rounded-sm px-1.5 py-1"
            role="region"
            aria-label="Casos aguardando saída"
            tabIndex={0}
          >
            {rows()}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">Nenhuma saída pendente.</p>
        )}
      </section>

      {open && (
        <Modal
          title="Prontos para entrega"
          description={`${count} ${count === 1 ? "caso aguardando" : "casos aguardando"} saída.`}
          onClose={() => setOpen(false)}
          className="max-w-[520px]"
        >
          {count ? rows() : <p className="py-3 text-sm text-[var(--color-text-muted)]">Nenhuma saída pendente.</p>}
        </Modal>
      )}
    </div>
  );
}

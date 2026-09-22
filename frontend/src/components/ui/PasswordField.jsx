import { useId, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { passwordRequirements } from "../../utils/password.js";

export default function PasswordField({
  label = "Senha",
  value,
  onChange,
  creation = false,
  errorText,
  disabled = false,
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const sizeError =
    creation && new TextEncoder().encode(value).length > 72
      ? "Senha deve ter no máximo 72 bytes."
      : "";
  const error = errorText || sizeError;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-[var(--color-text-muted)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] py-2 pl-3 pr-12 text-base focus:border-primary focus:ring-2 focus:ring-primary/25 md:text-sm"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={creation ? "new-password" : "current-password"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={creation || error ? `${id}-help` : undefined}
          required
        />
        <button
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-md text-[var(--color-text-muted)] hover:text-primary"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <div id={`${id}-help`}>
        {creation && (
          <ul
            className="grid gap-1 text-xs text-[var(--color-text-muted)]"
            aria-label="Requisitos da senha"
          >
            {passwordRequirements(value).map(({ label: requirement, met }) => (
              <li
                key={requirement}
                className={`flex items-center gap-2 ${met ? "line-through text-[var(--color-success)]" : ""}`}
              >
                {met ? (
                  <Check size={14} aria-label="Concluído" />
                ) : (
                  <Circle size={14} aria-label="Pendente" />
                )}
                {requirement}
              </li>
            ))}
          </ul>
        )}
        {error && <small className="text-xs text-[var(--color-danger)]">{error}</small>}
      </div>
    </div>
  );
}

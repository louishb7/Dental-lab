import { cloneElement, isValidElement } from "react";
import { cn } from "../../lib/utils.js";

const CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Renders a labeled form control with optional helper text.
 *
 * @param {object} props Component props.
 * @param {string} props.label Field label.
 * @param {string} [props.helperText] Supporting copy for validation rules.
 * @param {string} [props.errorText] Validation feedback displayed below the field.
 * @param {React.ReactNode} props.children Form control content.
 * @returns {JSX.Element} Labeled field wrapper.
 */
export default function FormField({ label, helperText, errorText, children }) {
  const shouldStyleChild = isValidElement(children)
    && typeof children.type === "string"
    && ["input", "select", "textarea"].includes(children.type);
  const child = shouldStyleChild
    ? cloneElement(children, {
        className: cn(CONTROL_CLASS, children.props.className),
      })
    : children;

  return (
    <label className="grid gap-1.5 text-xs font-bold text-[var(--color-text-muted)]">
      <span>{label}</span>
      {child}
      {helperText ? <small className="text-xs font-medium leading-snug text-[var(--color-text-muted)]">{helperText}</small> : null}
      {errorText ? <small className="text-xs font-semibold leading-snug text-[var(--color-danger)]">{errorText}</small> : null}
    </label>
  );
}

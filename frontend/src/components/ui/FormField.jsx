import { cloneElement, isValidElement } from "react";
import { cn } from "../../lib/utils.js";

const CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-[rgba(229,235,241,0.13)] bg-[rgba(23,28,36,0.96)] px-3 py-2 text-sm text-[#f3f4f6] outline-none placeholder:text-[#aeb7c2]/75 focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/25 disabled:cursor-not-allowed disabled:opacity-60";

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
    <label className="grid gap-1.5 text-xs font-bold text-[#aeb7c2]">
      <span>{label}</span>
      {child}
      {helperText ? <small className="text-xs font-medium leading-snug text-[#aeb7c2]">{helperText}</small> : null}
      {errorText ? <small className="text-xs font-semibold leading-snug text-[#ff6767]">{errorText}</small> : null}
    </label>
  );
}

import { Button as ShadcnButton } from "./button.jsx";
import { cn } from "../../lib/utils.js";

const VARIANT_CLASSES = {
  primary: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] hover:bg-[var(--color-elevated-bg)]",
  ghost:
    "border-transparent bg-transparent text-[var(--color-text-soft)] shadow-none hover:bg-[var(--color-subtle)] hover:text-[var(--color-text)]",
  danger:
    "border-[color-mix(in_srgb,var(--color-danger)_34%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger-soft)] hover:bg-[color-mix(in_srgb,var(--color-danger)_20%,transparent)]",
  success:
    "border-[color-mix(in_srgb,var(--color-success)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success-soft)] hover:bg-[color-mix(in_srgb,var(--color-success)_22%,transparent)]",
};

export default function Button({
  children,
  variant = "secondary",
  size = "md",
  iconOnly = false,
  className = "",
  ...props
}) {
  return (
    <ShadcnButton
      className={cn(
        "border font-bold shadow-none",
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.secondary,
        iconOnly ? "" : "min-w-fit",
        className,
      )}
      size={iconOnly ? (size === "sm" ? "icon-sm" : "icon") : size === "sm" ? "sm" : "default"}
      variant="ghost"
      type="button"
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}

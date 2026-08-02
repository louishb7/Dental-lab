import { Button as ShadcnButton } from "./button.jsx";
import { cn } from "../../lib/utils.js";

const VARIANT_CLASSES = {
  primary: "border-[#ff8a2a] bg-[#ff8a2a] text-[#1b120b] hover:bg-[#f47c17]",
  secondary:
    "border-[rgba(229,235,241,0.13)] bg-[rgba(42,49,59,0.72)] text-[#f3f4f6] hover:bg-[rgba(52,60,72,0.9)]",
  ghost:
    "border-transparent bg-transparent text-[#d7dde5] shadow-none hover:bg-[rgba(237,237,237,0.06)] hover:text-[#f3f4f6]",
  danger:
    "border-[rgba(255,103,103,0.34)] bg-[rgba(255,103,103,0.12)] text-[#ffd3d3] hover:bg-[rgba(255,103,103,0.2)]",
  success:
    "border-[rgba(115,201,143,0.38)] bg-[rgba(115,201,143,0.14)] text-[#d5f8e0] hover:bg-[rgba(115,201,143,0.22)]",
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

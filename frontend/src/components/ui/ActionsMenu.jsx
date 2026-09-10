import { DropdownMenu } from "radix-ui";
import { MoreHorizontal } from "lucide-react";
import Button from "./Button.jsx";
import { useRef } from "react";

export default function ActionsMenu({ label, items }) {
  const triggerRef = useRef(null);
  const pendingActionRef = useRef(null);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button ref={triggerRef} variant="ghost" iconOnly aria-label={label} title={label}>
          <MoreHorizontal size={18} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={5}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            action?.();
          }}
          className="z-50 min-w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-soft)]"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, danger, disabled }) => (
            <DropdownMenu.Item
              key={itemLabel}
              disabled={disabled}
              onSelect={() => {
                // Open a dialog after the menu releases its focus scope so that
                // its opener is the persistent trigger, not a removed menu item.
                pendingActionRef.current = onSelect;
              }}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm outline-none focus:bg-[var(--color-surface-muted)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-soft)]"}`}
            >
              {Icon && <Icon size={16} />}
              {itemLabel}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

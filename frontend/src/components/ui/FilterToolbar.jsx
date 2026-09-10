import { useId, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Button from "./Button.jsx";

export default function FilterToolbar({ search, activeCount = 0, children }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap">
      <div className="min-w-0 flex-1 sm:min-w-52">{search}</div>
      <Button
        className="sm:hidden"
        variant="outline"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <SlidersHorizontal size={16} />
        Filtros{activeCount > 0 && <span className="text-primary">{activeCount}</span>}
      </Button>
      <div
        id={id}
        className={`${expanded ? "grid" : "hidden"} col-span-2 grid-cols-2 gap-2 sm:flex sm:max-w-full sm:items-center [&_select]:min-w-0 [&_select]:flex-1 sm:[&_select]:w-40`}
      >
        {children}
      </div>
    </div>
  );
}

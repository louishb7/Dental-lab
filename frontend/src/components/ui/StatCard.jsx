import { Card, CardContent } from "./card.jsx";
import { cn } from "../../lib/utils.js";

const TONE_CLASSES = {
  info: {
    icon: "bg-[rgba(138,180,255,0.12)] text-[#d6e5ff]",
  },
  warning: {
    icon: "bg-[rgba(242,185,73,0.14)] text-[#ffe5a9]",
  },
  success: {
    icon: "bg-[rgba(115,201,143,0.12)] text-[#d5f8e0]",
  },
  danger: {
    icon: "bg-[rgba(255,103,103,0.12)] text-[#ffd3d3]",
  },
};

export default function StatCard({ title, value, description, icon: Icon, tone = "info" }) {
  const toneClasses = TONE_CLASSES[tone] || TONE_CLASSES.info;

  return (
    <Card className="rounded-md border-[rgba(229,235,241,0.13)] bg-[rgba(25,30,38,0.96)] py-0 text-[#f3f4f6] shadow-sm">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.05em] text-[#aeb7c2]">{title}</span>
        {Icon && (
          <span className={cn("grid size-9 place-items-center rounded-md", toneClasses.icon)} aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
        </div>
        <strong className="text-3xl font-bold leading-none">{value}</strong>
        {description && <p className="text-sm leading-snug text-[#aeb7c2]">{description}</p>}
      </CardContent>
    </Card>
  );
}

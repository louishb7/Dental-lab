import { getDeadlineBadge } from "../../utils/formatters.js";
import { Badge } from "./badge.jsx";

const TONE_CLASSES = {
  neutral: "border-[rgba(229,235,241,0.13)] bg-[rgba(237,237,237,0.05)] text-[#aeb7c2]",
  success: "border-[rgba(115,201,143,0.28)] bg-[rgba(115,201,143,0.12)] text-[#d5f8e0]",
  warning: "border-[rgba(242,185,73,0.32)] bg-[rgba(242,185,73,0.12)] text-[#ffe5a9]",
  danger: "border-[rgba(255,103,103,0.32)] bg-[rgba(255,103,103,0.12)] text-[#ffd3d3]",
  info: "border-[rgba(138,180,255,0.28)] bg-[rgba(138,180,255,0.1)] text-[#d6e5ff]",
};

export default function DeadlineBadge({ deadline, status }) {
  const badge = getDeadlineBadge(deadline, status);

  return (
    <Badge variant="outline" className={TONE_CLASSES[badge.tone] || TONE_CLASSES.neutral}>
      {badge.label}
    </Badge>
  );
}

const TOOTH_VARIANTS = {
  anterior: {
    shell:
      "M14 8 C20 2 29 4 32 8 C36 4 45 2 50 8 C56 16 54 28 50 38 C47 47 44 56 39 63 C36 68 33 69 32 69 C31 69 28 68 25 63 C20 56 17 47 14 38 C10 28 8 16 14 8 Z",
    grooves: [
      "M23 18 C27 15 37 15 41 18",
      "M25 56 C29 52 35 52 39 56",
      "M32 21 C31 34 31 48 32 63",
    ],
    numberY: 34,
  },
  canine: {
    shell:
      "M13 10 C18 4 27 5 32 12 C37 5 46 4 51 10 C57 18 55 31 51 41 C47 50 43 59 36 65 C33 68 31 68 28 65 C21 59 17 50 13 41 C9 31 7 18 13 10 Z",
    grooves: [
      "M24 19 C28 16 36 16 40 19",
      "M32 17 C30 29 29 45 31 61",
      "M24 55 C28 52 35 52 39 55",
    ],
    numberY: 34,
  },
  premolar: {
    shell:
      "M9 15 C12 6 24 3 32 9 C40 3 52 6 55 15 C60 25 54 36 53 43 C57 52 50 63 39 64 C36 69 31 70 27 64 C16 64 7 53 11 43 C10 36 4 25 9 15 Z",
    grooves: [
      "M22 19 C27 15 37 15 42 19",
      "M23 38 C29 34 35 34 41 38",
      "M32 20 C30 31 30 47 32 59",
      "M24 53 C28 50 36 50 40 53",
    ],
    numberY: 36,
  },
  molar: {
    shell:
      "M7 17 C9 8 22 4 31 10 C39 3 53 8 56 17 C62 25 56 37 55 44 C60 53 52 64 41 64 C36 70 30 70 26 64 C15 65 5 54 9 44 C7 37 1 25 7 17 Z",
    grooves: [
      "M21 20 C27 15 37 15 43 20",
      "M21 38 C27 34 37 34 43 38",
      "M32 18 C29 31 29 48 31 60",
      "M23 52 C27 49 36 49 41 53",
      "M23 28 L31 36 L41 27",
    ],
    numberY: 36,
  },
};

const TOOTH_COLORS = {
  normal: {
    fill: "#D9DADD",
    stroke: "#A9ADB4",
    text: "#151A21",
    groove: "#6B7280",
    highlight: "#FFFFFF",
  },
  selected: {
    fill: "#F97316",
    stroke: "#D75D0D",
    text: "#FFFFFF",
    groove: "#FFFFFF",
    highlight: "#FFF7ED",
  },
};

/**
 * Renderiza um dente anatômico simplificado em SVG com estado selecionável.
 */
export default function ToothShape({
  id,
  selected = false,
  variant = "anterior",
  size = 40,
}) {
  const colors = selected ? TOOTH_COLORS.selected : TOOTH_COLORS.normal;
  const tooth = TOOTH_VARIANTS[variant] || TOOTH_VARIANTS.anterior;
  const strokeOpacity = selected ? 0.34 : 0.22;

  return (
    <svg
      x={-size / 2}
      y={-(size * 72) / 64 / 2}
      width={size}
      height={(size * 72) / 64}
      viewBox="0 0 64 72"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={tooth.shell}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M21 14 C26 9 38 9 43 14"
        fill="none"
        stroke={colors.highlight}
        strokeLinecap="round"
        strokeWidth="3"
        strokeOpacity={selected ? 0.18 : 0.42}
      />
      {tooth.grooves.map((groove) => (
        <path
          key={groove}
          d={groove}
          fill="none"
          stroke={colors.groove}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          strokeOpacity={strokeOpacity}
        />
      ))}
      <text
        x="32"
        y={tooth.numberY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="800"
        fill={colors.text}
        paintOrder="stroke"
        stroke={selected ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.42)"}
        strokeWidth="1.4"
        style={{ userSelect: "none", pointerEvents: "none" }}
      >
        {id}
      </text>
    </svg>
  );
}

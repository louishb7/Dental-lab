import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { sortTeethByFdi } from "../../utils/odontogram.js";

const TEETH = [
  { id: "11", x: 190, y: 34, r: -5 },
  { id: "12", x: 151, y: 46, r: -18 },
  { id: "13", x: 118, y: 73, r: -34 },
  { id: "14", x: 94, y: 112, r: -49 },
  { id: "15", x: 80, y: 158, r: -66 },
  { id: "16", x: 76, y: 205, r: -84 },
  { id: "17", x: 80, y: 250, r: -101 },
  { id: "18", x: 91, y: 287, r: -117 },
  { id: "21", x: 230, y: 34, r: 5 },
  { id: "22", x: 269, y: 46, r: 18 },
  { id: "23", x: 302, y: 73, r: 34 },
  { id: "24", x: 326, y: 112, r: 49 },
  { id: "25", x: 340, y: 158, r: 66 },
  { id: "26", x: 344, y: 205, r: 84 },
  { id: "27", x: 340, y: 250, r: 101 },
  { id: "28", x: 329, y: 287, r: 117 },
  { id: "48", x: 91, y: 334, r: -63 },
  { id: "47", x: 80, y: 373, r: -80 },
  { id: "46", x: 76, y: 418, r: -96 },
  { id: "45", x: 80, y: 464, r: -112 },
  { id: "44", x: 96, y: 508, r: -130 },
  { id: "43", x: 123, y: 545, r: -148 },
  { id: "42", x: 157, y: 574, r: -164 },
  { id: "41", x: 194, y: 590, r: -176 },
  { id: "38", x: 329, y: 334, r: 63 },
  { id: "37", x: 340, y: 373, r: 80 },
  { id: "36", x: 344, y: 418, r: 96 },
  { id: "35", x: 340, y: 464, r: 112 },
  { id: "34", x: 324, y: 508, r: 130 },
  { id: "33", x: 297, y: 545, r: 148 },
  { id: "32", x: 263, y: 574, r: 164 },
  { id: "31", x: 226, y: 590, r: 176 },
];

const TOOTH_COLORS = {
  normal: {
    fill: "#D9DADD",
    stroke: "#A9ADB4",
    text: "#151A21",
    ridge: "#6B7280",
  },
  selecionado: {
    fill: "#F97316",
    stroke: "#D75D0D",
    text: "#FFFFFF",
    ridge: "#FFFFFF",
  },
};

function scaleForTooth(id) {
  const tooth = Number(id);
  const largeMolars = [18, 17, 28, 27, 48, 47, 38, 37];
  const premolars = [16, 15, 26, 25, 46, 45, 36, 35];
  const canines = [14, 24, 44, 34];
  const laterals = [13, 23, 43, 33];

  if (largeMolars.includes(tooth)) return "scale(1.28, 1.18)";
  if (premolars.includes(tooth)) return "scale(1.12, 1.08)";
  if (canines.includes(tooth)) return "scale(1.02)";
  if (laterals.includes(tooth)) return "scale(0.94)";
  return "scale(0.98)";
}

function Tooth({ tooth, selected, onToggle }) {
  const colors = selected ? TOOTH_COLORS.selecionado : TOOTH_COLORS.normal;

  return (
    <g
      className="odontogram-tooth"
      role="button"
      tabIndex="0"
      aria-label={`Dente ${tooth.id}`}
      transform={`translate(${tooth.x},${tooth.y}) rotate(${tooth.r})`}
      onClick={() => onToggle(tooth.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(tooth.id);
        }
      }}
    >
      <g transform={scaleForTooth(tooth.id)}>
        <path
          d="M0,-25 C13,-25 22,-17 22,-5 C22,8 15,19 7,24 C4,26 2,28 0,30 C-2,28 -4,26 -7,24 C-15,19 -22,8 -22,-5 C-22,-17 -13,-25 0,-25 Z"
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.4"
        />
        <path
          d="M-13,-16 C-8,-22 8,-22 13,-16"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={selected ? "0.2" : "0.42"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M-11,12 C-5,17 5,17 11,12"
          fill="none"
          stroke={colors.ridge}
          strokeOpacity={selected ? "0.3" : "0.18"}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line x1="-7" y1="-14" x2="-9" y2="20" stroke={colors.ridge} strokeOpacity={selected ? "0.32" : "0.2"} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="0" y1="-20" x2="0" y2="23" stroke={colors.ridge} strokeOpacity={selected ? "0.32" : "0.2"} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="-14" x2="9" y2="20" stroke={colors.ridge} strokeOpacity={selected ? "0.32" : "0.2"} strokeWidth="1.2" strokeLinecap="round" />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="700"
          fill={colors.text}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {tooth.id}
        </text>
      </g>
    </g>
  );
}

/**
 * Renderiza a arcada FDI em SVG e sincroniza a seleção com o formulário.
 */
export default function OdontogramSelector({
  selectedTeeth = [],
  onChange,
}) {
  const [selectedById, setSelectedById] = useState({});

  useEffect(() => {
    setSelectedById(
      selectedTeeth.reduce((nextSelected, tooth) => {
        nextSelected[tooth] = true;
        return nextSelected;
      }, {}),
    );
  }, [selectedTeeth]);

  const syncSelectedTeeth = useCallback((nextSelected) => {
    onChange(sortTeethByFdi(Object.keys(nextSelected).filter((tooth) => nextSelected[tooth])));
  }, [onChange]);

  const toggleTooth = useCallback((tooth) => {
    setSelectedById((currentSelected) => {
      const nextSelected = { ...currentSelected };

      if (nextSelected[tooth]) {
        delete nextSelected[tooth];
      } else {
        nextSelected[tooth] = true;
      }

      syncSelectedTeeth(nextSelected);
      return nextSelected;
    });
  }, [syncSelectedTeeth]);

  const clearSelection = useCallback(() => {
    setSelectedById({});
    onChange([]);
  }, [onChange]);

  const selectedItems = useMemo(
    () => sortTeethByFdi(Object.keys(selectedById).filter((tooth) => selectedById[tooth])),
    [selectedById],
  );

  return (
    <div className="odontogram-selector" role="group" aria-label="Selecionar dentes do caso">
      <svg
        className="odontogram-svg"
        viewBox="0 0 420 620"
        width="100%"
        style={{ display: "block", margin: "0 auto" }}
        xmlns="http://www.w3.org/2000/svg"
        pointerEvents="all"
        aria-hidden="false"
      >
        <rect className="odontogram-svg-bg" x="0" y="0" width="420" height="620" rx="18" />
        {TEETH.map((tooth) => (
          <Tooth
            key={tooth.id}
            tooth={tooth}
            selected={Boolean(selectedById[tooth.id])}
            onToggle={toggleTooth}
          />
        ))}
      </svg>

      <div className="odontogram-selection-bar">
        <span>Dentes selecionados:</span>
        <div className="odontogram-selection-list">
          {selectedItems.length ? (
            selectedItems.map((tooth) => (
              <button
                key={tooth}
                type="button"
                className="selected-tooth-badge selecionado"
                title={`Dente ${tooth}`}
                onClick={() => toggleTooth(tooth)}
              >
                {tooth}
              </button>
            ))
          ) : (
            <small>Nenhum dente selecionado.</small>
          )}
        </div>
        <button
          type="button"
          className="odontogram-clear"
          aria-label="Limpar seleção de dentes"
          disabled={!selectedItems.length}
          onClick={clearSelection}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

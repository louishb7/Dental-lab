import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { sortTeethByFdi } from "../../utils/odontogram.js";
import ToothShape from "./ToothShape.jsx";

const TEETH = [
  { id: "11", x: 190, y: 23, r: -5, variant: "anterior", size: 58 },
  { id: "12", x: 153, y: 35, r: -18, variant: "anterior", size: 54 },
  { id: "13", x: 122, y: 61, r: -33, variant: "canine", size: 58 },
  { id: "14", x: 98, y: 97, r: -48, variant: "premolar", size: 62 },
  { id: "15", x: 84, y: 138, r: -65, variant: "premolar", size: 62 },
  { id: "16", x: 80, y: 180, r: -83, variant: "molar", size: 68 },
  { id: "17", x: 83, y: 218, r: -100, variant: "molar", size: 68 },
  { id: "18", x: 94, y: 250, r: -115, variant: "molar", size: 64 },
  { id: "21", x: 230, y: 23, r: 5, variant: "anterior", size: 58 },
  { id: "22", x: 267, y: 35, r: 18, variant: "anterior", size: 54 },
  { id: "23", x: 298, y: 61, r: 33, variant: "canine", size: 58 },
  { id: "24", x: 322, y: 97, r: 48, variant: "premolar", size: 62 },
  { id: "25", x: 336, y: 138, r: 65, variant: "premolar", size: 62 },
  { id: "26", x: 340, y: 180, r: 83, variant: "molar", size: 68 },
  { id: "27", x: 337, y: 218, r: 100, variant: "molar", size: 68 },
  { id: "28", x: 326, y: 250, r: 115, variant: "molar", size: 64 },
  { id: "48", x: 94, y: 314, r: -65, variant: "molar", size: 64 },
  { id: "47", x: 83, y: 348, r: -82, variant: "molar", size: 68 },
  { id: "46", x: 80, y: 387, r: -98, variant: "molar", size: 68 },
  { id: "45", x: 84, y: 429, r: -115, variant: "premolar", size: 62 },
  { id: "44", x: 100, y: 468, r: -132, variant: "premolar", size: 62 },
  { id: "43", x: 128, y: 501, r: -150, variant: "canine", size: 58 },
  { id: "42", x: 162, y: 525, r: -164, variant: "anterior", size: 54 },
  { id: "41", x: 195, y: 537, r: -176, variant: "anterior", size: 54 },
  { id: "38", x: 326, y: 314, r: 65, variant: "molar", size: 64 },
  { id: "37", x: 337, y: 348, r: 82, variant: "molar", size: 68 },
  { id: "36", x: 340, y: 387, r: 98, variant: "molar", size: 68 },
  { id: "35", x: 336, y: 429, r: 115, variant: "premolar", size: 62 },
  { id: "34", x: 320, y: 468, r: 132, variant: "premolar", size: 62 },
  { id: "33", x: 292, y: 501, r: 150, variant: "canine", size: 58 },
  { id: "32", x: 258, y: 525, r: 164, variant: "anterior", size: 54 },
  { id: "31", x: 225, y: 537, r: 176, variant: "anterior", size: 54 },
];

function Tooth({ tooth, selected, onToggle }) {
  return (
    <g
      className="cursor-pointer transition-[filter] hover:brightness-110 focus:outline-none"
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
      <ToothShape
        id={tooth.id}
        selected={selected}
        variant={tooth.variant}
        size={tooth.size}
      />
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
    <div className="grid w-full max-w-full justify-items-center gap-2" role="group" aria-label="Selecionar dentes do caso">
      <svg
        className="block w-full max-h-[500px] overflow-visible"
        viewBox="0 0 420 550"
        width="100%"
        style={{ display: "block", margin: "0 auto" }}
        xmlns="http://www.w3.org/2000/svg"
        pointerEvents="all"
        aria-hidden="false"
      >
        <rect fill="var(--color-elevated-bg)" x="0" y="0" width="420" height="550" rx="18" />
        {TEETH.map((tooth) => (
          <Tooth
            key={tooth.id}
            tooth={tooth}
            selected={Boolean(selectedById[tooth.id])}
            onToggle={toggleTooth}
          />
        ))}
      </svg>

      <div className="grid min-h-11 w-full grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs font-semibold text-[var(--color-text)]">
        <span>Dentes selecionados:</span>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
          {selectedItems.length ? (
            selectedItems.map((tooth) => (
              <button
                key={tooth}
                type="button"
                className="min-h-6 min-w-8 rounded bg-primary px-2 text-[11px] font-extrabold text-primary-foreground"
                title={`Dente ${tooth}`}
                onClick={() => toggleTooth(tooth)}
              >
                {tooth}
              </button>
            ))
          ) : (
            <small className="text-[var(--color-text-muted)]">Nenhum dente selecionado.</small>
          )}
        </div>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] text-[var(--color-text-soft)] disabled:cursor-not-allowed disabled:opacity-40"
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

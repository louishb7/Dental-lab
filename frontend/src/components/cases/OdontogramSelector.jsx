import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { sortTeethByFdi } from "../../utils/odontogram.js";

const TOOTH_STATES = {
  normal: {
    label: "Não selecionado",
    next: "antagonista",
  },
  antagonista: {
    label: "Antagonista",
    next: "encerramento",
  },
  encerramento: {
    label: "Encerramento anatômico",
    next: "normal",
  },
};

const BASE_TEETH = [
  ["11", -5, "central", "upper"],
  ["12", -19, "central", "upper"],
  ["13", -34, "lateral", "upper"],
  ["14", -50, "canine", "upper"],
  ["15", -66, "premolar", "upper"],
  ["16", -82, "premolar", "upper"],
  ["17", -97, "molar", "upper"],
  ["18", -111, "molar", "upper"],
  ["48", -126, "molar", "lower"],
  ["47", -135, "molar", "lower"],
  ["46", -144, "premolar", "lower"],
  ["45", -153, "premolar", "lower"],
  ["44", -162, "canine", "lower"],
  ["43", -170, "lateral", "lower"],
  ["42", -176, "central", "lower"],
  ["41", -181, "front", "lower"],
  ["31", 181, "front", "lower"],
  ["32", 176, "central", "lower"],
  ["33", 170, "lateral", "lower"],
  ["34", 162, "canine", "lower"],
  ["35", 153, "premolar", "lower"],
  ["36", 144, "premolar", "lower"],
  ["37", 135, "molar", "lower"],
  ["38", 126, "molar", "lower"],
  ["28", 111, "molar", "upper"],
  ["27", 97, "molar", "upper"],
  ["26", 82, "premolar", "upper"],
  ["25", 66, "premolar", "upper"],
  ["24", 50, "canine", "upper"],
  ["23", 34, "lateral", "upper"],
  ["22", 19, "central", "upper"],
  ["21", 5, "central", "upper"],
];

const SIZE_BY_KIND = {
  molar: [46, 52],
  premolar: [38, 44],
  canine: [32, 40],
  lateral: [28, 36],
  central: [28, 34],
  front: [30, 36],
};

function getToothPosition(angleDegrees, kind) {
  const radians = (angleDegrees * Math.PI) / 180;
  const [width, height] = SIZE_BY_KIND[kind];

  return {
    "--tooth-x": `${50 + Math.sin(radians) * 37}%`,
    "--tooth-y": `${50 - Math.cos(radians) * 44}%`,
    "--tooth-rotate": `${angleDegrees}deg`,
    "--tooth-w": `${width}px`,
    "--tooth-h": `${height}px`,
  };
}

function ToothSvg() {
  const gradientId = useId();

  return (
    <svg className="tooth-shape" viewBox="0 0 30 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="7" y1="2" x2="24" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.58" stopColor="#e5e7eb" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <path
        className="tooth-shape-body"
        fill={`url(#${gradientId})`}
        d="M 15 2 C 24 2, 28 8, 28 16 C 28 26, 22 34, 15 38 C 8 34, 2 26, 2 16 C 2 8, 6 2, 15 2 Z"
      />
      <line className="tooth-ridge" x1="11" y1="6" x2="9" y2="32" />
      <line className="tooth-ridge" x1="15" y1="4" x2="15" y2="34" />
      <line className="tooth-ridge" x1="19" y1="6" x2="21" y2="32" />
    </svg>
  );
}

export default function OdontogramSelector({
  selectedTeeth = [],
  onChange,
}) {
  const teeth = useMemo(
    () => BASE_TEETH.map(([id, angle, kind, arcade]) => ({
      id,
      kind,
      angle,
      arcade,
      style: getToothPosition(angle, kind),
    })),
    [],
  );
  const [toothStates, setToothStates] = useState({});

  useEffect(() => {
    setToothStates((currentStates) => {
      const nextStates = {};
      selectedTeeth.forEach((tooth) => {
        nextStates[tooth] = currentStates[tooth] && currentStates[tooth] !== "normal"
          ? currentStates[tooth]
          : "antagonista";
      });
      return nextStates;
    });
  }, [selectedTeeth]);

  const syncSelectedTeeth = useCallback((nextStates) => {
    const activeTeeth = Object.entries(nextStates)
      .filter(([, state]) => state && state !== "normal")
      .map(([tooth]) => tooth);

    onChange(sortTeethByFdi(activeTeeth));
  }, [onChange]);

  const cycleTooth = useCallback((tooth) => {
    const currentState = toothStates[tooth] || "normal";
    const nextState = TOOTH_STATES[currentState].next;
    const nextStates = { ...toothStates };

    if (nextState === "normal") {
      delete nextStates[tooth];
    } else {
      nextStates[tooth] = nextState;
    }

    setToothStates(nextStates);
    syncSelectedTeeth(nextStates);
  }, [syncSelectedTeeth, toothStates]);

  const clearSelection = useCallback(() => {
    setToothStates({});
    onChange([]);
  }, [onChange]);

  const selectedItems = sortTeethByFdi(
    Object.entries(toothStates)
      .filter(([, state]) => state && state !== "normal")
      .map(([tooth]) => tooth),
  ).map((tooth) => ({
    tooth,
    state: toothStates[tooth],
    label: TOOTH_STATES[toothStates[tooth]].label,
  }));

  return (
    <div className="odontogram-selector" role="group" aria-label="Selecionar dentes do caso">
      <div className="odontogram-stage" aria-hidden="true" />

      <div className="odontogram-legend" aria-label="Legenda de estados">
        <span className="legend-title">Legenda</span>
        <span><i className="legend-dot encerramento" />Encerramento anatômico</span>
        <span><i className="legend-dot antagonista" />Antagonista</span>
      </div>

      {teeth.map((tooth) => {
        const state = toothStates[tooth.id] || "normal";

        return (
          <button
            key={tooth.id}
            type="button"
            className={`tooth-button ${tooth.kind} arc-${tooth.arcade} state-${state}`}
            style={tooth.style}
            aria-pressed={state !== "normal"}
            aria-label={`Dente ${tooth.id}: ${TOOTH_STATES[state].label}`}
            onClick={() => cycleTooth(tooth.id)}
          >
            <ToothSvg />
            <span>{tooth.id}</span>
          </button>
        );
      })}

      <div className="odontogram-selection-bar">
        <span>Dentes selecionados:</span>
        <div className="odontogram-selection-list">
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <button
                key={item.tooth}
                type="button"
                className={`selected-tooth-badge ${item.state}`}
                title={item.label}
                onClick={() => cycleTooth(item.tooth)}
              >
                {item.tooth}
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

import { ODONTOGRAM_ARCADES, sortTeethByFdi } from "../../utils/odontogram.js";

function getToothStyle(index, arcadeId) {
  const offset = index - 7.5;
  const lift = Math.abs(offset) * 2.7;
  const direction = arcadeId === "upper" ? 1 : -1;
  const rotateDirection = arcadeId === "upper" ? -2.2 : 2.2;

  return {
    "--tooth-y": `${direction * lift}px`,
    "--tooth-rotate": `${offset * rotateDirection}deg`,
  };
}

export default function OdontogramSelector({
  selectedTeeth = [],
  onChange,
}) {
  const selectedSet = new Set(sortTeethByFdi(selectedTeeth));

  function toggleTooth(tooth) {
    const nextTeeth = selectedSet.has(tooth)
      ? selectedTeeth.filter((item) => item !== tooth)
      : [...selectedTeeth, tooth];

    onChange(sortTeethByFdi(nextTeeth));
  }

  return (
    <div className="odontogram-selector" role="group" aria-label="Selecionar dentes do caso">
      {ODONTOGRAM_ARCADES.map((arcade) => (
        <section key={arcade.id} className={`odontogram-arcade ${arcade.id}`} aria-label={arcade.label}>
          <div className="odontogram-arcade-head">
            <strong>{arcade.label}</strong>
          </div>
          <div className="odontogram-grid">
            {arcade.teeth.map((tooth, index) => {
              const active = selectedSet.has(tooth);

              return (
                <button
                  key={tooth}
                  type="button"
                  className={[
                    "tooth-button",
                    active ? "selected" : "",
                    index === 7 ? "tooth-midline" : "",
                  ].filter(Boolean).join(" ")}
                  style={getToothStyle(index, arcade.id)}
                  aria-pressed={active}
                  onClick={() => toggleTooth(tooth)}
                >
                  {tooth}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

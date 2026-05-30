import { ODONTOGRAM_ARCADES, sortTeethByFdi } from "../../utils/odontogram.js";

function getToothStyle(index, arcadeId) {
  const startAngle = arcadeId === "upper" ? 200 : 160;
  const endAngle = arcadeId === "upper" ? 340 : 20;
  const angle = startAngle + ((endAngle - startAngle) * index) / 15;
  const radians = (angle * Math.PI) / 180;
  const radiusX = arcadeId === "upper" ? 35 : 34;
  const radiusY = arcadeId === "upper" ? 31 : 33;
  const centerY = arcadeId === "upper" ? 43 : 52;
  const x = 50 + Math.cos(radians) * radiusX;
  const y = centerY + Math.sin(radians) * radiusY;
  const rotation = angle + (arcadeId === "upper" ? 90 : -90);

  return {
    "--tooth-x": `${x}%`,
    "--tooth-y": `${y}%`,
    "--tooth-rotate": `${rotation}deg`,
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
      <div className="odontogram-stage" aria-hidden="true">
        <span className="odontogram-midline" />
        <span className="odontogram-center-wash" />
      </div>
      {ODONTOGRAM_ARCADES.map((arcade) =>
        arcade.teeth.map((tooth, index) => {
          const active = selectedSet.has(tooth);

          return (
            <button
              key={tooth}
              type="button"
              className={[
                "tooth-button",
                `tooth-${arcade.id}`,
                active ? "selected" : "",
              ].filter(Boolean).join(" ")}
              style={getToothStyle(index, arcade.id)}
              aria-pressed={active}
              aria-label={`Dente ${tooth}`}
              onClick={() => toggleTooth(tooth)}
            >
              <span>{tooth}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}

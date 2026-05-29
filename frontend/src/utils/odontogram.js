export const ODONTOGRAM_ARCADES = [
  {
    id: "upper",
    label: "Arcada superior",
    teeth: ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  },
  {
    id: "lower",
    label: "Arcada inferior",
    teeth: ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
  },
];

export const FDI_TOOTH_ORDER = ODONTOGRAM_ARCADES.flatMap((arcade) => arcade.teeth);

export function sortTeethByFdi(teeth) {
  const order = new Map(FDI_TOOTH_ORDER.map((tooth, index) => [tooth, index]));

  return [...new Set((Array.isArray(teeth) ? teeth : []).map((tooth) => String(tooth)))]
    .sort((left, right) => (order.get(left) ?? Number.MAX_SAFE_INTEGER) - (order.get(right) ?? Number.MAX_SAFE_INTEGER));
}

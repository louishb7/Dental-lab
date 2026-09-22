export function passwordRequirements(value) {
  return [
    { label: "5 ou mais letras", met: (value.match(/\p{L}/gu)?.length ?? 0) >= 5 },
    { label: "1 ou mais números", met: /\p{Nd}/u.test(value) },
  ];
}

export function validNewPassword(value) {
  return (
    passwordRequirements(value).every((requirement) => requirement.met) &&
    new TextEncoder().encode(value).length <= 72
  );
}

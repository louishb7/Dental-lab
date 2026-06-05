/**
 * Renders a labeled form control with optional helper text.
 *
 * @param {object} props Component props.
 * @param {string} props.label Field label.
 * @param {string} [props.helperText] Supporting copy for validation rules.
 * @param {string} [props.errorText] Validation feedback displayed below the field.
 * @param {React.ReactNode} props.children Form control content.
 * @returns {JSX.Element} Labeled field wrapper.
 */
export default function FormField({ label, helperText, errorText, children }) {
  return (
    <label className="form-field">
      {label}
      {children}
      {helperText ? <small className="form-hint">{helperText}</small> : null}
      {errorText ? <small className="form-error">{errorText}</small> : null}
    </label>
  );
}

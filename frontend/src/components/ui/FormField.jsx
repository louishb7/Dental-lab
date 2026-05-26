export default function FormField({ label, children }) {
  return (
    <label className="form-field">
      {label}
      {children}
    </label>
  );
}


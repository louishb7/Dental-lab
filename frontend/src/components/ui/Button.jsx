export default function Button({
  children,
  variant = "secondary",
  size = "md",
  iconOnly = false,
  className = "",
  ...props
}) {
  const classes = [
    "button",
    `button-${variant}`,
    size === "sm" ? "button-sm" : "",
    iconOnly ? "icon-button" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  );
}


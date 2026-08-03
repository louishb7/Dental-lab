/**
 * Renders a simple tooth icon for the product brand mark.
 */
export default function ToothIcon({ size = 22, strokeWidth = 1.9, className = "", ...props }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8.2 4.3c-1.8 0-3.4 1-4 2.7-.6 1.5-.5 3.3 0 4.8.5 1.6 1.4 2.8 2.2 4 .8 1.2 1.3 2.7 1.6 4.3.2 1 .3 2.1.7 2.8.3.5.7.8 1.2.8.6 0 1-.4 1.2-.9.2-.6.4-1.3.5-2.1.2-.9.6-1.8 1.6-1.8s1.4.9 1.6 1.8c.1.8.3 1.5.5 2.1.2.5.6.9 1.2.9.5 0 .9-.3 1.2-.8.4-.7.5-1.8.7-2.8.3-1.6.8-3.1 1.6-4.3.8-1.2 1.7-2.4 2.2-4 .5-1.5.6-3.3 0-4.8-.6-1.7-2.2-2.7-4-2.7-1.7 0-2.8.9-4.1 2.1-.3.3-.7.3-1 0-1.3-1.2-2.4-2.1-4.1-2.1Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10.5c.7.7 1.4 1.1 2.5 1.1s1.8-.4 2.5-1.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

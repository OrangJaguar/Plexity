export default function VeridianSwitch({
  checked,
  onChange,
  disabled,
  id,
  'aria-label': ariaLabel,
  className = '',
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`veridian-switch${checked ? ' on' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="veridian-switch-thumb" />
    </button>
  );
}

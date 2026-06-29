export default function AppSwitch({
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
      className={`app-switch${checked ? ' on' : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="app-switch-thumb" />
    </button>
  );
}

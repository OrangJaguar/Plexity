export default function VeridianCheckbox({
  checked,
  onChange,
  disabled,
  id,
  children,
  className = '',
}) {
  return (
    <label className={`veridian-checkbox${className ? ` ${className}` : ''}`}>
      <input
        type="checkbox"
        id={id}
        className="veridian-native-input"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="veridian-checkbox-box" aria-hidden="true" />
      {children != null && <span className="veridian-checkbox-label">{children}</span>}
    </label>
  );
}

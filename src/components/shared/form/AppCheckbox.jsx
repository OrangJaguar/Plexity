export default function AppCheckbox({
  checked,
  onChange,
  disabled,
  id,
  children,
  className = '',
}) {
  return (
    <label className={`app-checkbox${className ? ` ${className}` : ''}`}>
      <input
        type="checkbox"
        id={id}
        className="app-native-input"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="app-checkbox-box" aria-hidden="true" />
      {children != null && <span className="app-checkbox-label">{children}</span>}
    </label>
  );
}

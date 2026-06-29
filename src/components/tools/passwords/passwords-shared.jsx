import { useState } from 'react';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generatePassphrase, generatePassword } from '@/lib/tools/passwords/password-generator';

export async function copyToClipboard(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    setTimeout(() => {
      void navigator.clipboard.writeText('').catch(() => {});
    }, 30_000);
  } catch {
    toast.error('Could not copy to clipboard');
  }
}

export function VaultField({ label, hint, children, className = '' }) {
  return (
    <label className={`vault-field ${className}`.trim()}>
      <span className="vault-field-label">{label}</span>
      {hint ? <span className="vault-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function VaultInput(props) {
  return <input className="vault-input" {...props} />;
}

export function VaultTextarea(props) {
  return <textarea className="vault-textarea" rows={3} {...props} />;
}

export function VaultBtn({ variant = 'default', size = 'md', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`vault-btn vault-btn--${variant} vault-btn--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecretField({
  label,
  value,
  onChange,
  readOnly = false,
  onCopy,
  multiline = false,
}) {
  const [revealed, setRevealed] = useState(false);
  const Input = multiline ? 'textarea' : 'input';
  const displayValue = revealed || !value ? (value || '') : '••••••••••••';

  return (
    <div className="vault-secret-field">
      <div className="vault-secret-field-head">
        <span className="vault-secret-field-label">{label}</span>
        <div className="vault-secret-field-actions">
          {value ? (
            <>
              <button type="button" className="vault-icon-btn" onClick={() => setRevealed((v) => !v)} aria-label={revealed ? 'Hide' : 'Reveal'}>
                {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                className="vault-icon-btn"
                onClick={() => (onCopy ? onCopy(value) : copyToClipboard(value, `${label} copied`))}
                aria-label={`Copy ${label}`}
              >
                <Copy size={15} />
              </button>
            </>
          ) : null}
        </div>
      </div>
      {readOnly ? (
        <div className={`vault-secret-readonly ${revealed ? 'is-revealed' : ''}`}>
          {displayValue || '—'}
        </div>
      ) : (
        <Input
          className={multiline ? 'vault-textarea' : 'vault-input'}
          type={multiline ? undefined : (revealed ? 'text' : 'password')}
          value={value}
          onChange={onChange}
          rows={multiline ? 3 : undefined}
        />
      )}
    </div>
  );
}

export function PasswordGeneratorPanel({ onApply }) {
  const [mode, setMode] = useState('password');
  const [length, setLength] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [preview, setPreview] = useState(() => generatePassword({ length: 20, symbols: true }));

  const regenerate = () => {
    setPreview(mode === 'passphrase'
      ? generatePassphrase()
      : generatePassword({ length, symbols }));
  };

  return (
    <div className="vault-generator">
      <div className="vault-generator-modes">
        <button type="button" className={mode === 'password' ? 'is-active' : ''} onClick={() => setMode('password')}>Random</button>
        <button type="button" className={mode === 'passphrase' ? 'is-active' : ''} onClick={() => setMode('passphrase')}>Passphrase</button>
      </div>
      {mode === 'password' ? (
        <div className="vault-generator-options">
          <label>
            Length
            <input type="range" min={12} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} />
            <span>{length}</span>
          </label>
          <label className="vault-generator-check">
            <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} />
            Symbols
          </label>
        </div>
      ) : null}
      <div className="vault-generator-preview">{preview}</div>
      <div className="vault-generator-actions">
        <VaultBtn variant="ghost" size="sm" onClick={regenerate}>
          <RefreshCw size={14} />
          Regenerate
        </VaultBtn>
        <VaultBtn variant="primary" size="sm" onClick={() => onApply?.(preview)}>
          Use password
        </VaultBtn>
      </div>
    </div>
  );
}

export function VaultTrustBanner() {
  return (
    <div className="vault-trust-banner">
      <strong>Encrypted on your device</strong>
      <p>Credentials are encrypted before storage. Veridian syncs encrypted data only — we cannot read your vault contents.</p>
    </div>
  );
}

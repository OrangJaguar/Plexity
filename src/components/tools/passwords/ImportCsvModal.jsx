import { useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import VeridianCheckbox from '@/components/shared/form/VeridianCheckbox';
import { VaultBtn } from '@/components/tools/passwords/passwords-shared';
import { mapCsvRowToCredential, parseCredentialCsv } from '@/lib/tools/passwords/passwords-model';

export default function ImportCsvModal({ open, onClose, onImport }) {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  const parsed = useMemo(() => parseCredentialCsv(text), [text]);
  const rows = parsed.rows;

  if (!open) return null;

  const toggle = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(rows.map((_, i) => i)));

  const submit = () => {
    const creds = rows
      .filter((_, i) => selected.has(i))
      .map((row) => mapCsvRowToCredential(row));
    onImport(creds);
    onClose();
    setText('');
    setSelected(new Set());
  };

  return (
    <div className="vault-modal-backdrop" onClick={onClose} role="presentation">
      <div className="vault-modal vault-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="vault-modal-head">
          <h2>Import from CSV</h2>
          <button type="button" className="vault-icon-btn" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="vault-modal-body">
          <p className="vault-import-lead">Paste an export from Chrome, Bitwarden, 1Password, or similar. Review before importing.</p>
          <textarea
            className="vault-textarea vault-import-paste"
            value={text}
            onChange={(e) => { setText(e.target.value); setSelected(new Set()); }}
            placeholder="title,url,username,password,notes…"
            rows={5}
          />
          {rows.length > 0 ? (
            <>
              <div className="vault-import-toolbar">
                <span>{rows.length} rows detected</span>
                <VaultBtn variant="ghost" size="sm" onClick={selectAll}>Select all</VaultBtn>
              </div>
              <ul className="vault-import-preview">
                {rows.slice(0, 20).map((row, idx) => {
                  const title = row.title || row.name || row.login || `Row ${idx + 1}`;
                  return (
                    <li key={idx}>
                      <VeridianCheckbox
                        checked={selected.has(idx)}
                        onChange={() => toggle(idx)}
                      >
                        {title}
                      </VeridianCheckbox>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
        <footer className="vault-modal-footer">
          <VaultBtn variant="ghost" onClick={onClose}>Cancel</VaultBtn>
          <VaultBtn variant="primary" onClick={submit} disabled={selected.size === 0}>
            <Upload size={14} />
            Import {selected.size || ''} entries
          </VaultBtn>
        </footer>
      </div>
    </div>
  );
}

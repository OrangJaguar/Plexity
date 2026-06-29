import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  PasswordGeneratorPanel,
  VaultBtn,
  VaultField,
  VaultInput,
  VaultTextarea,
} from '@/components/tools/passwords/passwords-shared';
import { LOGIN_TYPES, newCredential } from '@/lib/tools/passwords/passwords-model';

export default function CredentialFormModal({
  open,
  onClose,
  onSave,
  folders,
  initial,
}) {
  const [draft, setDraft] = useState(() => initial || newCredential());
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    if (open) setDraft(initial || newCredential());
  }, [open, initial]);

  if (!open) return null;

  const patch = (fields) => setDraft((d) => ({ ...d, ...fields, updatedAt: Date.now() }));

  const submit = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onSave(draft);
    onClose();
  };

  return (
    <div className="vault-modal-backdrop" onClick={onClose} role="presentation">
      <div className="vault-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="vault-modal-head">
          <h2>{initial ? 'Edit credential' : 'Add credential'}</h2>
          <button type="button" className="vault-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <form className="vault-modal-body" onSubmit={submit}>
          <VaultField label="Title" hint="Service or account name">
            <VaultInput value={draft.title} onChange={(e) => patch({ title: e.target.value })} required autoFocus />
          </VaultField>
          <VaultField label="Website / app URL">
            <VaultInput value={draft.url} onChange={(e) => patch({ url: e.target.value })} placeholder="https://…" />
          </VaultField>
          <div className="vault-field-grid">
            <VaultField label="Email">
              <VaultInput value={draft.email} onChange={(e) => patch({ email: e.target.value })} />
            </VaultField>
            <VaultField label="Username">
              <VaultInput value={draft.username} onChange={(e) => patch({ username: e.target.value })} />
            </VaultField>
          </div>
          <VaultField label="Phone">
            <VaultInput value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
          </VaultField>
          <VaultField label="Primary login type">
            <select
              className="vault-input"
              value={draft.primaryLoginType}
              onChange={(e) => patch({ primaryLoginType: e.target.value })}
            >
              {LOGIN_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </VaultField>
          <VaultField label="Password">
            <div className="vault-password-row">
              <VaultInput
                type="password"
                value={draft.password}
                onChange={(e) => patch({ password: e.target.value })}
              />
              <VaultBtn variant="ghost" size="sm" type="button" onClick={() => setShowGenerator((v) => !v)}>
                Generate
              </VaultBtn>
            </div>
          </VaultField>
          {showGenerator ? (
            <PasswordGeneratorPanel onApply={(pw) => { patch({ password: pw }); setShowGenerator(false); }} />
          ) : null}
          <VaultField label="Folder">
            <select className="vault-input" value={draft.folderId} onChange={(e) => patch({ folderId: e.target.value })}>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </VaultField>
          <VaultField label="Tags" hint="Comma separated">
            <VaultInput
              value={draft.tags.join(', ')}
              onChange={(e) => patch({ tags: e.target.value.split(/[,]/).map((t) => t.trim()).filter(Boolean) })}
            />
          </VaultField>
          <VaultField label="Secure notes">
            <VaultTextarea value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </VaultField>
          <footer className="vault-modal-footer">
            <VaultBtn variant="ghost" type="button" onClick={onClose}>Cancel</VaultBtn>
            <VaultBtn variant="primary" type="submit">Save</VaultBtn>
          </footer>
        </form>
      </div>
    </div>
  );
}

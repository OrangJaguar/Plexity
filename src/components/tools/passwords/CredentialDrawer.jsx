import {
  ExternalLink, Star, Trash2, X,
} from 'lucide-react';
import {
  SecretField,
  VaultBtn,
  copyToClipboard,
} from '@/components/tools/passwords/passwords-shared';
import { LOGIN_TYPES, primaryLoginPreview } from '@/lib/tools/passwords/passwords-model';

export default function CredentialDrawer({
  credential,
  folders,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onMarkUsed,
}) {
  if (!credential) return null;
  const folder = folders.find((f) => f.id === credential.folderId);

  return (
    <aside className="vault-drawer">
      <header className="vault-drawer-head">
        <div>
          <h2>{credential.title}</h2>
          {folder ? <span className="vault-drawer-folder">{folder.name}</span> : null}
        </div>
        <div className="vault-drawer-head-actions">
          <button
            type="button"
            className={`vault-icon-btn ${credential.favorite ? 'is-active' : ''}`}
            onClick={() => onToggleFavorite(credential.id)}
            aria-label="Favorite"
          >
            <Star size={16} />
          </button>
          <button type="button" className="vault-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="vault-drawer-body">
        {credential.url ? (
          <a
            href={credential.url.startsWith('http') ? credential.url : `https://${credential.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="vault-drawer-url"
          >
            <ExternalLink size={14} />
            Open website
          </a>
        ) : null}

        <div className="vault-drawer-login-preview">
          <span>Primary login</span>
          <strong>{primaryLoginPreview(credential)}</strong>
          <em>{LOGIN_TYPES.find((t) => t.id === credential.primaryLoginType)?.label}</em>
        </div>

        <SecretField label="Email" value={credential.email} readOnly onCopy={(v) => { copyToClipboard(v, 'Email copied'); onMarkUsed?.(); }} />
        <SecretField label="Username" value={credential.username} readOnly onCopy={(v) => { copyToClipboard(v, 'Username copied'); onMarkUsed?.(); }} />
        <SecretField label="Phone" value={credential.phone} readOnly onCopy={(v) => { copyToClipboard(v, 'Phone copied'); onMarkUsed?.(); }} />
        <SecretField label="Password" value={credential.password} readOnly onCopy={(v) => { copyToClipboard(v, 'Password copied'); onMarkUsed?.(); }} />
        <SecretField label="Secure notes" value={credential.notes} readOnly multiline />

        {credential.tags?.length ? (
          <div className="vault-drawer-tags">
            {credential.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        ) : null}

        <p className="vault-drawer-meta">
          Updated {new Date(credential.updatedAt).toLocaleDateString()}
          {credential.lastUsedAt ? ` · Last used ${new Date(credential.lastUsedAt).toLocaleDateString()}` : ''}
        </p>
      </div>

      <footer className="vault-drawer-footer">
        <VaultBtn variant="ghost" size="sm" onClick={() => onEdit(credential)}>
          Edit
        </VaultBtn>
        <VaultBtn variant="ghost" size="sm" onClick={() => onDelete(credential.id)}>
          <Trash2 size={14} />
          Delete
        </VaultBtn>
      </footer>
    </aside>
  );
}

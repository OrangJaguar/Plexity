import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy, Download, Lock, Plus, Search, Shield, Star, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import CredentialDrawer from '@/components/tools/passwords/CredentialDrawer';
import CredentialFormModal from '@/components/tools/passwords/CredentialFormModal';
import ImportCsvModal from '@/components/tools/passwords/ImportCsvModal';
import PasswordHealthPanel from '@/components/tools/passwords/PasswordHealthPanel';
import { VaultBtn, copyToClipboard } from '@/components/tools/passwords/passwords-shared';
import {
  credentialsToCsv,
  filterCredentials,
  newCredential,
  passwordHealthReport,
  primaryLoginPreview,
} from '@/lib/tools/passwords/passwords-model';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';

export default function PasswordsWorkspace({
  vaultData,
  envelope,
  onUpdateVault,
  onPersist,
  onLock,
  touchActivity,
}) {
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [healthFilter, setHealthFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editCred, setEditCred] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [saveState, setSaveState] = useState('saved');
  const saveTimer = useRef(null);
  const { action, clearAction } = useCommandBarDraft('action');

  const credentials = vaultData.credentials;
  const folders = vaultData.folders;
  const health = passwordHealthReport(credentials);

  const filtered = useMemo(() => {
    let list = filterCredentials(credentials, {
      search,
      folderId: folderFilter,
      favoritesOnly,
    });
    if (healthFilter && health[healthFilter]?.length) {
      const set = new Set(health[healthFilter]);
      list = list.filter((c) => set.has(c.id));
    }
    return list;
  }, [credentials, search, folderFilter, favoritesOnly, healthFilter, health]);

  const selected = credentials.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    if (!action) return;
    if (action.actionId === 'searchVault') {
      setSearch(action.payload?.query || '');
      clearAction();
    }
    if (action.actionId === 'addCredential') {
      setEditCred(newCredential({ title: action.payload?.label || '' }));
      setFormOpen(true);
      clearAction();
    }
  }, [action, clearAction]);

  const schedulePersist = useCallback((nextData) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void onPersist(nextData)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 600);
  }, [onPersist]);

  const mutateVault = useCallback((updater) => {
    onUpdateVault((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      schedulePersist(next);
      return next;
    });
    touchActivity();
  }, [onUpdateVault, schedulePersist, touchActivity]);

  const saveCredential = (cred) => {
    mutateVault((prev) => {
      const exists = prev.credentials.some((c) => c.id === cred.id);
      const credentialsNext = exists
        ? prev.credentials.map((c) => (c.id === cred.id ? cred : c))
        : [cred, ...prev.credentials];
      return { ...prev, credentials: credentialsNext };
    });
    setSelectedId(cred.id);
  };

  const deleteCredential = (id) => {
    mutateVault((prev) => ({
      ...prev,
      credentials: prev.credentials.filter((c) => c.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleFavorite = (id) => {
    mutateVault((prev) => ({
      ...prev,
      credentials: prev.credentials.map((c) => (
        c.id === id ? { ...c, favorite: !c.favorite, updatedAt: Date.now() } : c
      )),
    }));
  };

  const markUsed = (id) => {
    mutateVault((prev) => ({
      ...prev,
      credentials: prev.credentials.map((c) => (
        c.id === id ? { ...c, lastUsedAt: Date.now() } : c
      )),
    }));
  };

  const exportVault = () => {
    const csv = credentialsToCsv(credentials);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veridian-vault-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export started — store this file securely');
  };

  return (
    <div className="vault-workspace" onMouseMove={touchActivity} onKeyDown={touchActivity}>
      <header className="vault-workspace-head">
        <div className="vault-workspace-title">
          <Shield size={20} aria-hidden />
          <div>
            <h1>Passwords</h1>
            <p>Encrypted vault · {credentials.length} {credentials.length === 1 ? 'entry' : 'entries'}</p>
          </div>
        </div>
        <div className="vault-workspace-actions">
          <span className={`vault-save-pill vault-save-pill--${saveState}`}>
            {saveState === 'saving' ? 'Encrypting…' : saveState === 'error' ? 'Save failed' : 'Secured'}
          </span>
          <VaultBtn variant="ghost" size="sm" onClick={exportVault}>
            <Download size={14} />
            Export
          </VaultBtn>
          <VaultBtn variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            <Upload size={14} />
            Import
          </VaultBtn>
          <VaultBtn variant="primary" size="sm" onClick={() => { setEditCred(null); setFormOpen(true); }}>
            <Plus size={14} />
            Add
          </VaultBtn>
          <VaultBtn variant="ghost" size="sm" onClick={onLock}>
            <Lock size={14} />
            Lock
          </VaultBtn>
        </div>
      </header>

      <div className="vault-search-row">
        <Search size={16} aria-hidden />
        <input
          className="vault-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search credentials…"
        />
      </div>

      <div className="vault-filter-row">
        <button type="button" className={`vault-filter-chip ${!folderFilter && !favoritesOnly ? 'is-active' : ''}`} onClick={() => { setFolderFilter(''); setFavoritesOnly(false); }}>
          All
        </button>
        <button type="button" className={`vault-filter-chip ${favoritesOnly ? 'is-active' : ''}`} onClick={() => setFavoritesOnly((v) => !v)}>
          <Star size={12} />
          Favorites
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`vault-filter-chip ${folderFilter === f.id ? 'is-active' : ''}`}
            onClick={() => setFolderFilter(folderFilter === f.id ? '' : f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>

      <PasswordHealthPanel
        credentials={credentials}
        activeFilter={healthFilter}
        onFilter={setHealthFilter}
        onSelectId={(id) => setSelectedId(id)}
      />

      <div className={`vault-main ${selected ? 'has-drawer' : ''}`}>
        <div className="vault-list-wrap">
          {filtered.length === 0 ? (
            <div className="vault-empty">
              <h3>{credentials.length ? 'No matches' : 'Your vault is ready'}</h3>
              <p>
                {credentials.length
                  ? 'Try a different search or filter.'
                  : 'Add your first credential or import from another password manager.'}
              </p>
              {!credentials.length ? (
                <div className="vault-empty-actions">
                  <VaultBtn variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                    <Plus size={14} />
                    Add credential
                  </VaultBtn>
                  <VaultBtn variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
                    <Upload size={14} />
                    Import CSV
                  </VaultBtn>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="vault-cred-list">
              {filtered.map((cred) => (
                <li key={cred.id}>
                  <button
                    type="button"
                    className={`vault-cred-row ${selectedId === cred.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(cred.id)}
                  >
                    <div className="vault-cred-row-main">
                      <strong>{cred.title}</strong>
                      <span>{primaryLoginPreview(cred)}</span>
                    </div>
                    <div className="vault-cred-row-actions">
                      {cred.favorite ? <Star size={13} className="vault-cred-star" /> : null}
                      <button
                        type="button"
                        className="vault-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const login = primaryLoginPreview(cred);
                          if (login && login !== '—') copyToClipboard(login, 'Login copied');
                        }}
                        aria-label="Copy login"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        className="vault-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cred.password) {
                            copyToClipboard(cred.password, 'Password copied');
                            markUsed(cred.id);
                          }
                        }}
                        aria-label="Copy password"
                      >
                        <Lock size={14} />
                      </button>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <CredentialDrawer
          credential={selected}
          folders={folders}
          onClose={() => setSelectedId(null)}
          onEdit={(c) => { setEditCred(c); setFormOpen(true); }}
          onDelete={deleteCredential}
          onToggleFavorite={toggleFavorite}
          onMarkUsed={() => selected && markUsed(selected.id)}
        />
      </div>

      <CredentialFormModal
        open={formOpen}
        initial={editCred}
        folders={folders}
        onClose={() => { setFormOpen(false); setEditCred(null); }}
        onSave={saveCredential}
      />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(imported) => {
          mutateVault((prev) => ({
            ...prev,
            credentials: [...imported, ...prev.credentials],
          }));
          toast.success(`Imported ${imported.length} credentials`);
        }}
      />

      <footer className="vault-workspace-footer">
        <p>
          Zero-knowledge vault · encrypted client-side · auto-locks after {vaultData.settings?.autoLockMinutes ?? 5} min idle
        </p>
      </footer>
    </div>
  );
}
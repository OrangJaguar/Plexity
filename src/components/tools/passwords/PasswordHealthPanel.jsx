import { passwordHealthReport } from '@/lib/tools/passwords/passwords-model';

export default function PasswordHealthPanel({ credentials, onSelectId, activeFilter, onFilter }) {
  const health = passwordHealthReport(credentials);

  const items = [
    { id: 'reused', label: 'Reused passwords', count: health.reused.length, hint: 'Same password on multiple accounts' },
    { id: 'weak', label: 'Weak passwords', count: health.weak.length, hint: 'Under 12 characters or simple patterns' },
    { id: 'stale', label: 'Not updated in a year', count: health.stale.length, hint: 'May need a refresh' },
    { id: 'incomplete', label: 'Incomplete records', count: health.incomplete.length, hint: 'Missing login or password' },
  ];

  if (!credentials.length) return null;

  return (
    <section className="vault-health-panel">
      <header>
        <h3>Vault health</h3>
        <p>Calm signals to strengthen your vault over time — not guilt trips.</p>
      </header>
      <div className="vault-health-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`vault-health-card ${activeFilter === item.id ? 'is-active' : ''} ${item.count ? 'has-issues' : ''}`}
            onClick={() => onFilter(activeFilter === item.id ? '' : item.id)}
          >
            <strong>{item.count}</strong>
            <span>{item.label}</span>
            <em>{item.hint}</em>
          </button>
        ))}
      </div>
      {activeFilter && health[activeFilter]?.length ? (
        <ul className="vault-health-list">
          {health[activeFilter].map((id) => {
            const cred = credentials.find((c) => c.id === id);
            if (!cred) return null;
            return (
              <li key={id}>
                <button type="button" onClick={() => onSelectId(id)}>{cred.title}</button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

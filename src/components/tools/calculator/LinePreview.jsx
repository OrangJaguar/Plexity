export default function LinePreview({ color, kind = 'curve', visible = true, onClick }) {
  return (
    <button
      type="button"
      className={`calc-line-preview ${visible ? '' : 'is-dimmed'}`}
      onClick={onClick}
      aria-label={visible ? 'Hide graph' : 'Show graph'}
      style={{ '--preview-color': color }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
        {kind === 'point' ? (
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        ) : kind === 'table' ? (
          <>
            <line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="7" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.5" />
          </>
        ) : (
          <path
            d="M5 14 C 7 8, 9 18, 12 10 S 17 6, 19 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

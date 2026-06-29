const FACES = {
  great: (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 10c.6-.6 1.4-.9 2.2-.9s1.6.3 2.2.9" />
    <path d="M15.6 10c.6-.6 1.4-.9 2.2-.9" />
    <path d="M8.5 15.5c1.4 1.2 3.1 1.8 4.9 1.8s3.5-.6 4.9-1.8" />
  </>
  ),
  good: (
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <path d="M8.5 15c1.4 1 3.1 1.5 4.9 1.5s3.5-.5 4.9-1.5" />
  </>
  ),
  neutral: (
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <path d="M9 15.5h6" />
  </>
  ),
  rough: (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 9.5c.5.5 1.2.8 1.9.8" />
    <path d="M15.6 9.5c.5.5 1.2.8 1.9.8" />
    <path d="M9 16.5c1.2-.9 2.6-1.4 4.1-1.4s2.9.5 4.1 1.4" />
  </>
  ),
  bad: (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 9.5c.5-.4 1.1-.6 1.8-.6" />
    <path d="M15.7 9.5c.5-.4 1.1-.6 1.8-.6" />
    <path d="M9.5 17c1.1-1.4 2.6-2.1 4.2-2.1s3.1.7 4.2 2.1" />
  </>
  ),
};

export default function JournalMoodIcon({ mood, size = 22, className = '' }) {
  const face = FACES[mood];
  if (!face) return null;
  return (
    <svg
      className={`tools-journal-mood-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {face}
    </svg>
  );
}

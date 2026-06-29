import { useCallback, useRef, useState } from 'react';
import { hashJournalPin } from '@/lib/tools/journal-text';

const SESSION_KEY = 'journal-pin-unlocked';

export function isJournalUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function setJournalUnlocked() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export default function JournalPinGate({ pinHash, onUnlock }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputsRef = useRef([]);

  const tryUnlock = useCallback((nextDigits) => {
    const pin = nextDigits.join('');
    if (pin.length !== 4) return;
    if (hashJournalPin(pin) === pinHash) {
      setJournalUnlocked();
      setError('');
      onUnlock?.();
      return;
    }
    setError('Incorrect PIN');
    setDigits(['', '', '', '']);
    inputsRef.current[0]?.focus();
  }, [pinHash, onUnlock]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
    if (next.every((d) => d)) {
      tryUnlock(next);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="tools-journal-pin-gate">
      <div className="tools-journal-pin-card">
        <h3>Journal locked</h3>
        <p>Enter your 4-digit PIN to open today&apos;s journal.</p>
        <div className="tools-journal-pin-inputs">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputsRef.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              className="tools-journal-pin-digit"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              aria-label={`PIN digit ${index + 1}`}
            />
          ))}
        </div>
        {error ? <p className="tools-journal-pin-error">{error}</p> : null}
      </div>
    </div>
  );
}

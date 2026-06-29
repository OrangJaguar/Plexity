const SKIP_STACK_PATTERNS = [
  /node_modules/i,
  /chrome-extension/i,
  /moz-extension/i,
  /@vite/i,
  /webpack/i,
];

function normalizeMessage(message = '') {
  return String(message)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/\b\d+\b/g, '<n>')
    .trim()
    .slice(0, 500);
}

function topStackFrame(stack = '') {
  const lines = String(stack).split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (SKIP_STACK_PATTERNS.some((p) => p.test(line))) continue;
    if (line.startsWith('at ') || line.includes('@')) return line.slice(0, 300);
  }
  return lines[0]?.slice(0, 300) ?? '';
}

/** Simple stable hash for grouping (djb2). */
function hashString(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash &= 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}

export function fingerprintError(message, stack = '') {
  const normalized = normalizeMessage(message);
  const frame = topStackFrame(stack);
  const key = `${normalized}::${frame}`;
  return hashString(key);
}

export { normalizeMessage, topStackFrame };

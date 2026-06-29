export function parseCmdTimeString(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

export function formatCmdLocaleTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatCountdown(totalSeconds) {
  const secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatAgendaDateTime(date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

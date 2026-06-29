function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function computeNextDueDate(due, rule) {
  if (!rule?.type || rule.type === 'none') return null;
  const base = due ? new Date(due) : new Date();
  switch (rule.type) {
    case 'daily':
      return addDays(base, 1).toISOString();
    case 'weekly':
      return addDays(base, 7).toISOString();
    case 'weekdays': {
      let d = addDays(base, 1);
      while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
      return d.toISOString();
    }
    case 'interval':
      return addDays(base, 7 * (rule.intervalWeeks || 1)).toISOString();
    case 'custom':
      if (!rule.repeatDays?.length) return addDays(base, 7).toISOString();
      for (let i = 1; i <= 14; i++) {
        const d = addDays(base, i);
        if (rule.repeatDays.includes(d.getDay())) return d.toISOString();
      }
      return addDays(base, 7).toISOString();
    default:
      return null;
  }
}

export function spawnNextRecurrenceTask(completedTask) {
  const rule = completedTask.recurrenceRule;
  const nextDue = computeNextDueDate(completedTask.due, rule);
  if (!nextDue) return null;
  return {
    taskId: crypto.randomUUID(),
    title: completedTask.title,
    due: nextDue,
    priority: completedTask.priority || 'medium',
    className: completedTask.className || '',
    notes: completedTask.notes || '',
    estimatedMinutes: completedTask.estimatedMinutes,
    subtasks: (completedTask.subtasks || []).map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      completed: false,
    })),
    recurrenceRule: completedTask.recurrenceRule,
    recurrenceParentId: completedTask.recurrenceParentId || completedTask.taskId,
    completed: false,
    type: 'task',
  };
}

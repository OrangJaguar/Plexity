import {
  parseSlashCommand,
  formatEventPreview,
  formatTaskPreview,
} from '@/lib/tools/command-parser';
import { answerQueryLocally } from '@/lib/tools/command-query';
import { executeSlashCommand, parseSlashPrefix } from '@/lib/tools/command-registry';

function buildConfirmResult(local) {
  if (local.intent === 'create_events' && local.events?.length) {
    return {
      type: 'confirm',
      intent: 'create_events',
      events: local.events,
      preview: local.events.map(formatEventPreview).join('\n'),
      source: 'local',
    };
  }
  if (local.intent === 'create_task' && local.task?.title) {
    return {
      type: 'confirm',
      intent: 'create_task',
      task: local.task,
      preview: formatTaskPreview(local.task),
      source: 'local',
    };
  }
  return null;
}

/**
 * @param {string} text
 * @param {{ tasks, events, schedule, pageContext?, signal?: AbortSignal }} ctx
 */
export async function runCommandAssistant(text, ctx) {
  const { commandId } = parseSlashPrefix(text);
  if (commandId) {
    const slash = executeSlashCommand(commandId, parseSlashPrefix(text).remainder, ctx);
    if (slash) return slash;
  }

  const local = parseSlashCommand(text);

  if (local.confidence === 'high' && local.intent === 'query') {
    const { answer } = answerQueryLocally(local.query, ctx);
    return { type: 'answer', answer, source: 'local' };
  }

  const confirm = buildConfirmResult(local);
  if (confirm && local.confidence === 'high') return confirm;

  const lowConfirm = buildConfirmResult(local);
  if (lowConfirm && local.confidence === 'low') return { ...lowConfirm, source: 'local' };

  if (local.intent === 'query' || local.confidence === 'low') {
    const { answer } = answerQueryLocally(local.query || text, ctx);
    return { type: 'answer', answer, source: 'local-fallback' };
  }

  return {
    type: 'answer',
    answer: 'Try / for commands — e.g. /task, /event, /ask — or ask: "How many events today?"',
    source: 'fallback',
  };
}

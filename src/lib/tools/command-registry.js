import { TOOL_REGISTRY, TOOL_CATALOG_ROUTE } from '@/lib/tools/registry';
import { parseCommandLocally } from '@/lib/tools/command-parser';
import { answerQueryLocally } from '@/lib/tools/command-query';
import { buildCommandBarNavigation } from '@/lib/tools/command-bar-draft';
import { getToolRoute } from '@/lib/tools/tool-routes';

/** @typedef {'create'|'query'|'navigate'|'action'} CommandCategory */

/**
 * @typedef {object} SlashCommandDef
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string[]} suggestOn
 * @property {boolean} alwaysAvailable
 * @property {CommandCategory} category
 * @property {string} [hint]
 */

/** @type {SlashCommandDef[]} */
export const COMMAND_DEFINITIONS = [
  { id: 'task', label: '/task', description: 'Add homework or a to-do', suggestOn: ['dashboard', 'tasks', 'global'], alwaysAvailable: true, category: 'create', hint: 'Title · due date' },
  { id: 'event', label: '/event', description: 'Schedule a timed calendar block', suggestOn: ['dashboard', 'calendar', 'tasks'], alwaysAvailable: true, category: 'create', hint: 'Title · day/time' },
  { id: 'ask', label: '/ask', description: 'Ask about your schedule or tasks', suggestOn: ['dashboard', 'global'], alwaysAvailable: true, category: 'query', hint: 'Your question' },
  { id: 'goto', label: '/goto', description: 'Open a tool (e.g. calendar, tasks)', suggestOn: ['dashboard', 'catalog', 'global'], alwaysAvailable: true, category: 'navigate', hint: 'Tool name' },

  { id: 'debrief', label: '/debrief', description: 'Open daily intelligence panel', suggestOn: ['dashboard'], alwaysAvailable: true, category: 'action', hint: '' },
  { id: 'next', label: '/next', description: 'What class or event is next', suggestOn: ['dashboard'], alwaysAvailable: true, category: 'query', hint: '' },

  { id: 'due', label: '/due', description: 'What tasks are due', suggestOn: ['tasks'], alwaysAvailable: true, category: 'query', hint: 'today · tomorrow · week' },
  { id: 'complete', label: '/complete', description: 'Mark a task done by name', suggestOn: ['tasks'], alwaysAvailable: true, category: 'action', hint: 'Task name' },
  { id: 'filter', label: '/filter', description: 'Filter tasks by priority or class', suggestOn: ['tasks'], alwaysAvailable: true, category: 'action', hint: 'high · class name' },

  { id: 'today', label: '/today', description: "List today's calendar events", suggestOn: ['calendar'], alwaysAvailable: true, category: 'query', hint: '' },
  { id: 'week', label: '/week', description: "This week's schedule", suggestOn: ['calendar'], alwaysAvailable: true, category: 'query', hint: '' },
  { id: 'free', label: '/free', description: 'Find free time or next block', suggestOn: ['calendar', 'dashboard'], alwaysAvailable: true, category: 'query', hint: 'optional: tomorrow' },

  { id: 'start', label: '/start', description: 'Start a focus timer', suggestOn: ['focus'], alwaysAvailable: true, category: 'action', hint: 'Minutes (e.g. 25)' },
  { id: 'break', label: '/break', description: 'Start a break timer', suggestOn: ['focus'], alwaysAvailable: true, category: 'action', hint: 'Minutes (e.g. 5)' },
  { id: 'focus', label: '/focus', description: 'Focus session linked to a task', suggestOn: ['focus'], alwaysAvailable: true, category: 'action', hint: 'Task name' },

  { id: 'goal', label: '/goal', description: 'Add a new goal', suggestOn: ['goals'], alwaysAvailable: true, category: 'create', hint: 'Goal title' },
  { id: 'log', label: '/log', description: 'Log progress on a goal', suggestOn: ['goals'], alwaysAvailable: true, category: 'action', hint: 'Goal · note' },
  { id: 'review', label: '/review', description: 'Open weekly goals review', suggestOn: ['goals'], alwaysAvailable: true, category: 'action', hint: '' },

  { id: 'entry', label: '/entry', description: 'New journal entry', suggestOn: ['journal'], alwaysAvailable: true, category: 'create', hint: 'Title or first line' },
  { id: 'search', label: '/search', description: 'Search journal or vault', suggestOn: ['journal', 'passwords'], alwaysAvailable: true, category: 'action', hint: 'Search terms' },

  { id: 'item', label: '/item', description: 'Add item to active list', suggestOn: ['lists'], alwaysAvailable: true, category: 'create', hint: 'Item text' },
  { id: 'list', label: '/list', description: 'Create a new list', suggestOn: ['lists'], alwaysAvailable: true, category: 'create', hint: 'List name' },

  { id: 'expr', label: '/expr', description: 'Add graph expression', suggestOn: ['calculator'], alwaysAvailable: true, category: 'create', hint: 'y = sin(x)' },
  { id: 'table', label: '/table', description: 'Add a value table', suggestOn: ['calculator'], alwaysAvailable: true, category: 'create', hint: '' },

  { id: 'add', label: '/add', description: 'Add a new credential', suggestOn: ['passwords'], alwaysAvailable: true, category: 'action', hint: 'Site or label' },
  { id: 'pin', label: '/pin', description: 'Pin or unpin a tool', suggestOn: ['catalog'], alwaysAvailable: true, category: 'action', hint: 'Tool name' },
];

const byId = Object.fromEntries(COMMAND_DEFINITIONS.map((c) => [c.id, c]));

export function getCommandById(id) {
  return byId[id] || null;
}

export function getSuggestedCommands(pageId) {
  return COMMAND_DEFINITIONS.filter((cmd) => cmd.suggestOn.includes(pageId));
}

export function filterCommands(query, pageId) {
  const suggestions = getSuggestedCommands(pageId);
  if (!query || query === '/') return suggestions;
  const rest = query.slice(1);
  if (rest.includes(' ')) return [];
  const needle = rest.toLowerCase();
  if (!needle) return suggestions;
  return suggestions.filter((cmd) => cmd.id.startsWith(needle));
}

/** True while user is still typing the command token (before first space). */
export function isSlashPickerOpen(input) {
  if (!input?.startsWith('/')) return false;
  return !input.slice(1).includes(' ');
}

export function unknownSlashCommandError(token) {
  return `Unknown command /${token}. Type / to see available commands on this page.`;
}

/**
 * Process input changes for slash commands — confirms on space, validates exact token match.
 * @returns {{ input: string, slashError: string|null, slashHint: string|null|undefined }}
 */
export function handleSlashInputChange(prev, next) {
  if (!next.startsWith('/')) {
    return { input: next, slashError: null, slashHint: null };
  }

  const rest = next.slice(1);
  const spaceIdx = rest.indexOf(' ');

  if (spaceIdx === -1) {
    return { input: next, slashError: null, slashHint: undefined };
  }

  const token = rest.slice(0, spaceIdx).toLowerCase();
  const tail = rest.slice(spaceIdx + 1);
  const cmd = getCommandById(token);

  if (!cmd) {
    return {
      input: isSlashPickerOpen(prev) ? prev : next,
      slashError: unknownSlashCommandError(token),
      slashHint: null,
    };
  }

  const normalized = `${cmd.label}${tail.length ? ` ${tail}` : ' '}`;
  const prevCommandId = parseSlashPrefix(prev).commandId;

  if (isSlashPickerOpen(prev) || prevCommandId !== cmd.id) {
    return {
      input: normalized,
      slashError: null,
      slashHint: cmd.hint || '',
    };
  }

  return { input: next, slashError: null, slashHint: undefined };
}

/**
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateSlashInput(text) {
  const trimmed = (text || '').trim();
  if (!trimmed.startsWith('/')) return { valid: true };
  const { commandId } = parseSlashPrefix(trimmed);
  if (commandId) return { valid: true };
  const token = trimmed.slice(1).split(/\s/)[0];
  if (!token) return { valid: true };
  return {
    valid: false,
    error: unknownSlashCommandError(token),
  };
}

/**
 * @param {string} text
 * @returns {{ commandId: string|null, remainder: string, command: SlashCommandDef|null }}
 */
export function parseSlashPrefix(text) {
  const trimmed = (text || '').trim();
  if (!trimmed.startsWith('/')) {
    return { commandId: null, remainder: trimmed, command: null };
  }
  const rest = trimmed.slice(1);
  const spaceIdx = rest.indexOf(' ');
  const token = (spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)).toLowerCase();
  const remainder = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1).trim();
  const command = getCommandById(token);
  if (!command || !command.alwaysAvailable) {
    return { commandId: null, remainder: trimmed, command: null };
  }
  return { commandId: token, remainder, command };
}

function resolveGotoRoute(remainder) {
  const q = (remainder || '').toLowerCase().trim();
  if (!q) return null;
  const tool = TOOL_REGISTRY.find(
    (t) => t.id === q
      || t.label.toLowerCase() === q
      || t.id.includes(q)
      || t.label.toLowerCase().includes(q),
  );
  return tool?.route || null;
}

function matchTaskByName(tasks, name) {
  const q = (name || '').toLowerCase().trim();
  if (!q) return null;
  const open = tasks.filter((t) => !t.completed);
  return open.find((t) => t.title?.toLowerCase().includes(q))
    || open.find((t) => q.split(/\s+/).every((w) => t.title?.toLowerCase().includes(w)));
}

/**
 * Execute a slash command locally when possible.
 * @returns {object|null} executor result
 */
export function executeSlashCommand(commandId, remainder, ctx) {
  const cmd = getCommandById(commandId);
  if (!cmd) return null;

  switch (commandId) {
    case 'task': {
      const local = parseCommandLocally(remainder || 'new task', new Date());
      if (local.intent === 'create_task' && local.task) {
        return {
          type: 'confirm',
          intent: 'create_task',
          task: local.task,
          preview: local.task.title,
          source: 'slash',
          commandId,
        };
      }
      const forced = parseCommandLocally(`add task ${remainder}`, new Date());
      if (forced.task) {
        return { type: 'confirm', intent: 'create_task', task: forced.task, preview: forced.task.title, source: 'slash', commandId };
      }
      return null;
    }
    case 'event': {
      const local = parseCommandLocally(remainder || 'meeting tomorrow 3pm', new Date());
      if (local.intent === 'create_events' && local.events?.length) {
        return {
          type: 'confirm',
          intent: 'create_events',
          events: local.events,
          preview: local.events[0].title,
          source: 'slash',
          commandId,
        };
      }
      const forced = parseCommandLocally(`schedule ${remainder}`, new Date());
      if (forced.events?.length) {
        return { type: 'confirm', intent: 'create_events', events: forced.events, preview: forced.events[0].title, source: 'slash', commandId };
      }
      return null;
    }
    case 'ask': {
      const q = remainder || 'what is on my calendar today';
      const { answer } = answerQueryLocally(q, ctx);
      return { type: 'answer', answer, source: 'slash', commandId };
    }
    case 'goto': {
      const route = resolveGotoRoute(remainder);
      if (!route) {
        return {
          type: 'answer',
          answer: `Couldn't find that tool. Try: ${TOOL_REGISTRY.slice(0, 6).map((t) => t.label).join(', ')}…`,
          source: 'slash',
        };
      }
      return { type: 'navigate', route, source: 'slash', commandId };
    }
    case 'today': {
      const { answer } = answerQueryLocally('events today', ctx);
      return { type: 'answer', answer, source: 'slash', commandId };
    }
    case 'week': {
      const { answer } = answerQueryLocally('schedule this week', ctx);
      return { type: 'answer', answer, source: 'slash', commandId };
    }
    case 'free': {
      const q = remainder ? `free time ${remainder}` : 'free time';
      const { answer } = answerQueryLocally(q, ctx);
      return { type: 'answer', answer, source: 'slash', commandId };
    }
    case 'due': {
      const q = remainder ? `tasks due ${remainder}` : 'tasks due today';
      const { answer } = answerQueryLocally(q, ctx);
      return { type: 'answer', answer, source: 'slash', commandId };
    }
    case 'next': {
      const { answer } = answerQueryLocally('what is next class', ctx);
      return { type: 'answer', answer, source: 'slash', commandId };
    }
    case 'complete': {
      const task = matchTaskByName(ctx.tasks, remainder);
      if (!task) {
        return { type: 'answer', answer: 'No matching open task found.', source: 'slash', commandId };
      }
      return {
        type: 'action',
        actionId: 'completeTask',
        payload: { taskId: task.taskId, title: task.title },
        route: getToolRoute('tasks'),
        source: 'slash',
        commandId,
      };
    }
    case 'filter': {
      const q = (remainder || '').toLowerCase();
      const payload = {};
      if (q.includes('high') || q.includes('medium') || q.includes('low')) {
        payload.priority = q.includes('high') ? 'high' : q.includes('low') ? 'low' : 'medium';
      } else if (remainder.trim()) {
        payload.classTag = remainder.trim();
      }
      return {
        type: 'action',
        actionId: 'filterTasks',
        payload,
        route: getToolRoute('tasks'),
        source: 'slash',
        commandId,
      };
    }
    case 'start': {
      const mins = parseInt(remainder, 10) || 25;
      return {
        type: 'action',
        actionId: 'startFocus',
        payload: { minutes: mins, mode: 'focus' },
        route: getToolRoute('focus'),
        source: 'slash',
        commandId,
      };
    }
    case 'break': {
      const mins = parseInt(remainder, 10) || 5;
      return {
        type: 'action',
        actionId: 'startFocus',
        payload: { minutes: mins, mode: 'break' },
        source: 'slash',
        commandId,
        route: getToolRoute('focus'),
      };
    }
    case 'focus': {
      const task = matchTaskByName(ctx.tasks, remainder);
      return {
        type: 'action',
        actionId: 'startFocus',
        payload: { taskId: task?.taskId, taskTitle: remainder || task?.title, mode: 'focus' },
        route: getToolRoute('focus'),
        source: 'slash',
        commandId,
      };
    }
    case 'debrief': {
      return {
        type: 'action',
        actionId: 'openDebrief',
        payload: {},
        route: getToolRoute('dashboard'),
        source: 'slash',
        commandId,
      };
    }
    case 'goal': {
      return {
        type: 'action',
        actionId: 'addGoal',
        payload: { title: remainder || '' },
        route: getToolRoute('goals'),
        source: 'slash',
        commandId,
      };
    }
    case 'log': {
      return {
        type: 'action',
        actionId: 'logGoal',
        payload: { text: remainder || '' },
        route: getToolRoute('goals'),
        source: 'slash',
        commandId,
      };
    }
    case 'review': {
      return {
        type: 'action',
        actionId: 'weeklyReview',
        payload: {},
        route: getToolRoute('goals'),
        source: 'slash',
        commandId,
      };
    }
    case 'entry': {
      return {
        type: 'action',
        actionId: 'journalEntry',
        payload: { text: remainder || '' },
        route: getToolRoute('journal'),
        source: 'slash',
        commandId,
      };
    }
    case 'search': {
      const pageId = ctx.pageContext?.pageId;
      if (pageId === 'passwords') {
        return {
          type: 'action',
          actionId: 'searchVault',
          payload: { query: remainder || '' },
          route: getToolRoute('passwords'),
          source: 'slash',
          commandId,
        };
      }
      return {
        type: 'action',
        actionId: 'searchJournal',
        payload: { query: remainder || '' },
        route: getToolRoute('journal'),
        source: 'slash',
        commandId,
      };
    }
    case 'item': {
      return {
        type: 'action',
        actionId: 'addListItem',
        payload: { text: remainder || '' },
        route: getToolRoute('lists'),
        source: 'slash',
        commandId,
      };
    }
    case 'list': {
      return {
        type: 'action',
        actionId: 'createList',
        payload: { name: remainder || '' },
        route: getToolRoute('lists'),
        source: 'slash',
        commandId,
      };
    }
    case 'expr': {
      return {
        type: 'action',
        actionId: 'calculatorExpr',
        payload: { raw: remainder || '' },
        route: getToolRoute('calculator'),
        source: 'slash',
        commandId,
      };
    }
    case 'table': {
      return {
        type: 'action',
        actionId: 'calculatorTable',
        payload: {},
        route: getToolRoute('calculator'),
        source: 'slash',
        commandId,
      };
    }
    case 'add': {
      return {
        type: 'action',
        actionId: 'addCredential',
        payload: { label: remainder || '' },
        route: getToolRoute('passwords'),
        source: 'slash',
        commandId,
      };
    }
    case 'pin': {
      return {
        type: 'action',
        actionId: 'pinTool',
        payload: { toolName: remainder || '' },
        route: TOOL_CATALOG_ROUTE,
        source: 'slash',
        commandId,
      };
    }
    default:
      return null;
  }
}

export { buildCommandBarNavigation };

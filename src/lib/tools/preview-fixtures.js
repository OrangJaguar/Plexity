export const PREVIEW_SCHEDULE = {
  weekday: [
    { mod: 1, start: '8:00', end: '8:52', className: 'English' },
    { mod: 2, start: '8:57', end: '9:49', className: 'Math' },
    { mod: 3, start: '9:54', end: '10:46', className: 'History' },
  ],
  wednesday: [],
  exceptions: {},
};

export const PREVIEW_TASKS = [
  {
    id: 'preview-1',
    title: 'Read chapter 4',
    className: 'English',
    priority: 'yellow',
    completed: false,
    dueDate: null,
  },
  {
    id: 'preview-2',
    title: 'Problem set 7',
    className: 'Math',
    priority: 'red',
    completed: false,
    dueDate: null,
  },
  {
    id: 'preview-3',
    title: 'Outline essay draft',
    className: 'History',
    priority: 'green',
    completed: true,
    dueDate: null,
  },
];

export const PREVIEW_EVENTS = [
  {
    id: 'preview-ev-1',
    title: 'Study group',
    start: new Date().setHours(15, 0, 0, 0),
    end: new Date().setHours(16, 0, 0, 0),
    color: '#6366f1',
  },
  {
    id: 'preview-ev-2',
    title: 'Soccer practice',
    start: new Date().setHours(17, 30, 0, 0),
    end: new Date().setHours(19, 0, 0, 0),
    color: '#22c55e',
  },
];

export const PREVIEW_DASHBOARD_STATE = {
  currentClass: 'Math',
  currentMod: 'Mod 2',
  timeRange: '8:57 – 9:49',
  classCountdown: '12:34',
  nextClass: 'History · Mod 3',
};

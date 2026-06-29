function eventsOverlap(a, b) {
  return a.displayStart < b.displayEnd && a.displayEnd > b.displayStart;
}

function buildOverlapGroups(sortedEvents) {
  const groups = [];
  let current = null;

  sortedEvents.forEach((evt) => {
    if (!current || !current.some((other) => eventsOverlap(other, evt))) {
      current = [evt];
      groups.push(current);
      return;
    }
    current.push(evt);
  });

  return groups;
}

function assignColumns(group) {
  const columns = [];
  const placements = new Map();

  group.forEach((evt) => {
    let column = 0;
    while (columns[column]?.some((placed) => eventsOverlap(placed, evt))) {
      column += 1;
    }
    if (!columns[column]) columns[column] = [];
    columns[column].push(evt);
    placements.set(evt, column);
  });

  const totalColumns = columns.length;
  const layout = new Map();
  group.forEach((evt) => {
    layout.set(evt, { column: placements.get(evt), totalColumns });
  });
  return layout;
}

export function computeDayOverlapLayout(dayEvents) {
  const sorted = [...(dayEvents || [])].sort((a, b) => a.displayStart - b.displayStart);
  const layout = new Map();
  buildOverlapGroups(sorted).forEach((group) => {
    assignColumns(group).forEach((value, evt) => {
      layout.set(`${evt.eventId}-${evt.displayStart.getTime()}`, value);
    });
  });
  return layout;
}

export function getOverlapInlineStyle({ column, totalColumns }) {
  if (!totalColumns || totalColumns <= 1) {
    return { left: '6px', right: '6px', width: 'auto' };
  }
  const widthPct = 100 / totalColumns;
  const inset = 6;
  return {
    left: `calc(${inset}px + ${column * widthPct}% * (100% - ${inset * 2}px) / 100)`,
    width: `calc(${widthPct}% * (100% - ${inset * 2}px) / 100 - 2px)`,
    right: 'auto',
  };
}

export function getOverlapLayoutKey(evt) {
  return `${evt.eventId}-${evt.displayStart.getTime()}`;
}

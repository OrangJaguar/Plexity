import { parseCmdTimeString, formatCmdLocaleTime, formatCountdown } from './time-format';

function buildTodaySchedule(now, schedule) {
  const dayOfWeek = now.getDay();
  const dayType = dayOfWeek === 3 ? 'wednesday' : 'weekday';
  const mods = schedule?.[dayType] ?? [];
  return mods.map((mod) => {
    const startTime = parseCmdTimeString(mod.start);
    const endTime = parseCmdTimeString(mod.end);
    return {
      ...mod,
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), startTime.hours, startTime.minutes),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), endTime.hours, endTime.minutes),
    };
  });
}

function contiguousRange(todaySchedule, index) {
  const cls = todaySchedule[index].cls;
  let startIndex = index;
  while (startIndex > 0 && todaySchedule[startIndex - 1].cls === cls) startIndex -= 1;
  let endIndex = index;
  while (endIndex < todaySchedule.length - 1 && todaySchedule[endIndex + 1].cls === cls) endIndex += 1;
  return { startIndex, endIndex };
}

function findNextClassItem(todaySchedule, fromIndex) {
  const { endIndex } = contiguousRange(todaySchedule, fromIndex);
  for (let j = endIndex + 1; j < todaySchedule.length; j++) {
    if (todaySchedule[j].cls !== todaySchedule[j - 1].cls) {
      return todaySchedule[j];
    }
  }
  return null;
}

function formatNextClass(todaySchedule, nextClassItem) {
  if (!nextClassItem) return 'No more classes today';
  const idx = todaySchedule.indexOf(nextClassItem);
  const { startIndex, endIndex } = contiguousRange(todaySchedule, idx);
  const nextStart = todaySchedule[startIndex].startTime;
  const nextEnd = todaySchedule[endIndex].endTime;
  return `${nextClassItem.cls} • ${formatCmdLocaleTime(nextStart)} - ${formatCmdLocaleTime(nextEnd)}`;
}

const NO_SCHEDULE = {
  currentClass: 'No schedule available',
  currentMod: '--',
  timeRange: '--',
  classCountdown: '--:--',
  nextClass: 'No schedule available',
  modalMod: '--',
  modalClass: 'No schedule available',
  modalTimeRange: '--',
  modalCountdown: '--:--',
  modalNextMod: 'No schedule available',
  modalNextClass: 'No schedule available',
  modClickable: false,
};

export function getDashboardState(now, schedule) {
  const todaySchedule = buildTodaySchedule(now, schedule);
  if (!todaySchedule.length) return { ...NO_SCHEDULE };

  let currentIndex = -1;
  for (let i = 0; i < todaySchedule.length; i++) {
    const mod = todaySchedule[i];
    if (now >= mod.startTime && now < mod.endTime) {
      currentIndex = i;
      break;
    }
  }

  let gapIndex = -1;
  for (let i = 0; i < todaySchedule.length - 1; i++) {
    const endOfThis = todaySchedule[i].endTime;
    const startOfNext = todaySchedule[i + 1].startTime;
    if (now >= endOfThis && now < startOfNext) {
      gapIndex = i;
      break;
    }
  }

  if (currentIndex >= 0) {
    const currentMod = todaySchedule[currentIndex];
    const clsName = currentMod.cls;
    const { startIndex, endIndex } = contiguousRange(todaySchedule, currentIndex);
    const classStartTime = todaySchedule[startIndex].startTime;
    const classEndTime = todaySchedule[endIndex].endTime;

    let classCountdown = '--:--';
    let modalCountdown = '--:--';
    let timeRange = '--';

    if (clsName !== 'School is over') {
      timeRange = `${formatCmdLocaleTime(classStartTime)} - ${formatCmdLocaleTime(classEndTime)}`;
      const timeRemaining = Math.max(0, Math.floor((classEndTime - now) / 1000));
      classCountdown = formatCountdown(timeRemaining);
      const modTimeRemaining = Math.max(0, Math.floor((currentMod.endTime - now) / 1000));
      modalCountdown = formatCountdown(modTimeRemaining);
    }

    const nextClassItem = findNextClassItem(todaySchedule, currentIndex);
    const nextClass = formatNextClass(todaySchedule, nextClassItem);

    let modalNextMod = 'No more mods today';
    if (currentIndex < todaySchedule.length - 1) {
      const nextMod = todaySchedule[currentIndex + 1];
      modalNextMod = `${nextMod.mod} • ${formatCmdLocaleTime(nextMod.startTime)} - ${formatCmdLocaleTime(nextMod.endTime)}`;
    }

    return {
      currentClass: clsName,
      currentMod: String(currentMod.mod),
      timeRange,
      classCountdown,
      nextClass,
      modalMod: clsName === 'School is over' ? '--' : String(currentMod.mod),
      modalClass: clsName,
      modalTimeRange: clsName === 'School is over' ? '--' : `${formatCmdLocaleTime(currentMod.startTime)} - ${formatCmdLocaleTime(currentMod.endTime)}`,
      modalCountdown,
      modalNextMod,
      modalNextClass: nextClass,
      modClickable: true,
    };
  }

  if (gapIndex >= 0) {
    const before = todaySchedule[gapIndex];
    const after = todaySchedule[gapIndex + 1];

    if (before.cls === after.cls) {
      const { startIndex, endIndex } = contiguousRange(todaySchedule, gapIndex);
      const classEndTime = todaySchedule[endIndex].endTime;
      const timeRemaining = Math.max(0, Math.floor((classEndTime - now) / 1000));
      const nextClassItem = findNextClassItem(todaySchedule, gapIndex);

      return {
        currentClass: before.cls,
        currentMod: String(before.mod),
        timeRange: `${formatCmdLocaleTime(todaySchedule[startIndex].startTime)} - ${formatCmdLocaleTime(classEndTime)}`,
        classCountdown: formatCountdown(timeRemaining),
        nextClass: formatNextClass(todaySchedule, nextClassItem),
        modalMod: `Between ${before.mod} and ${after.mod}`,
        modalClass: before.cls,
        modalTimeRange: 'Between Mods',
        modalCountdown: '--:--',
        modalNextMod: `${after.mod} • ${formatCmdLocaleTime(after.startTime)} - ${formatCmdLocaleTime(after.endTime)}`,
        modalNextClass: formatNextClass(todaySchedule, nextClassItem),
        modClickable: true,
      };
    }

    const nextRange = contiguousRange(todaySchedule, gapIndex + 1);
    const nextStart = todaySchedule[nextRange.startIndex].startTime;
    const nextEnd = todaySchedule[nextRange.endIndex].endTime;
    const nextClass = `${after.cls} • ${formatCmdLocaleTime(nextStart)} - ${formatCmdLocaleTime(nextEnd)}`;

    return {
      currentClass: 'No current class',
      currentMod: `Between ${before.mod} and ${after.mod}`,
      timeRange: '--',
      classCountdown: '--:--',
      nextClass,
      modalMod: `Between ${before.mod} and ${after.mod}`,
      modalClass: 'No current class',
      modalTimeRange: '--',
      modalCountdown: '--:--',
      modalNextMod: `${after.mod} • ${formatCmdLocaleTime(after.startTime)} - ${formatCmdLocaleTime(after.endTime)}`,
      modalNextClass: nextClass,
      modClickable: true,
    };
  }

  const firstMod = todaySchedule[0];
  if (now < firstMod.startTime) {
    const nextRange = contiguousRange(todaySchedule, 0);
    const nextStart = todaySchedule[nextRange.startIndex].startTime;
    const nextEnd = todaySchedule[nextRange.endIndex].endTime;
    const nextClass = `${firstMod.cls} • ${formatCmdLocaleTime(nextStart)} - ${formatCmdLocaleTime(nextEnd)}`;

    return {
      currentClass: 'No current class',
      currentMod: '--',
      timeRange: '--',
      classCountdown: '--:--',
      nextClass,
      modalMod: '--',
      modalClass: 'No current class',
      modalTimeRange: '--',
      modalCountdown: '--:--',
      modalNextMod: `${firstMod.mod} • ${formatCmdLocaleTime(firstMod.startTime)} - ${formatCmdLocaleTime(firstMod.endTime)}`,
      modalNextClass: nextClass,
      modClickable: false,
    };
  }

  const lastMod = todaySchedule[todaySchedule.length - 1];
  if (now >= lastMod.endTime) {
    return {
      currentClass: 'School is over',
      currentMod: '--',
      timeRange: '--',
      classCountdown: '--:--',
      nextClass: 'No more classes today',
      modalMod: '--',
      modalClass: 'School is over',
      modalTimeRange: '--',
      modalCountdown: '--:--',
      modalNextMod: 'No more mods today',
      modalNextClass: 'No more classes today',
      modClickable: false,
    };
  }

  return { ...NO_SCHEDULE };
}

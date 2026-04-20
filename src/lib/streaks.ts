import { isPublicStreakActivityType } from "./public-activity";

export type StreakActivity = {
  activity_type: string;
  created_at: string | Date;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toUtcDayKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-");
}

function shiftUtcDay(dayKey: string, offsetDays: number): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-");
}

export function computeCurrentStreak(activities: readonly StreakActivity[]): number {
  const streakDays = new Set<string>();

  for (const activity of activities) {
    if (!isPublicStreakActivityType(activity.activity_type)) {
      continue;
    }

    const dayKey = toUtcDayKey(activity.created_at);
    if (dayKey) {
      streakDays.add(dayKey);
    }
  }

  if (streakDays.size === 0) {
    return 0;
  }

  const orderedDays = [...streakDays].sort((left, right) => right.localeCompare(left));
  let streak = 0;
  let cursor = orderedDays[0];

  while (streakDays.has(cursor)) {
    streak += 1;
    cursor = shiftUtcDay(cursor, -1);
  }

  return streak;
}

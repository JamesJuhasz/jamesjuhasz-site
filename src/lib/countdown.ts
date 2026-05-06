export const LA_2028_SAILING_START = "2028-07-15";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysToLA2028(now: Date = new Date()): number {
  const target = new Date(`${LA_2028_SAILING_START}T00:00:00Z`).getTime();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.max(0, Math.ceil((target - today) / MS_PER_DAY));
}

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayKey = (): string => toDateKey(new Date());

export const parseDateKey = (dateKey: string): Date => {
  return new Date(`${dateKey}T00:00:00`);
};

export const addDays = (dateKey: string, days: number): string => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const daysBetween = (startKey: string, endKey: string): number => {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

export const nowIso = (): string => new Date().toISOString();

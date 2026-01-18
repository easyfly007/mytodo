import type { Checkin, Task } from "../data/types";
import { addDays, todayKey } from "./date";

export type MonthlyStats = {
  month: string;
  planned: number;
  done: number;
  postponed: number;
  canceled: number;
  missed: number;
  completionRate: number;
};

export const getMonthlyStats = (
  checkins: Checkin[],
  month: string,
): MonthlyStats => {
  const today = todayKey();
  const inMonth = checkins.filter((item) => item.date.startsWith(month));

  const planned = inMonth.filter((item) => item.source === "scheduled").length;
  const done = inMonth.filter(
    (item) => item.source === "scheduled" && item.state === "done",
  ).length;
  const postponed = inMonth.filter((item) => item.state === "postponed").length;
  const canceled = inMonth.filter((item) => item.state === "canceled").length;
  const missed = inMonth.filter(
    (item) =>
      item.state === "missed" ||
      (item.state === "pending" && item.date < today),
  ).length;

  const completionRate = planned === 0 ? 0 : done / planned;

  return {
    month,
    planned,
    done,
    postponed,
    canceled,
    missed,
    completionRate,
  };
};

export type TaskMonthlyStats = {
  taskId: string;
  title: string;
  planned: number;
  done: number;
  completionRate: number;
};

export const getTaskMonthlyStats = (
  tasks: Task[],
  checkins: Checkin[],
  month: string,
): TaskMonthlyStats[] => {
  const checkinsInMonth = checkins.filter((item) => item.date.startsWith(month));
  const taskMap = new Map(tasks.map((task) => [task.id, task.title]));
  const statsMap = new Map<string, { planned: number; done: number }>();

  checkinsInMonth.forEach((item) => {
    if (item.source !== "scheduled") return;
    const current = statsMap.get(item.taskId) ?? { planned: 0, done: 0 };
    current.planned += 1;
    if (item.state === "done") current.done += 1;
    statsMap.set(item.taskId, current);
  });

  return Array.from(statsMap.entries())
    .map(([taskId, stat]) => ({
      taskId,
      title: taskMap.get(taskId) ?? "未命名任务",
      planned: stat.planned,
      done: stat.done,
      completionRate: stat.planned === 0 ? 0 : stat.done / stat.planned,
    }))
    .sort((a, b) => a.completionRate - b.completionRate);
};

export type WeeklyStatsItem = {
  date: string;
  planned: number;
  done: number;
  postponed: number;
  canceled: number;
};

export const getWeeklyStats = (checkins: Checkin[]): WeeklyStatsItem[] => {
  const today = todayKey();
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    days.push(addDays(today, -i));
  }

  return days.map((date) => {
    const items = checkins.filter((item) => item.date === date);
    const planned = items.filter((item) => item.source === "scheduled").length;
    const done = items.filter(
      (item) => item.source === "scheduled" && item.state === "done",
    ).length;
    const postponed = items.filter((item) => item.state === "postponed").length;
    const canceled = items.filter((item) => item.state === "canceled").length;

    return { date, planned, done, postponed, canceled };
  });
};

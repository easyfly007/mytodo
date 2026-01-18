import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Checkin, CheckinSource, CheckinState, Meta, Settings, Task } from "../data/types";
import { DEFAULT_META, DEFAULT_SETTINGS } from "../data/schema";
import {
  getCheckins,
  getMeta,
  getSettings,
  getTasks,
  saveCheckins,
  saveMeta,
  saveSettings,
  saveTasks,
} from "../storage/localDb";
import { addDays, daysBetween, nowIso, todayKey } from "../utils/date";
import {
  isSyncConfigured,
  pullFromGithub,
  pushToGithub,
  type RemoteData,
} from "../sync/githubSync";

type AppState = {
  tasks: Task[];
  checkins: Checkin[];
  meta: Meta;
  settings: Settings;
  syncStatus: "idle" | "syncing" | "success" | "error";
  syncError: string | null;
  syncReport: SyncReport | null;
  loading: boolean;
};

type TaskInput = {
  title: string;
  type: Task["type"];
  interval: number;
  startDate: string;
};

type AppActions = {
  addTask: (input: TaskInput) => void;
  updateTask: (task: Task) => void;
  archiveTask: (taskId: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  setCheckinState: (checkinId: string, state: CheckinState) => void;
  updateSettings: (settings: Settings) => void;
  regenerateToday: () => void;
  syncNow: () => Promise<void>;
};

type AppStore = AppState & AppActions;

type SyncReport = {
  tasks: SyncReportItem;
  checkins: SyncReportItem;
  syncedAt: string;
};

type SyncReportItem = {
  pulledAdded: number;
  pulledUpdated: number;
  pushedAdded: number;
  pushedUpdated: number;
};

const AppContext = createContext<AppStore | null>(null);

const createCheckin = (
  taskId: string,
  date: string,
  source: CheckinSource,
  originDate: string | null,
): Checkin => {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    taskId,
    date,
    state: "pending",
    source,
    originDate,
    note: null,
    createdAt: now,
    updatedAt: now,
  };
};

const isDueOnDate = (task: Task, dateKey: string): boolean => {
  if (task.type !== "recurring" || !task.recurrence) return false;
  if (task.status !== "active") return false;
  if (dateKey < task.startDate) return false;
  if (task.endDate && dateKey > task.endDate) return false;

  const diff = daysBetween(task.startDate, dateKey);
  return diff >= 0 && diff % task.recurrence.interval === 0;
};

const ensureScheduledCheckins = (
  tasks: Task[],
  checkins: Checkin[],
  meta: Meta,
): { nextCheckins: Checkin[]; nextMeta: Meta } => {
  const today = todayKey();
  const startDate =
    meta.lastGeneratedDate === null ? today : addDays(meta.lastGeneratedDate, 1);

  if (startDate > today) {
    return { nextCheckins: checkins, nextMeta: meta };
  }

  const nextCheckins = [...checkins];
  const existingKey = new Set(
    checkins.map((item) => `${item.taskId}-${item.date}-${item.source}`),
  );

  let cursor = startDate;
  while (cursor <= today) {
    tasks.forEach((task) => {
      if (!isDueOnDate(task, cursor)) return;
      const key = `${task.id}-${cursor}-scheduled`;
      if (existingKey.has(key)) return;
      nextCheckins.push(createCheckin(task.id, cursor, "scheduled", null));
      existingKey.add(key);
    });
    cursor = addDays(cursor, 1);
  }

  return {
    nextCheckins,
    nextMeta: { ...meta, lastGeneratedDate: today },
  };
};

const applyMissedCheckins = (checkins: Checkin[]): Checkin[] => {
  const today = todayKey();
  const now = nowIso();
  let changed = false;
  const next = checkins.map((item) => {
    if (item.state === "pending" && item.date < today) {
      changed = true;
      return { ...item, state: "missed", updatedAt: now };
    }
    return item;
  });
  return changed ? next : checkins;
};

const mergeByUpdatedAt = <T extends { id: string; updatedAt: string }>(
  localItems: T[],
  remoteItems: T[],
): T[] => {
  const map = new Map<string, T>();
  localItems.forEach((item) => map.set(item.id, item));
  remoteItems.forEach((item) => {
    const existing = map.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

const mergeMeta = (localMeta: Meta, remoteMeta: Meta): Meta => {
  return {
    ...localMeta,
    schemaVersion: Math.max(localMeta.schemaVersion, remoteMeta.schemaVersion),
    dataVersion: Math.max(localMeta.dataVersion, remoteMeta.dataVersion),
    lastGeneratedDate:
      !localMeta.lastGeneratedDate || !remoteMeta.lastGeneratedDate
        ? localMeta.lastGeneratedDate ?? remoteMeta.lastGeneratedDate
        : localMeta.lastGeneratedDate > remoteMeta.lastGeneratedDate
          ? localMeta.lastGeneratedDate
          : remoteMeta.lastGeneratedDate,
  };
};

const mergeRemoteData = (local: RemoteData, remote: RemoteData): RemoteData => {
  return {
    tasks: mergeByUpdatedAt(local.tasks, remote.tasks),
    checkins: mergeByUpdatedAt(local.checkins, remote.checkins),
    meta: mergeMeta(local.meta, remote.meta),
  };
};

const buildSyncReport = (
  local: RemoteData,
  remote: RemoteData,
  syncedAt: string,
): SyncReport => {
  const summarize = <T extends { id: string; updatedAt: string }>(
    localItems: T[],
    remoteItems: T[],
  ): SyncReportItem => {
    const localMap = new Map(localItems.map((item) => [item.id, item]));
    const remoteMap = new Map(remoteItems.map((item) => [item.id, item]));
    let pulledAdded = 0;
    let pulledUpdated = 0;
    let pushedAdded = 0;
    let pushedUpdated = 0;

    remoteMap.forEach((remoteItem, id) => {
      const localItem = localMap.get(id);
      if (!localItem) {
        pulledAdded += 1;
        return;
      }
      if (remoteItem.updatedAt > localItem.updatedAt) {
        pulledUpdated += 1;
      } else if (localItem.updatedAt > remoteItem.updatedAt) {
        pushedUpdated += 1;
      }
    });

    localMap.forEach((_localItem, id) => {
      if (!remoteMap.has(id)) {
        pushedAdded += 1;
      }
    });

    return { pulledAdded, pulledUpdated, pushedAdded, pushedUpdated };
  };

  return {
    tasks: summarize(local.tasks, remote.tasks),
    checkins: summarize(local.checkins, remote.checkins),
    syncedAt,
  };
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>({
    tasks: [],
    checkins: [],
    meta: DEFAULT_META,
    settings: DEFAULT_SETTINGS,
    syncStatus: "idle",
    syncError: null,
    syncReport: null,
    loading: true,
  });
  const syncTimerRef = useRef<number | null>(null);
  const skipNextPushRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const [tasks, checkins, meta, settings] = await Promise.all([
        getTasks(),
        getCheckins(),
        getMeta(),
        getSettings(),
      ]);

      const nextMeta = meta.clientId
        ? meta
        : { ...meta, clientId: crypto.randomUUID() };

      const { nextCheckins, nextMeta: generatedMeta } = ensureScheduledCheckins(
        tasks,
        checkins,
        nextMeta,
      );
      const withMissed = applyMissedCheckins(nextCheckins);

      if (isSyncConfigured(settings)) {
        try {
          const remote = await pullFromGithub(settings);
          if (remote) {
            const merged = mergeRemoteData(
              { tasks, checkins: withMissed, meta: generatedMeta },
              remote,
            );
            const syncedMeta = { ...merged.meta, lastSyncAt: nowIso() };
            const report = buildSyncReport(
              { tasks, checkins: withMissed, meta: generatedMeta },
              remote,
              syncedMeta.lastSyncAt ?? nowIso(),
            );
            setState({
              tasks: merged.tasks,
              checkins: merged.checkins,
              meta: syncedMeta,
              settings,
              syncStatus: "success",
              syncError: null,
              syncReport: report,
              loading: false,
            });
            skipNextPushRef.current = true;
            await pushToGithub(settings, { ...merged, meta: syncedMeta });
            return;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "同步失败，请稍后重试。";
          setState({
            tasks,
            checkins: withMissed,
            meta: generatedMeta,
            settings,
            syncStatus: "error",
            syncError: message,
            syncReport: null,
            loading: false,
          });
          return;
        }
      }

      setState({
        tasks,
        checkins: withMissed,
        meta: generatedMeta,
        settings,
        syncStatus: "idle",
        syncError: null,
        syncReport: null,
        loading: false,
      });
    };

    load();
  }, []);

  useEffect(() => {
    if (state.loading) return;
    saveTasks(state.tasks);
  }, [state.tasks, state.loading]);

  useEffect(() => {
    if (state.loading) return;
    saveCheckins(state.checkins);
  }, [state.checkins, state.loading]);

  useEffect(() => {
    if (state.loading) return;
    saveMeta(state.meta);
  }, [state.meta, state.loading]);

  useEffect(() => {
    if (state.loading) return;
    saveSettings(state.settings);
  }, [state.settings, state.loading]);

  useEffect(() => {
    if (state.loading) return;
    if (!isSyncConfigured(state.settings)) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(async () => {
      try {
        setState((prev) => ({ ...prev, syncStatus: "syncing", syncError: null }));
        await pushToGithub(state.settings, {
          tasks: state.tasks,
          checkins: state.checkins,
          meta: state.meta,
        });
        setState((prev) => ({ ...prev, syncStatus: "success", syncError: null }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "同步失败，请稍后重试。";
        setState((prev) => ({ ...prev, syncStatus: "error", syncError: message }));
      }
    }, 1500);
  }, [state.tasks, state.checkins, state.meta, state.settings, state.loading]);

  const addTask = (input: TaskInput) => {
    const now = nowIso();
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      type: input.type,
      status: "active",
      startDate: input.startDate,
      endDate: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      recurrence:
        input.type === "recurring"
          ? { rule: "every_n_days", interval: input.interval }
          : null,
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => {
      const nextTasks = [...prev.tasks, task];
      const { nextCheckins, nextMeta } = ensureScheduledCheckins(
        nextTasks,
        prev.checkins,
        prev.meta,
      );
      return { ...prev, tasks: nextTasks, checkins: nextCheckins, meta: nextMeta };
    });
  };

  const updateTask = (task: Task) => {
    setState((prev) => {
      const nextTasks = prev.tasks.map((item) =>
        item.id === task.id ? { ...task, updatedAt: nowIso() } : item,
      );
      const { nextCheckins, nextMeta } = ensureScheduledCheckins(
        nextTasks,
        prev.checkins,
        prev.meta,
      );
      return {
        ...prev,
        tasks: nextTasks,
        checkins: applyMissedCheckins(nextCheckins),
        meta: nextMeta,
      };
    });
  };

  const archiveTask = (taskId: string) => {
    setState((prev) => {
      const nextTasks = prev.tasks.map((item) =>
        item.id === taskId
          ? { ...item, status: "archived", updatedAt: nowIso() }
          : item,
      );
      return { ...prev, tasks: nextTasks };
    });
  };

  const toggleTaskStatus = (taskId: string) => {
    setState((prev) => {
      const nextTasks = prev.tasks.map((item) => {
        if (item.id !== taskId) return item;
        const nextStatus = item.status === "active" ? "paused" : "active";
        return { ...item, status: nextStatus, updatedAt: nowIso() };
      });
      return { ...prev, tasks: nextTasks };
    });
  };

  const setCheckinState = (checkinId: string, stateValue: CheckinState) => {
    setState((prev) => {
      const nextCheckins = prev.checkins.map((item) =>
        item.id === checkinId
          ? { ...item, state: stateValue, updatedAt: nowIso() }
          : item,
      );

      if (stateValue !== "postponed") {
        return { ...prev, checkins: nextCheckins };
      }

      const target = prev.checkins.find((item) => item.id === checkinId);
      if (!target) {
        return { ...prev, checkins: nextCheckins };
      }

      const nextDate = addDays(target.date, 1);
      const exists = nextCheckins.some(
        (item) =>
          item.taskId === target.taskId &&
          item.date === nextDate &&
          item.source === "postponed" &&
          item.originDate === target.date,
      );

      if (exists) {
        return { ...prev, checkins: nextCheckins };
      }

      nextCheckins.push(
        createCheckin(target.taskId, nextDate, "postponed", target.date),
      );

      return { ...prev, checkins: nextCheckins };
    });
  };

  const updateSettings = (settings: Settings) => {
    setState((prev) => ({ ...prev, settings }));
  };

  const regenerateToday = () => {
    setState((prev) => {
      const { nextCheckins, nextMeta } = ensureScheduledCheckins(
        prev.tasks,
        prev.checkins,
        prev.meta,
      );
      return {
        ...prev,
        checkins: applyMissedCheckins(nextCheckins),
        meta: nextMeta,
      };
    });
  };

  const syncNow = async () => {
    if (!isSyncConfigured(state.settings)) {
      setState((prev) => ({
        ...prev,
        syncStatus: "error",
        syncError: "请先在设置中配置 GitHub 同步信息。",
      }));
      return;
    }

    setState((prev) => ({ ...prev, syncStatus: "syncing", syncError: null }));

    try {
      const localData: RemoteData = {
        tasks: state.tasks,
        checkins: state.checkins,
        meta: state.meta,
      };
      const remote = await pullFromGithub(state.settings);
      const merged = remote ? mergeRemoteData(localData, remote) : localData;
      const syncedMeta = { ...merged.meta, lastSyncAt: nowIso() };
      const report = remote
        ? buildSyncReport(localData, remote, syncedMeta.lastSyncAt ?? nowIso())
        : null;
      const mergedWithMissed = {
        ...merged,
        checkins: applyMissedCheckins(merged.checkins),
      };

      skipNextPushRef.current = true;
      setState((prev) => ({
        ...prev,
        tasks: mergedWithMissed.tasks,
        checkins: mergedWithMissed.checkins,
        meta: syncedMeta,
        syncStatus: "success",
        syncError: null,
        syncReport: report,
      }));

      await pushToGithub(state.settings, {
        ...mergedWithMissed,
        meta: syncedMeta,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "同步失败，请稍后重试。";
      setState((prev) => ({ ...prev, syncStatus: "error", syncError: message }));
    }
  };

  const value = useMemo<AppStore>(
    () => ({
      ...state,
      addTask,
      updateTask,
      archiveTask,
      toggleTaskStatus,
      setCheckinState,
      updateSettings,
      regenerateToday,
      syncNow,
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppStore = (): AppStore => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within AppProvider");
  }
  return ctx;
};

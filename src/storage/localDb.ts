import type { Checkin, Meta, Settings, Task } from "../data/types";
import {
  DEFAULT_CHECKINS,
  DEFAULT_META,
  DEFAULT_SETTINGS,
  DEFAULT_TASKS,
} from "../data/schema";

const DB_NAME = "mytodo";
const STORE_NAME = "kv";
const DB_VERSION = 1;

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
};

const getItem = async <T>(key: string, fallback: T): Promise<T> => {
  const result = await withStore("readonly", (store) => store.get(key));
  return (result ?? fallback) as T;
};

const setItem = async <T>(key: string, value: T): Promise<void> => {
  await withStore("readwrite", (store) => store.put(value, key));
};

export const getTasks = (): Promise<Task[]> =>
  getItem("tasks", DEFAULT_TASKS);

export const saveTasks = (tasks: Task[]): Promise<void> =>
  setItem("tasks", tasks);

export const getCheckins = (): Promise<Checkin[]> =>
  getItem("checkins", DEFAULT_CHECKINS);

export const saveCheckins = (checkins: Checkin[]): Promise<void> =>
  setItem("checkins", checkins);

export const getMeta = (): Promise<Meta> => getItem("meta", DEFAULT_META);

export const saveMeta = (meta: Meta): Promise<void> =>
  setItem("meta", meta);

export const getSettings = (): Promise<Settings> =>
  getItem("settings", DEFAULT_SETTINGS);

export const saveSettings = (settings: Settings): Promise<void> =>
  setItem("settings", settings);

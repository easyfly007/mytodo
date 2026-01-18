import type { Checkin, Meta, Settings, Task } from "./types";

export const DEFAULT_META: Meta = {
  schemaVersion: 1,
  clientId: "",
  lastSyncAt: null,
  dataVersion: 0,
  lastGeneratedDate: null,
};

export const DEFAULT_SETTINGS: Settings = {
  githubToken: "",
  githubOwner: "",
  githubRepo: "",
  githubBranch: "main",
};

export const DEFAULT_TASKS: Task[] = [];
export const DEFAULT_CHECKINS: Checkin[] = [];

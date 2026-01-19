export type TaskType = "normal";
export type TaskStatus = "active" | "paused" | "archived";

export type Task = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  startDate: string;
  endDate: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type CheckinState =
  | "pending"
  | "done"
  | "postponed"
  | "canceled"
  | "missed";

export type CheckinSource = "scheduled" | "postponed";

export type Checkin = {
  id: string;
  taskId: string;
  date: string;
  state: CheckinState;
  source: CheckinSource;
  originDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Meta = {
  schemaVersion: number;
  clientId: string;
  lastSyncAt: string | null;
  dataVersion: number;
  lastGeneratedDate: string | null;
};

export type Settings = {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
};

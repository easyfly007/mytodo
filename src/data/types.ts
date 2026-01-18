export type TaskType = "normal" | "recurring";
export type TaskStatus = "active" | "paused" | "archived";

export type RecurrenceRule = "every_n_days";

export type Recurrence = {
  rule: RecurrenceRule;
  interval: number;
};

export type Task = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  startDate: string;
  endDate: string | null;
  timezone: string;
  recurrence: Recurrence | null;
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

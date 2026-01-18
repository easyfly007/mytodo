import type { Checkin, Meta, Settings, Task } from "../data/types";
import { nowIso } from "../utils/date";

export type RemoteData = {
  tasks: Task[];
  checkins: Checkin[];
  meta: Meta;
};

type GithubFile = {
  sha?: string;
  content: string | null;
};

const DATA_PATHS = {
  tasks: "data/tasks.json",
  checkins: "data/checkins.json",
  meta: "data/meta.json",
};

const base64Encode = (value: string): string => {
  return btoa(unescape(encodeURIComponent(value)));
};

const base64Decode = (value: string): string => {
  return decodeURIComponent(escape(atob(value)));
};

const buildUrl = (settings: Settings, path: string, includeRef: boolean): string => {
  const base = `https://api.github.com/repos/${settings.githubOwner}/${settings.githubRepo}/contents/${path}`;
  return includeRef ? `${base}?ref=${settings.githubBranch}` : base;
};

const githubRequest = async (
  settings: Settings,
  path: string,
  includeRef: boolean,
  init?: RequestInit,
): Promise<Response> => {
  const url = buildUrl(settings, path, includeRef);
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.githubToken}`,
      ...(init?.headers ?? {}),
    },
  });
};

const getGithubFile = async (
  settings: Settings,
  path: string,
): Promise<GithubFile> => {
  const response = await githubRequest(settings, path, true);
  if (response.status === 404) {
    return { content: null };
  }
  if (!response.ok) {
    throw new Error(`读取 ${path} 失败：${response.status}`);
  }
  const data = (await response.json()) as { content: string; sha: string };
  return { content: data.content, sha: data.sha };
};

const putGithubFile = async (
  settings: Settings,
  path: string,
  content: string,
  sha?: string,
): Promise<void> => {
  const response = await githubRequest(settings, path, false, {
    method: "PUT",
    body: JSON.stringify({
      message: `update ${path}`,
      content: base64Encode(content),
      branch: settings.githubBranch,
      sha,
    }),
  });

  if (!response.ok) {
    throw new Error(`写入 ${path} 失败：${response.status}`);
  }
};

export const isSyncConfigured = (settings: Settings): boolean => {
  return (
    settings.githubToken.trim() !== "" &&
    settings.githubOwner.trim() !== "" &&
    settings.githubRepo.trim() !== ""
  );
};

export const pullFromGithub = async (
  settings: Settings,
): Promise<RemoteData | null> => {
  if (!isSyncConfigured(settings)) return null;

  const [tasksFile, checkinsFile, metaFile] = await Promise.all([
    getGithubFile(settings, DATA_PATHS.tasks),
    getGithubFile(settings, DATA_PATHS.checkins),
    getGithubFile(settings, DATA_PATHS.meta),
  ]);

  const tasks = tasksFile.content
    ? (JSON.parse(base64Decode(tasksFile.content)) as Task[])
    : [];
  const checkins = checkinsFile.content
    ? (JSON.parse(base64Decode(checkinsFile.content)) as Checkin[])
    : [];
  const meta = metaFile.content
    ? (JSON.parse(base64Decode(metaFile.content)) as Meta)
    : {
        schemaVersion: 1,
        clientId: "",
        lastSyncAt: null,
        dataVersion: 0,
        lastGeneratedDate: null,
      };

  return {
    tasks,
    checkins,
    meta,
  };
};

export const pushToGithub = async (
  settings: Settings,
  data: RemoteData,
): Promise<void> => {
  if (!isSyncConfigured(settings)) return;

  const [tasksFile, checkinsFile, metaFile] = await Promise.all([
    getGithubFile(settings, DATA_PATHS.tasks),
    getGithubFile(settings, DATA_PATHS.checkins),
    getGithubFile(settings, DATA_PATHS.meta),
  ]);

  await Promise.all([
    putGithubFile(
      settings,
      DATA_PATHS.tasks,
      JSON.stringify(data.tasks, null, 2),
      tasksFile.sha,
    ),
    putGithubFile(
      settings,
      DATA_PATHS.checkins,
      JSON.stringify(data.checkins, null, 2),
      checkinsFile.sha,
    ),
    putGithubFile(
      settings,
      DATA_PATHS.meta,
      JSON.stringify({ ...data.meta, lastSyncAt: nowIso() }, null, 2),
      metaFile.sha,
    ),
  ]);
};

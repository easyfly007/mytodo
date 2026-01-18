import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";

export const SettingsPage = () => {
  const { settings, updateSettings, syncNow, syncStatus, syncError, meta, syncReport } =
    useAppStore();
  const [token, setToken] = useState(settings.githubToken);
  const [owner, setOwner] = useState(settings.githubOwner);
  const [repo, setRepo] = useState(settings.githubRepo);
  const [branch, setBranch] = useState(settings.githubBranch);

  useEffect(() => {
    setToken(settings.githubToken);
    setOwner(settings.githubOwner);
    setRepo(settings.githubRepo);
    setBranch(settings.githubBranch);
  }, [settings]);

  const onSave = () => {
    updateSettings({
      githubToken: token.trim(),
      githubOwner: owner.trim(),
      githubRepo: repo.trim(),
      githubBranch: branch.trim() || "main",
    });
  };

  return (
    <div className="page">
      <h1>设置</h1>
      <div className="card">
        <div className="form-row">
          <label>GitHub Token</label>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="请输入 Personal Access Token"
          />
        </div>
        <div className="form-row">
          <label>仓库拥有者</label>
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="例如：yourname"
          />
        </div>
        <div className="form-row">
          <label>仓库名</label>
          <input
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            placeholder="例如：todo-data"
          />
        </div>
        <div className="form-row">
          <label>分支</label>
          <input
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            placeholder="main"
          />
        </div>
        <button className="primary" onClick={onSave}>
          保存设置
        </button>
        <button onClick={() => void syncNow()} disabled={syncStatus === "syncing"}>
          {syncStatus === "syncing" ? "同步中..." : "手动同步"}
        </button>
      </div>
      <div className="card">
        <div className="card-title">同步信息</div>
        <div className="card-meta">
          上次同步时间：
          {meta.lastSyncAt ? new Date(meta.lastSyncAt).toLocaleString() : "暂无"}
        </div>
        {syncReport && (
          <>
            <div className="card-meta">
              任务：拉取新增 {syncReport.tasks.pulledAdded}，拉取更新{" "}
              {syncReport.tasks.pulledUpdated}，推送新增 {syncReport.tasks.pushedAdded}
              ，推送更新 {syncReport.tasks.pushedUpdated}
            </div>
            <div className="card-meta">
              打卡：拉取新增 {syncReport.checkins.pulledAdded}，拉取更新{" "}
              {syncReport.checkins.pulledUpdated}，推送新增{" "}
              {syncReport.checkins.pushedAdded}，推送更新{" "}
              {syncReport.checkins.pushedUpdated}
            </div>
          </>
        )}
      </div>
      {syncStatus === "error" && syncError ? (
        <p className="muted">同步失败：{syncError}</p>
      ) : (
        <p className="muted">同步状态：{syncStatus}</p>
      )}
    </div>
  );
};

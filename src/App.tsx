import "./App.css";
import { NavLink, Route, Routes } from "react-router-dom";
import { TodayPage } from "./pages/TodayPage";
import { TasksPage } from "./pages/TasksPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAppStore } from "./store/appStore";
import { isSyncConfigured } from "./sync/githubSync";

const getSyncLabel = (
  configured: boolean,
  status: "idle" | "syncing" | "success" | "error",
): string => {
  if (!configured) return "未配置同步";
  if (status === "syncing") return "同步中";
  if (status === "success") return "已同步";
  if (status === "error") return "同步失败";
  return "未同步";
};

const App = () => {
  const { syncStatus, settings } = useAppStore();
  const syncLabel = getSyncLabel(isSyncConfigured(settings), syncStatus);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">MyTodo</div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
            今日
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => (isActive ? "active" : undefined)}>
            任务
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? "active" : undefined)}>
            统计
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            设置
          </NavLink>
        </nav>
        <div className="sync-status">{syncLabel}</div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

import { useMemo } from "react";
import { useAppStore } from "../store/appStore";
import { todayKey } from "../utils/date";
import { getMonthlyStats, getTaskMonthlyStats, getWeeklyStats } from "../utils/stats";

export const StatsPage = () => {
  const { checkins, tasks } = useAppStore();
  const monthKey = todayKey().slice(0, 7);
  const stats = useMemo(() => getMonthlyStats(checkins, monthKey), [checkins, monthKey]);
  const taskStats = useMemo(
    () => getTaskMonthlyStats(tasks, checkins, monthKey),
    [tasks, checkins, monthKey],
  );
  const weeklyStats = useMemo(() => getWeeklyStats(checkins), [checkins]);

  return (
    <div className="page">
      <h1>统计</h1>
      <div className="card">
        <div className="card-title">本月完成率</div>
        <div className="stat-value">
          {(stats.completionRate * 100).toFixed(1)}%
        </div>
        <div className="stat-grid">
          <div>
            <div className="stat-label">计划</div>
            <div className="stat-number">{stats.planned}</div>
          </div>
          <div>
            <div className="stat-label">完成</div>
            <div className="stat-number">{stats.done}</div>
          </div>
          <div>
            <div className="stat-label">推后</div>
            <div className="stat-number">{stats.postponed}</div>
          </div>
          <div>
            <div className="stat-label">取消</div>
            <div className="stat-number">{stats.canceled}</div>
          </div>
          <div>
            <div className="stat-label">未完成</div>
            <div className="stat-number">{stats.missed}</div>
          </div>
        </div>
      </div>

      <h2>本月任务完成率</h2>
      {taskStats.length === 0 ? (
        <p className="muted">暂无任务统计。</p>
      ) : (
        <div className="card-list">
          {taskStats.map((item) => (
            <div className="card" key={item.taskId}>
              <div className="card-title">{item.title}</div>
              <div className="card-meta">
                完成率 {(item.completionRate * 100).toFixed(1)}% · 完成{" "}
                {item.done}/{item.planned}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>最近 7 天趋势</h2>
      <div className="card">
        <div className="stat-grid">
          {weeklyStats.map((item) => (
            <div key={item.date}>
              <div className="stat-label">{item.date.slice(5)}</div>
              <div className="stat-number">
                {item.done}/{item.planned}
              </div>
              <div className="card-meta">
                推后 {item.postponed} · 取消 {item.canceled}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

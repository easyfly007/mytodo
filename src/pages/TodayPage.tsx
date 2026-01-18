import { useMemo } from "react";
import { useAppStore } from "../store/appStore";
import { todayKey } from "../utils/date";

const stateLabel: Record<string, string> = {
  pending: "待完成",
  done: "已完成",
  postponed: "已推后",
  canceled: "已取消",
  missed: "已错过",
};

export const TodayPage = () => {
  const { tasks, checkins, setCheckinState } = useAppStore();
  const today = todayKey();

  const todayItems = useMemo(() => {
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const order: Record<string, number> = {
      pending: 0,
      postponed: 1,
      canceled: 2,
      done: 3,
      missed: 4,
    };

    return checkins
      .filter((item) => item.date === today)
      .map((item) => ({
        checkin: item,
        task: taskMap.get(item.taskId),
      }))
      .filter((item) => item.task)
      .sort(
        (a, b) =>
          (order[a.checkin.state] ?? 99) - (order[b.checkin.state] ?? 99),
      );
  }, [checkins, tasks, today]);

  return (
    <div className="page">
      <h1>今日打卡</h1>
      {todayItems.length === 0 ? (
        <p className="muted">今天没有需要打卡的任务。</p>
      ) : (
        <div className="card-list">
          {todayItems.map(({ checkin, task }) => (
            <div key={checkin.id} className="card">
              <div className="card-title">{task?.title}</div>
              <div className="card-meta">
                状态：{stateLabel[checkin.state] ?? checkin.state}
              </div>
              <div className="card-meta">
                来源：{checkin.source === "scheduled" ? "计划" : "推后补偿"}
              </div>
              <div className="card-actions">
                <button
                  disabled={checkin.state === "done"}
                  onClick={() => setCheckinState(checkin.id, "done")}
                >
                  完成
                </button>
                <button
                  disabled={checkin.state === "postponed"}
                  onClick={() => setCheckinState(checkin.id, "postponed")}
                >
                  推后到明天
                </button>
                <button
                  disabled={checkin.state === "canceled"}
                  onClick={() => setCheckinState(checkin.id, "canceled")}
                >
                  取消
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

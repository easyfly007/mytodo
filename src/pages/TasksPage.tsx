import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import { todayKey } from "../utils/date";

export const TasksPage = () => {
  const { tasks, addTask, archiveTask, toggleTaskStatus, updateTask } = useAppStore();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayKey());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState(todayKey());

  const canSubmit = title.trim().length > 0;

  const onSubmit = () => {
    if (!canSubmit) return;
    addTask({
      title,
      startDate,
    });
    setTitle("");
  };

  const startEdit = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    setEditingId(taskId);
    setEditTitle(task.title);
    setEditStartDate(task.startDate);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    updateTask({
      ...task,
      title: editTitle.trim() || task.title,
      startDate: editStartDate,
    });
    setEditingId(null);
  };

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== "archived"),
    [tasks],
  );

  return (
    <div className="page">
      <h1>任务管理</h1>
      <div className="card">
        <div className="form-row">
          <label>标题</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：锻炼身体"
          />
        </div>
        <div className="form-row">
          <label>开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <button className="primary" onClick={onSubmit} disabled={!canSubmit}>
          新建任务
        </button>
      </div>

      <h2>当前任务</h2>
      {activeTasks.length === 0 ? (
        <p className="muted">暂无任务。</p>
      ) : (
        <div className="card-list">
          {activeTasks.map((task) => (
            <div className="card" key={task.id}>
              {editingId === task.id ? (
                <>
                  <div className="form-row">
                    <label>标题</label>
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label>开始日期</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(event) => setEditStartDate(event.target.value)}
                    />
                  </div>
                  <div className="card-actions">
                    <button className="primary" onClick={() => saveEdit(task.id)}>
                      保存
                    </button>
                    <button onClick={cancelEdit}>取消</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-title">{task.title}</div>
                  <div className="card-meta">普通任务</div>
                  <div className="card-meta">开始日期：{task.startDate}</div>
                  <div className="card-meta">
                    状态：{task.status === "active" ? "启用" : "暂停"}
                  </div>
                  <div className="card-actions">
                    <button onClick={() => startEdit(task.id)}>编辑</button>
                    <button onClick={() => toggleTaskStatus(task.id)}>
                      {task.status === "active" ? "暂停" : "启用"}
                    </button>
                    <button onClick={() => archiveTask(task.id)}>归档</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

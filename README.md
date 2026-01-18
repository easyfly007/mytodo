# MyTodo

一个支持跨设备同步的个人 Todo / 打卡应用，基于 PWA，可在 iPhone 与 Windows 上使用。  
后端使用 GitHub 私有仓库存储数据，适合个人场景，并可在未来扩展为多人模式。

## 功能概览
- 今日打卡：完成 / 推后 / 取消
- 任务管理：新增、编辑、暂停、归档
- 统计：月度完成率、任务维度完成率、最近 7 天趋势
- 跨设备同步：GitHub 私有仓库
- PWA：可安装到主屏 / 桌面

## 技术栈
- React + TypeScript + Vite
- IndexedDB 本地存储
- GitHub REST API 同步
- PWA（vite-plugin-pwa）

## 本地运行
在项目根目录执行：
```bash
npm install
npm run dev
```
打开终端输出的地址（通常是 `http://localhost:5173`）。

## 配置 GitHub 同步
1) 进入设置页，填写：
   - GitHub Token（需 `repo` 权限）
   - 仓库拥有者
   - 仓库名
   - 分支（默认 `main`）
2) 保存后点击“手动同步”
3) 应用会在仓库中创建以下文件：
   - `data/tasks.json`
   - `data/checkins.json`
   - `data/meta.json`

## iPhone 安装（PWA）
1) 用 Safari 打开应用地址  
2) 点击分享按钮 → “添加到主屏幕”  
3) 从主屏启动即可全屏使用

## 数据与目录结构
```
data/
  tasks.json
  checkins.json
  meta.json
```

## 技术文档
详见 `docs/TECHNICAL.md`。

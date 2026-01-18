# 技术文档

本文档说明 MyTodo 的技术实现与关键设计。

## 目标与原则
- 跨设备同步：iPhone + Windows
- 本地优先：离线可用，低耦合
- 简化冲突：基于时间戳的合并策略

## 架构概览
模块划分：
- UI 层：页面与组件
- 状态层：`AppStore` 管理任务/打卡/同步状态
- 本地存储：IndexedDB
- 同步层：GitHub REST API

数据流：
1) 用户操作 → 本地写入
2) 自动生成打卡 → 更新本地
3) 同步模块与 GitHub 拉取/推送

## 数据模型
核心类型在 `src/data/types.ts`：
- Task：任务定义
- Checkin：每日打卡实例
- Meta：同步元信息
- Settings：GitHub 配置

### Task
- `type`: `normal | recurring`
- `recurrence`: `{ rule: "every_n_days", interval }`
- `status`: `active | paused | archived`
- `startDate`: 用于计算每 N 天节奏

### Checkin
- `state`: `pending | done | postponed | canceled | missed`
- `source`: `scheduled | postponed`
- `originDate`: 推后时记录原日期

## 打卡生成逻辑
入口：`ensureScheduledCheckins`
- 若任务满足 `every_n_days`，且在日期范围内，生成 `scheduled` checkin
- 使用 `meta.lastGeneratedDate` 避免重复生成

## 未完成自动标记
入口：`applyMissedCheckins`
- 当天之前的 `pending` 会自动标记为 `missed`
- 确保统计口径一致

## 同步机制（GitHub 私有仓库）
文件路径：
- `data/tasks.json`
- `data/checkins.json`
- `data/meta.json`

流程：
1) 启动时拉取远端
2) 按 `updatedAt` 合并（LWW）
3) 推送合并后的结果
4) 本地变更会自动节流推送

冲突规则：
- 同 ID 记录，`updatedAt` 较新的优先
- 未做字段级合并，属于最后写入优先策略

同步报告：
- 统计拉取/推送的新增与更新数量
- 在设置页展示以便快速判断冲突规模

## 统计逻辑
入口：`src/utils/stats.ts`
- 月度完成率（只统计 `scheduled` 计划打卡）
- 任务维度完成率
- 最近 7 天趋势（完成/计划/推后/取消）

## PWA 支持
插件：`vite-plugin-pwa`
- `registerSW` 自动注册
- `manifest` 用于安装到主屏

## 安全与隐私
- GitHub Token 保存在本地 IndexedDB
- 不上传敏感信息到第三方服务
- 建议仓库设置为私有

## 已知限制
- 冲突合并为 LWW，复杂协作需后端支持
- PWA 推送通知未实现
- 同步依赖 GitHub API 限流

# mianmian 多模型 AI 搜索对比 App — 产品需求文档 v2.0

**文档版本**: 2.0  
**更新日期**: 2026-06-21  
**产品定位**: 同时向多个 AI 模型提问，对比回答质量

---

## 1. 核心功能模块

| 模块 | 功能 | 状态 |
|------|------|------|
| **对话引擎** | 多模型并行调用、流式接收、轮次管理 | ✅ 已完成 |
| **模型管理** | 预设模型配置、自定义模型、API Key 管理 | ✅ 已完成 |
| **热点新闻** | 百度/微博/知乎三源获取、24h去重、下拉刷新 | ✅ 已完成 |
| **历史记录** | 对话存储、模型统计、轮数统计 | ✅ 已完成 |
| **主题系统** | 浅色/深色/跟随系统三种模式（持久化） | ✅ 已完成 |
| **首次引导** | 新用户操作指南、双击 mianmian 可再次查看 | ✅ 已完成 |
| **模型测试** | 启动自动检测、手动下拉测试、状态图标同步 | ✅ 已完成 |

## 2. 交互规范

| 场景 | 交互 | 反馈 |
|------|------|------|
| 发送问题 | 底部输入框回车 | 缩小状态栏显示进度，完成后渐出消失 |
| 浏览答案 | 横向滑动切换模型 | 模型标签栏高亮当前选中 |
| 下拉刷新 | 在首页/模型管理页下拉 | 热点更新 / 模型重测 |
| 首次启动 | App 打开自动弹出 | 使用指南弹窗，3步说明核心操作 |
| 重新查看指南 | 双击首页"mianmian"文字 | 使用指南弹窗 |
| 主题切换 | 模型管理页右上角按钮 | 三个按钮：☀ 浅色、🌙 深色、A 自动 |

## 3. 模型状态可视化

| 状态 | 图标颜色 | 含义 |
|------|---------|------|
| 🔵 彩色（原色） | 模型品牌色 | 连接正常，已配置 |
| ⚪ 灰色 | #888888 | 连接异常或未测试 |
| ⬜ 虚线边框 | 灰色虚线 | 未配置 API Key |

## 4. 对话流优化

| 优化项 | 方案 | 效果 |
|--------|------|------|
| 响应批量更新 | useRef + 200ms 合并 flush | 减少 80% 渲染次数 |
| 渲染分离 | 状态栏与历史列表分离渲染 | 消除状态栏闪烁 |
| 组件缓存 | RoundBlock 使用 React.memo | 减少不必要重渲染 |
| 条件滚动 | 仅新轮次完成时滚动 | 消除滚动抖动 |
| 渐出动画 | 状态栏 fade-out + 答案 slide-up | 流畅过渡 |

## 5. 数据持久化

| 数据 | 存储方式 | 过期策略 |
|------|---------|---------|
| 对话记录 | AsyncStorage `@mianmian_conversations` | 30天自动清理 |
| 账户配置 | AsyncStorage `@mianmian_accounts` | 永久 |
| 设置 | AsyncStorage `@mianmian_settings` | 永久 |
| 主题选择 | AsyncStorage `@mianmian_theme_mode` | 永久 |
| 引导标记 | AsyncStorage `@mianmian_guide_shown` | 永久 |
| 热点去重 | AsyncStorage `@mianmian_shown_news` | 24小时过期 |
| 对话统计 | 启动时迁移计算 | 自动更新 |

## 6. API 支持

| 模型 | 格式 | Web Search | 预设端点 |
|------|------|-----------|---------|
| OpenAI | openai | function calling | api.openai.com |
| Claude | claude | - | api.anthropic.com |
| Gemini | gemini | - | generativelanguage.googleapis.com |
| DeepSeek | openai | enable_search 参数 | api.deepseek.com |
| Kimi | openai | - | api.moonshot.cn |
| MiMo | openai | web_search 工具 | api.xiaomimimo.com |
| 通义千问 | openai | - | dashscope.aliyuncs.com |
| 豆包 | openai | - | ark.cn-beijing.volces.com |

## 7. 已知待修复问题

| 优先级 | 问题 | 影响 |
|--------|------|------|
| 🔴 高 | AccountScreen 下拉测试并发写入 tokenUsage 存在竞态 | 可能丢失统计数据 |
| 🟡 中 | 主题选择已修复持久化 | - |
| 🟡 中 | HistoryScreen 轮询已改为 useFocusEffect | - |

# 两个分支：main 和 dev

自 2026-10-27 起，只保留：

| 分支 | 用途 |
|---|---|
| main | 稳定版。此次整理不把新 UI 合并进去。 |
| dev | 最新开发与测试版，包括 A 方案、修正版胶囊、俚语/verlan、最新 main 的已有功能。后续日常修改统一在这里继续。 |

[打开 dev](https://github.com/Chinesegrandma/parlons-ai/tree/dev) · [下载 dev ZIP](https://github.com/Chinesegrandma/parlons-ai/archive/refs/heads/dev.zip)

测试通过并经用户确认后，再把 dev 合并到 main。此次仅整理分支、更新文档与 CI 目标；没有部署，没有调用真实 API，也没有改变应用运行逻辑。

## 整理依据

整理前最新 main 为 `a7bebd8`，最新设计分支为 `d7f184b`。main 的全部提交已经包含在设计分支内。

以下旧远程分支的历史均已包含在新 dev 中，因此删除旧名称：

- design/inline-learning-chat：改名为 dev；最新功能完整保留。
- design/sage-glass：历史已包含。
- feat/feedback-below-learner：历史已包含。
- work：历史已包含。

`feat/inline-correction-chat-ui` 另有 6 个独立提交，属于早期并行聊天 UI 方案及其测试/CI；新 A 方案已覆盖其布局目标，但不应把旧实现覆盖到新实现上。该分支的原始提交 `81082d6` 完整保存为 **归档标签** `archive/inline-correction-ui-2026-10-27`，然后删除旧分支名称。

标签只保存历史，不是第三个活跃分支。需要查看旧实现时，可在 GitHub Tags 中找到它。

CI 配置在 dev 中已改为对 main/dev 的 push 与以 main/dev 为目标的 PR 运行 mock 检查。main 的现有文件暂未改动；此 CI 配置会随将来的 dev 合并进入 main。

旧的设计分支链接不再使用，请统一用上方 dev 链接。此前提供的固定提交截图链接仍然指向历史版本。GitHub 改动不会自动更新电脑中的旧 ZIP 文件夹；请重新下载或在 Git 工作副本切换/拉取 dev。

# 临时隧道版本验证记录

日期：2026-10-22。替代 Render 部署方案，无托管资源创建。

变更：
- `backend/app/security.py`：统一登录入口、签名会话 Cookie、登录失败限流、
  原子 SQLite 请求计数、跨站写入保护、上传大小上限和安全响应头。
- `backend/app/main.py`：受保护的同源 API 与网页网关、启动配置校验。
- `scripts/run_local.py`：`--tunnel` 模式，构建独立 Next.js 服务，
  只向 cloudflared 暴露受保护入口，生成访问口令，并统一关闭子进程。
- `frontend/next.config.mjs`、`frontend/components/Studio.tsx`、
  `frontend/lib/types.ts`：生产独立输出、私人模式标记和退出登录。
- `backend/tests/conftest.py`、`backend/tests/test_private_site.py`：隔离配置，
  增加登录/绕过防护、Cookie、CSRF、请求体限制、并发额度、持久化和失败关闭测试。
- `scripts/check.sh`：将启动器加入 Python 格式与静态检查。
- `README.md`、`docs/TEMPORARY_TUNNEL.md`：电脑安装、手机访问、真实模式和关闭说明。

验证结果：
- 后端 pytest：85 项通过，包含新增 23 项私人入口测试。
- 前端 Vitest：37 项通过。
- Ruff、Prettier、ESLint、TypeScript、Next.js 生产构建通过。
- 离线评估脚本通过；仅验证脚本和固定样例，不代表真实语言质量。
- Chromium 连接实际生产网页与网关：登录、资源加载、模拟聊天、假麦克风录音、
  编辑转写、发送、刷新历史和退出登录通过。浏览器外部请求被拦截，记录为零。
- 启动器全流程使用替身 cloudflared 测试：Ctrl+C 后两个本地端口关闭，
  替身隧道进程停止。

所有开发与测试均为 `MOCK_AI=true`，未调用 OpenAI/ElevenLabs 真实服务。
未建立真实 Cloudflare 隧道，未生成公网地址，未验证手机或 Cloudflare 网络连通性。
当前环境未安装 cloudflared；请在运行应用的电脑上按指南安装后执行命令。
官方文档在本次环境请求中返回 403，未据此宣称核验了最新免费方案条款。

已知限制：Starlette TestClient/httpx 产生一条弃用警告，目前测试通过。
这是单人测试站点，非多用户生产认证系统；Cookie 为有效期内的签名令牌，
退出登录清除浏览器 Cookie，重启更换签名密钥使旧令牌失效。
公开运营仍需独立账号、数据隔离、备份、审计、隐私政策与提供商费用控制。

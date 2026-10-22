# 手机访问：本地运行 + 临时 HTTPS 隧道

无需 Render、托管账号或 GitHub 授权。程序运行在执行命令的电脑上，
SQLite 历史记录也保存在该电脑的 `backend/parlons.sqlite3`，请自行备份。
临时隧道不是正式托管：电脑关机、睡眠、断网或关闭终端都会中断访问；
Cloudflare 的免费 Quick Tunnel 没有可用性保证。

## 安装与启动

先安装 Python 3.11+、Node.js 22/24 LTS，以及 Cloudflare 官方的 `cloudflared`：
<https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/>

- macOS（已安装 Homebrew）：`brew install cloudflared`
- Windows（支持 winget）：`winget install --id Cloudflare.cloudflared`
- Linux：按官方说明安装适合系统架构的软件包。

安装后重新打开终端，确认 `cloudflared --version`，进入仓库目录。
先检查模拟流程（固定回复与提示音，不会调用两家 API）：

```bash
python scripts/run_local.py --tunnel
```

macOS/Linux 若 `python` 不存在，改用 `python3`。首次启动会安装项目依赖并构建网页。
准备真实测试时，用下面命令重新启动：

```bash
python scripts/run_local.py --tunnel --real
```

真实模式会隐藏输入缺少的 API 密钥，不保存到磁盘；已有后端 `.env` 或环境变量也可使用。
在 Codex 云环境添加的密钥不会自动出现在你的电脑上。
真实调用仅在主动发送文字、提交转写、请求朗读时发生；自动朗读同样消耗额度。

终端输出本次 `Private tunnel site password` 和 Cloudflare 分配的
`https://....trycloudflare.com` 地址。在手机浏览器打开这个 HTTPS 地址，输入站点密码，
允许麦克风权限。使用首页，不是 `/demo`。默认网页内部端口 3000、受保护入口 8000，
两个都只监听本机；隧道只指向入口 8000。可用 `--port` 和 `--api-port` 更改。
不要手动给内部 Next.js 端口另开隧道。

如果已有 `~/.cloudflared/config.yaml`，Quick Tunnel 可能无法运行；
按官方 Quick Tunnel 说明处理已有配置，不要删除正式隧道配置：
<https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/>

## 保护与测试

每次启动默认生成随机口令和会话签名密钥，旧登录会话失效。
也可提前设置 `SITE_PASSWORD`（至少 12 字符）；不要使用 API 密钥作为口令。
登录 Cookie 有效 12 小时，启用 Secure、HttpOnly、SameSite=Strict。
所有网页、静态资源和 API 都需要登录，仅登录页及最小存活探针例外。
每分钟最多 10 次登录尝试；生成、转写、朗读请求合计默认每分钟 12 次、每天 100 次，
可通过 `MAX_CALLS_PER_MINUTE`、`MAX_CALLS_PER_DAY` 调整。SQLite 原子计数跨进程共享，
在数据库保留时重启仍保留计数；删除数据库也会清除计数。
计数包括失败请求，是请求次数限制，不是精确费用或 token 上限。
请同时在提供商后台设置可用的预算控制及告警；部分预算告警不是硬性停用额度。

建议手机测试：登录 → 场景开场 → 录一句法语 → 检查/编辑转写 → 发送 →
查看纠错和回复 → 听自动朗读 → 0.8 倍播放 → 刷新检查历史 → 退出登录。
iPhone Safari 可能拦截自动播放；出现播放按钮时手动点击即可。
模拟测试无法验证真实法语识别、口音或纠错质量。

完成后按 **Ctrl+C**，启动器会关闭隧道及两个服务；确认旧地址不能再访问。
无需每次测试都轮换提供商密钥；若密钥泄露、误发到聊天或提交进 Git，则立即撤销并重新生成。
站点口令不要转发，不要使用敏感个人内容进行测试。

## 当前边界

这是单人试用入口，不是多用户生产系统。Cloudflare 会转发流量，文本/录音会按功能
发送给 OpenAI/ElevenLabs，仍需考虑各方数据保留政策。浏览器录音不会由应用长期保存。
正式公开前仍需独立账号、用户数据隔离、密码恢复、审计、备份和完整隐私政策。
当前网关缓冲响应，未实现流式 LLM 或实时语音通话。

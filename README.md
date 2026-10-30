# Parlons AI — French speaking practice

Next.js frontend → FastAPI backend → OpenAI for text tutoring and ElevenLabs for
STT/TTS. SQLite retains conversation and transcript text. This is a local
prototype, not a production deployment or a validated language assessment tool.

**Development defaults to `MOCK_AI=true`. Do not disable it or run real provider
smoke tests until explicitly approved. No real API calls are needed for setup,
tests, builds, or the included offline evaluations.**

## 手机打开临时测试网址

已支持“本地运行 + Cloudflare 临时隧道”，保留口令登录与限流，
不需要 Render。运行 `python scripts/run_local.py --tunnel` 先验证模拟流程；
真实调用使用 `--tunnel --real`。终端会显示 HTTPS 地址和本次访问口令。
安装、密钥输入和关闭方法见 [临时隧道指南](docs/TEMPORARY_TUNNEL.md)。

## 分支与最新版

**只保留两个分支：`main` 是稳定版，`dev` 是包含最新 UI 和功能的测试版。**
日常改动统一在 `dev` 上继续，测试通过并得到确认后再合并到 `main`。
[分支整理说明](docs/BRANCHES.md) · [下载最新版 dev](https://github.com/Chinesegrandma/parlons-ai/archive/refs/heads/dev.zip)

`dev`：单行 Camille 顶栏、底部输入栏、默认折叠的学习胶囊，
手机原地展开 / 宽屏右侧学习栏。学习卡采用 [A 方案](docs/DIRECTION_A_LEARNING.md)：纠错为主体，下方可选更礼貌、俚语；
俚语按语境生成，不强行替换，见 [定义与验证限制](docs/FRENCH_SLANG.md)。
设置与笔记本在 Camille 的下拉菜单中。
输入栏已改为 [同位置录音、停止、发送](docs/SINGLE_ACTION_COMPOSER.md)，两种表达改写均针对完整发言。
详情、截图和测试步骤见 [聊天布局说明](docs/INLINE_LEARNING_CHAT.md)。本次改动暂不合并 main。

社交场景新增 [关注个人细节的对话节奏与逐条 0.8× 播放](docs/SOCIAL_CONVERSATION_AND_SLOW_AUDIO.md)。

聊天纠错现在按 1、2、3 列出各处错误；更正句支持发音、复制。点 AI 句子、自己的句子或更正句中的词，或拖选短语，可打开语境查义，点击“查询含义”后才调用 AI。查义跟随中/英文界面，结果不会写入聊天历史。修复、使用方法和验证范围见 [纠错与查词更新](docs/FEEDBACK_AND_LOOKUP.md)。

## 表达挑战

首页最后一个板块为 **表达挑战**：一分钟观点、描述猜词、故事接龙、讨论与辩论。
猜词提供 61 个分类目标词，支持自定义词条并保存在当前浏览器；其余挑战各有三个起始题。均可选择三档练习难度，辩论可选立场；观点计时可关闭或暂停，不自动发送。
沿用语音、慢速播放、纠错、收藏和总结。说明与验证范围见 [表达挑战](docs/EXPRESSION_CHALLENGES.md)。

## Features

- A category-first practice home: life admin, everyday life, social life, study/work,
  and interviews. Bank, hospital and university groups expand into specific situations;
  selecting a leaf enters chat immediately. A separate button starts free chat.
- Existing word-level correction cards, local notebook and spaced review records,
  custom situations, voice selection, practice preferences and home-screen installation
  remain available. Notebook data is local to a browser origin; export before changing
  temporary tunnel addresses.
- Guided practice keeps transcript review and feedback per turn. Conversation mode
  detects a pause locally, transcribes and sends automatically, speaks the reply, then
  listens again. Pause now submits the current utterance and finishes its reply before
  pausing; Cancel, mode switching, leaving the page and errors stop unfinished capture.
  This is sequential STT → LLM → TTS, **not streaming or interruptible full-duplex audio**.
- Finish & review examines the full stored text history for both strengths and
  corrections. Evidence quotes must occur in learner messages. Very long sessions are
  rejected explicitly rather than silently reviewed only in part. Reviews can miss errors;
  they do not assess pronunciation and are not retained across refreshes.
- Chinese and English settings apply to the interface and newly generated explanations
  and reviews. French remains the practice language. Previous generated feedback is not
  overwritten; opening a learning card can translate its explanation on demand.
  Settings call this “Language” and “Practice preferences.”
- Camille is the default female AI assistant persona, with an inline illustrated avatar
  and a short introduction persisted once in each new conversation opening.
- New English feedback has an explicit language contract and a bounded repair for
  clearly non-English explanations; French dialogue and corrected examples remain French.
- Openings now autoplay once after entering a new conversation, respecting the saved
  autoplay setting. A blocked browser exposes a cached-audio playback fallback.
- A backend-owned opening message is saved atomically with each session and always
  included in LLM context alongside the most recent 12 non-opening messages.
- The browser remembers the session ID. Refresh resumes its stored history;
  idempotent session creation and a unique database index prevent duplicate openers,
  including React StrictMode retries. “New session” explicitly creates another ID.
- Microphone recordings are transcribed into a **reviewable draft**, never sent
  automatically. The exact provider transcript is immutable in SQLite; the edited
  message is stored separately when sent. History exposes both versions.
- Raw recording blobs are released after upload and are not deliberately saved by
  the app. Multipart parsing may use temporary spooled files, closed after each
  request. Provider-side retention is separate and needs review before real use.
- AI replies play automatically when speech is available. Autoplay can be disabled;
  slow playback uses 0.8× speed. Both preferences persist locally. A browser autoplay
  rejection exposes a manual “Play response” button using the already-fetched audio.
  New playback cancels pending synthesis and stops old audio. Audio stops when
  recording or changing sessions, and on unmount.
- `/health` supplies `speech_ready` for playback and `stt_ready` for recording.
  Missing speech configuration disables the relevant controls while keeping text
  chat usable. Status indicates configured capabilities, not a live provider probe.
- Mock STT returns a fixed sentence; mock tutoring returns a fixed reply without
  correction; mock TTS produces a short synthetic **tone, not spoken French**.

## Repository structure

```text
backend/
  app/main.py             # HTTP API, lifespan, SQLite persistence and migration
  app/providers.py        # Validated provider responses and network-free mock transport
  tests/                  # API, persistence and offline evaluator regression tests
  requirements.txt        # Runtime dependencies
  requirements-dev.txt    # Runtime + pytest and Ruff
  .env.example
frontend/
  app/                    # Page composition, layout and styles
  components/             # Topics, transcript composer, messages and playback settings
  hooks/                  # Session state, recording and audio lifecycle
  lib/                    # Typed API client and shared types
  tests/                  # React/jsdom interaction and lifecycle tests
  package-lock.json
  .env.local.example
evaluations/
  french_cases.json       # 20 hand-authored French examples
  fixtures/audio/         # 4 labeled offline synthetic speech WAV fixtures
  fixtures/mock_predictions.json # Scripted scorer inputs, not provider outputs
  evaluate.py             # Offline metrics; never calls a provider
scripts/check.sh          # Complete checks with mock mode forced on
```

## Interactive studio and offline demo

The studio now includes four conversation scenes, phrase starters, a transcript
review step, an independent feedback panel, playback preferences and a usage guide.
The layout adapts to desktop and mobile. Practice counts reflect actual messages,
not invented scores or proficiency ratings.

The normal frontend route uses the backend. `/demo` is a separate **local scripted
experience** requiring no backend, API key, network request or microphone access.
Its recording button demonstrates the workflow using sample text, and playback
produces a short tone. It does not recognize speech or evaluate language quality.
Demo conversations are retained locally in this browser; avoid entering sensitive data.

For a single HTML file you can download and open in a modern browser:

```bash
cd frontend
npm run build:demo
```

Open `frontend/public/parlons-demo.html` (relative to the repository root).
It contains its own JavaScript and styles, requires no installation on the device
opening it, and makes no API requests. The file is generated and ignored by Git;
`npm run dev` and `npm run build` regenerate it automatically. The regular page's
“No key” demo link also opens the demo route when the frontend is running.

## 在自己电脑启动真实语音网页

安装 Python 3.11+ 和 Node.js 22/24 LTS，下载或克隆当前项目后，在项目根目录运行：

```bash
python3 scripts/run_local.py --real
```

Windows 如果没有 `python3` 命令，可用 `python scripts/run_local.py --real`。
启动器会在首次运行时准备后端虚拟环境和前端依赖，随后自动打开浏览器。
如果本机没有配置密钥，会在**终端隐藏输入**中请求 OpenAI 与 ElevenLabs 密钥；
输入不会回显，也不会写入文件或网页。已有的 `backend/.env` 不会被修改。
云环境中的密钥不会自动复制到你的电脑，因此本机首次启动可能需要重新输入。
启动器不再询问 Voice ID；未配置时自动使用项目当前默认声音，已有配置保持不变。
多个声音可通过服务端 `ELEVENLABS_VOICES_JSON` 一次配置，在网页“设置 → 声音”中选择。

请打开启动器自动打开的**根页面**，不是 `/demo` 或离线 HTML。
页面应显示「真实 API 模式」和「真实调用已开启」。允许浏览器使用麦克风，
点击录音、再次点击结束，编辑转写后发送，随后听回复并查看文字纠错。
录音转写、发送和朗读可能消耗额度；自动朗读可以关闭。打开页面和健康检查
不会主动生成语音或调用文字模型。按 Ctrl+C 停止两个服务。

不加 `--real` 则默认保持 mock 模式。前端通过 `/api/backend` 转发到本机后端，
不用手动配置浏览器的后端地址。可用 `--port`、`--api-port` 更改被占用的端口。
此启动器仅绑定本机回环地址；不要把无访问保护的服务公开到互联网。

## Local setup

Requires Python 3.11+ and Node.js 20.9+ (Node 22 or 24 LTS recommended).
Commands below are run from the repository root unless noted. Do not overwrite
existing local environment files; copy examples only when the target is absent.

Backend, terminal 1:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
# Optional: cp .env.example .env (only if .env does not exist)
MOCK_AI=true uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, terminal 2:

```bash
cd frontend
npm ci
# Optional: cp .env.local.example .env.local (only if it does not exist)
MOCK_AI=true npm run dev -- --hostname 127.0.0.1 --port 3000
```

Use the local frontend on port 3000, with browser origin `http://localhost:3000`
matching the default backend CORS setting. Backend documentation is at `/docs` on
port 8000. No API keys are required in mock mode. `MOCK_AI` is enforced by the
backend; the frontend displays the backend's mode and readiness flags.

The default database is `backend/parlons.sqlite3`; `DATABASE_PATH` can override it.
Startup uses FastAPI lifespan and applies an additive, repeatable migration for
v0.2 databases, preserving old messages and adding one opening per old session.
Back up any valuable database before a version upgrade.

## Configuration

| Variable | Meaning |
| --- | --- |
| `MOCK_AI` | Defaults to `true`; only the explicit value `false` enables live provider paths. Keep `true` throughout development and tests. |
| `PARLONS_OPENAI_API_KEY` | Preferred server-side key name, supported by cloud network secrets; used only with mock mode disabled. Without either key, live-mode text chat uses canned demo replies. |
| `OPENAI_API_KEY` | Legacy local configuration fallback. A nonblank `PARLONS_OPENAI_API_KEY` takes priority. The cloud secret configuration reserves the `OPENAI_` prefix. |
| `OPENAI_MODEL` | Text model; default `gpt-4.1-mini`. |
| `ELEVENLABS_API_KEY` | Server-side key for real STT/TTS, ignored in mock mode. |
| `ELEVENLABS_VOICE_ID` | Default TTS voice; the launcher supplies the project default when absent. |
| `ELEVENLABS_VOICES_JSON` | Optional JSON object of voice aliases to `{name, voice_id}`; up to 61 custom entries. |
| `ELEVENLABS_TTS_MODEL` | Default `eleven_multilingual_v2`; check account availability before real tests. |
| `ELEVENLABS_STT_MODEL` | Default `scribe_v1`; check account availability before real tests. |
| `FRONTEND_ORIGIN` | Default `http://localhost:3000`. |
| `NEXT_PUBLIC_API_URL` | Optional browser API override; defaults to same-origin `/api/backend`. Never place keys here. |
| `PARLONS_BACKEND_URL` | Frontend server-only proxy destination, default `http://127.0.0.1:8000`. |
| `DATABASE_PATH` | Optional SQLite path; its parent directory must exist. |

## Automated checks — mock mode only

Install backend development and frontend dependencies first. From the root:

```bash
PARLONS_PYTHON="$PWD/backend/.venv/bin/python" bash scripts/check.sh
```

Or run separately:

```bash
cd backend
MOCK_AI=true .venv/bin/python -m pytest -q
MOCK_AI=true .venv/bin/python -m ruff check --config pyproject.toml app tests ../evaluations
MOCK_AI=true .venv/bin/python -m ruff format --config pyproject.toml --check app tests ../evaluations
cd ../frontend
MOCK_AI=true npm run format:check
MOCK_AI=true npm run lint
MOCK_AI=true npm run typecheck
MOCK_AI=true npm test
MOCK_AI=true NEXT_TELEMETRY_DISABLED=1 npm run build
```

Formatting: run the Ruff command without `--check`, and `npm run format`.
Stop the frontend dev server before building in the same directory. Do not run
`npm ci` concurrently with frontend builds or services.

Backend tests force mock mode, use in-memory HTTP transports, block socket
connections and isolate SQLite in temporary directories. Frontend tests use jsdom,
mocked media APIs, and a default rejecting fetch stub. They do not contact backend
or external services. An upstream Starlette TestClient/httpx deprecation warning
may appear; app startup itself no longer uses deprecated `on_event` handlers.

## Language evaluation

See [evaluations/README.md](evaluations/README.md) for input formats, formulas,
coverage reporting and audio provenance. Run from the root:

```bash
MOCK_AI=true python3 evaluations/evaluate.py
MOCK_AI=true python3 evaluations/evaluate.py \
  --predictions evaluations/fixtures/mock_predictions.json
```

The first command reports no evaluated predictions and null scores. The second
checks arithmetic with **hand-scripted mock outputs** and labeled synthetic audio;
its numbers are not real correction or recognition-quality measurements. Speech
scoring requires actual audio, its matching fingerprint and a reference transcript.
Text-only pronunciation prompts are never counted as speech recognition tests.

## Known limitations

- Real OpenAI corrections, French voice quality, STT accuracy, costs and provider
  latency have not been evaluated. There are no pronunciation scores.
- The starter dataset and synthetic eSpeak speech are not representative learner
  recordings. Real quality needs consented recordings and independently reviewed
  reference transcripts/correction labels.
- jsdom tests simulate playback restrictions and recording. Physical microphones,
  codecs, mobile browsers and real browser autoplay policies still need manual QA.
- Unsent drafts are held in page memory and are lost on refresh. Stored transcript
  text remains in the database, including discarded drafts, until a retention policy
  is implemented. Browser session restoration needs working local storage.
- Chat submission has no server-side idempotency key: an ambiguous network failure
  after commit can require checking history before retrying. Only session creation
  is idempotent. History context is bounded, without long-term learner memory.
- Health flags describe configuration/mock capabilities, not provider availability.
- Uploads are limited to 8 MB; browser recording stops after 60 seconds. Recognition
  may normalize mistakes; correcting transcript text does not evaluate pronunciation.

## Before production

Do not expose this prototype publicly. Add authentication and per-user ownership
checks for sessions/transcripts, authorization tests, rate limits, quotas and abuse
controls, HTTPS and correct origin restrictions, and secure secrets management.
Add streaming/request-level upload limits (before multipart buffering), audio
content validation, concurrent-turn controls and idempotent chat submissions.
Establish consent, provider retention/data-processing settings, transcript/history
retention and deletion, access-controlled backups and privacy-safe monitoring.
Review dependency advisories and run browser/accessibility/security testing before
release. Never send API keys to the browser or commit them.

No deployment or real provider smoke test is part of the current verification.

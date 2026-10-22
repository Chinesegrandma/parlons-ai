#!/usr/bin/env bash
set -euo pipefail
export MOCK_AI=true
export NEXT_TELEMETRY_DISABLED=1
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
parlons_python="${PARLONS_PYTHON:-python3}"
cd "$repo_root/backend"
"$parlons_python" -m ruff check --config pyproject.toml app tests ../evaluations ../scripts/run_local.py
"$parlons_python" -m ruff format --config pyproject.toml --check app tests ../evaluations ../scripts/run_local.py
"$parlons_python" -m pytest -q
cd "$repo_root"
"$parlons_python" evaluations/evaluate.py --predictions evaluations/fixtures/mock_predictions.json
cd "$repo_root/frontend"
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build

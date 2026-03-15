#!/bin/sh
set -eu

if [ ! -d .git ]; then
  echo "Ошибка: git-репозиторий не инициализирован."
  exit 1
fi

branch=$(git branch --show-current 2>/dev/null || true)
if [ -z "$branch" ]; then
  branch="main"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Ошибка: не настроен remote 'origin'. Добавьте его командой:"
  echo "git remote add origin <URL_ВАШЕГО_GITHUB_РЕПОЗИТОРИЯ>"
  exit 1
fi

git pull --rebase origin "$branch"

echo "Готово: изменения загружены из GitHub."

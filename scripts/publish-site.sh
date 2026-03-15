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

message=${1:-"publish: $(date '+%Y-%m-%d %H:%M:%S')"}

echo "1/4 Собираем проект..."
npm run build

echo "2/4 Подготавливаем commit..."
git add -A

if git diff --cached --quiet; then
  echo "Изменений для отправки нет. Сайт уже синхронизирован."
  exit 0
fi

git commit -m "$message"

echo "3/4 Обновляем локальную ветку из GitHub..."
git pull --rebase origin "$branch"

echo "4/4 Отправляем в GitHub..."
git push -u origin "$branch"

echo "Готово: код отправлен в GitHub. GitHub Actions сам обновит сайт."

# Constructor freeze backup 2026-04-01

Финальный backup-снимок стабильного состояния после:
- фикса resize фигур
- фикса скачка при corner resize
- проверки lines/effect-режимов
- code splitting конструктора и связанных модалок
- устранения предупреждения Vite о крупном chunk

Содержимое:
- src/components/constructor/ — текущая версия UI и документации конструктора
- src/components/ConstructorRoute.jsx — lazy route-обёртка конструктора
- src/hooks/useConstructorState.js — актуальная бизнес-логика конструктора
- src/utils/constructor/ — resize и shape utils
- src/App.jsx — текущая интеграция маршрута в приложение
- vite.config.js — текущая конфигурация chunk splitting

Назначение:
- ручной откат к зафиксированной стабильной сборке без поиска по истории правок

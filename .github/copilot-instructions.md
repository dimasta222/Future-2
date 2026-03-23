# Project Guidelines

## Build and Test

- Use `npm run build` to validate production сборку после существенных изменений.
- Use `npm run lint` после изменений в React-компонентах, hook-файлах и shared-модулях.

## Documentation Updates

- If you add, remove, rename, or materially change constructor functionality, you must update the constructor documentation in the same task.
- Constructor documentation set:
  - `src/components/constructor/README.md`
  - `src/components/constructor/EDITING_GUIDE.md`
  - `src/components/constructor/TECHNICAL_MAP.md`
- Update these files not only for new files, but also for:
  - new tabs
  - new handlers or state flows
  - new order logic
  - new preview behavior
  - new preset print logic
  - moved responsibilities between files
- If a constructor change affects only one of these documents directly, still verify whether the other two also need adjustment.

## Architecture

- Keep constructor business logic in `src/hooks/useConstructorState.js` when possible.
- Keep constructor-specific config and helpers in `src/components/constructor/constructorConfig.js`.
- Keep constructor UI components presentational when practical.
- Avoid growing `src/App.jsx` with new constructor-specific logic if that logic can live in the constructor hook or constructor config module.
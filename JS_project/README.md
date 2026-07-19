# DB Tools JavaScript workspace

Новый независимый JavaScript-монорепозиторий. Он не читает и не мигрирует данные старого Java-приложения.

## Запуск

```powershell
npm.cmd install
npm.cmd run dev
```

- app UI: http://localhost:5173
- app API: http://localhost:3001
- pg-tools demo host: http://localhost:5174

Демонстрационный вертикальный срез выполняет SQL через безопасный mock transport. Реального подключения к БД и секретов в проекте нет.

## Структура

- `app/` — самостоятельное React + Node.js приложение.
- `pg-tools/` — встраиваемая React-модалка и локальный demo host.
- `packages/contracts/` — runtime-контракты провайдеров и host API.
- `packages/sql-core/` — переиспользуемые ограничения и журнал.
- `packages/ui/` — общие React-компоненты SQL и AG Grid.
- `packages/provider-postgresql/` — первый provider descriptor без драйвера и соединения.
- `docs/` — архитектура, безопасность и контракт интеграции.

## Desktop и обновления

`npm.cmd run dev:desktop` запускает основное приложение в Electron. Механизм публичной доставки подписанных обновлений без авторизации пользователя описан в `docs/desktop-updates.md`; секреты в проект не включаются.

Работа с подключениями, SQL-каталогом и проверкой на другом ПК описана в `docs/user-guide.md`.

# Контракт интеграции pg-tools

Host рендерит `PgToolsModal` и передаёт:

```js
{
  connections,
  activeConnectionId,
  onConnectionChange(id),
  executeSql({ requestId, connectionId, sql, timeoutMs, rowLimit, signal }),
  cancelSql(requestId),
  getMetadata({ connectionId, signal }),
  theme,
  settings,
  currentUser,
  notify({ type, title, message }),
  onClose()
}
```

`executeSql` возвращает `{ columns, rows, rowCount, durationMs, truncated }`. Ошибка должна иметь безопасные `code`, `message` и необязательный `details` без секретов. `connections` содержит только display metadata и capabilities.

Host владеет соединениями, credential lifecycle, авторизацией, аудитом и отменой. `pg-tools` владеет только каталогом избранных SQL и журналом запусков. Для production persistence host может передать адаптер; встроенный срез хранит эти данные только в памяти страницы.

# Пути настроек desktop-приложения

Закройте DB Tools перед ручным редактированием. Рабочая директория пользовательских данных в Windows:

```text
%APPDATA%\DB Tools\
```

Основные файлы:

- `%APPDATA%\DB Tools\settings.json` — тема, timeout и лимит строк.
- `%APPDATA%\DB Tools\connections.json` — профили подключений без паролей.
- `%APPDATA%\DB Tools\queries.json` — каталог SQL.
- `%APPDATA%\DB Tools\history.json` — журнал запусков.
- `%APPDATA%\DB Tools\secrets\` — зашифрованные DPAPI-секреты; вручную не редактировать и не переносить на другой ПК.
- `%APPDATA%\DB Tools\credentials\` — зашифрованный GitHub update token; вручную не редактировать.

Для ручного включения светлой темы откройте `settings.json` и установите:

```json
{
  "theme": "light",
  "defaultTimeoutMs": 15000,
  "rowLimit": 1000
}
```

Для тёмной темы используйте `"theme": "dark"`. После сохранения запустите приложение заново. Если JSON повреждён, переименуйте `settings.json`: приложение создаст настройки по умолчанию при следующем сохранении.

Установленные программные файлы обычно находятся в `%LOCALAPPDATA%\Programs\DB Tools\`. Не редактируйте `resources\app.asar`: настройки из него не читаются и обновление перезапишет этот файл.

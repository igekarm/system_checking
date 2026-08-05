# Desktop updates

Обновления поступают из публичных GitHub Releases `igekarm/system_checking`. Авторизация пользователя GitHub не используется.

## Защита обновления

- React работает с `contextIsolation`, без Node integration.
- Приложение анонимно читает только опубликованные GitHub Releases.
- Манифест обязательно проверяется встроенным Ed25519 public key.
- Installer сначала сохраняется как `.partial`, затем проверяются размер и SHA-256.
- Authenticode не требуется: доверие к обновлению обеспечивают Ed25519-подпись manifest и проверка SHA-256 установщика до запуска.
- Закрытый Ed25519-ключ существует только в GitHub Actions Secrets и не включается в EXE.

Публичность репозитория разрешает скачать installer любому пользователю, но не позволяет выпустить принимаемое приложением поддельное обновление без закрытого Ed25519-ключа.

## GitHub Actions

Обязательные secrets:

- `UPDATE_SIGNING_PRIVATE_KEY_BASE64`.

Переменная `DB_TOOLS_GITHUB_APP_CLIENT_ID` больше не используется и может быть удалена.

Релиз запускается тегом `app-vX.Y.Z`. Workflow собирает installer, подписывает манифест и публикует installer, blockmap и `latest-win-x64-stable.json` в GitHub Release.

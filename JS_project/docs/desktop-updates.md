# Desktop updates

Обновления поступают из публичных GitHub Releases `igekarm/system_checking`. Авторизация пользователя GitHub не используется.

## Защита обновления

- React работает с `contextIsolation`, без Node integration.
- Приложение анонимно читает только опубликованные GitHub Releases.
- Манифест обязательно проверяется встроенным Ed25519 public key.
- Installer сначала сохраняется как `.partial`, затем проверяются размер и SHA-256.
- Перед запуском проверяются Authenticode-подпись и ожидаемый Subject издателя.
- Закрытый Ed25519-ключ и PFX-сертификат существуют только в GitHub Actions Secrets и не включаются в EXE.

Публичность репозитория разрешает скачать installer любому пользователю, но не позволяет выпустить принимаемое приложением поддельное обновление без закрытого Ed25519-ключа и Windows-сертификата.

## GitHub Actions

Обязательные secrets:

- `UPDATE_SIGNING_PRIVATE_KEY_BASE64`;
- `WINDOWS_CERTIFICATE_BASE64`;
- `WINDOWS_CERTIFICATE_PASSWORD`.

Repository variable:

- `DB_TOOLS_WINDOWS_PUBLISHER_SUBJECT`.

Переменная `DB_TOOLS_GITHUB_APP_CLIENT_ID` больше не используется и может быть удалена.

Релиз запускается тегом `app-vX.Y.Z`. Workflow собирает installer, подписывает манифест и публикует installer, blockmap и `latest-win-x64-stable.json` в GitHub Release.

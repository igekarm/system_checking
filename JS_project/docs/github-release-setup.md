# Публичные обновления через igekarm/system_checking

## Почему нельзя просто включить Public

В истории текущего репозитория найдены старая версия `untitled/connections.json` с полями `url`, `username`, `password`, файл `untitled/dbclient.log` и сохранённый SQL. GitHub публикует всю достижимую историю, поэтому переключать текущий репозиторий в Public нельзя.

Безопасная схема сохраняет адрес updater:

1. текущий приватный `igekarm/system_checking` переименовать в `igekarm/system_checking-private`;
2. создать новый чистый публичный `igekarm/system_checking`;
3. поместить в него только новый JS-проект и release workflow;
4. выпустить `app-v0.1.5`.

## 1. Сохранение приватного репозитория

На странице текущего репозитория откройте **Settings → General → Repository name**, укажите `system_checking-private` и подтвердите переименование. Не меняйте его видимость.

Смените пароли из исторического `untitled/connections.json`, если они ещё действуют. Старый репозиторий остаётся приватным, но хранение действующих паролей в Git-истории небезопасно.

## 2. Создание чистого публичного репозитория

На GitHub нажмите **New repository**:

- Owner: `igekarm`;
- Repository name: `system_checking`;
- Visibility: **Public**;
- не добавляйте README, `.gitignore` и license автоматически.

## 3. Подготовка чистой локальной публикации

Создайте отдельный каталог. Не копируйте `.git`, `untitled`, старые логи и локальные ключи.

```powershell
New-Item -ItemType Directory -Path D:\system_checking_public -ErrorAction Stop
New-Item -ItemType Directory -Path D:\system_checking_public\.github\workflows -Force
Copy-Item D:\system_checking\.github\workflows\release-js-desktop.yml D:\system_checking_public\.github\workflows\release-js-desktop.yml
Copy-Item D:\system_checking\JS_project D:\system_checking_public\JS_project -Recurse
```

До первого commit удалите из копии каталоги, которые не должны публиковаться:

```powershell
Remove-Item D:\system_checking_public\JS_project\node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item D:\system_checking_public\JS_project\release -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item D:\system_checking_public\JS_project\.local-keys -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item D:\system_checking_public\JS_project\app\dist -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item D:\system_checking_public\JS_project\pg-tools\dist -Recurse -Force -ErrorAction SilentlyContinue
```

Затем создайте новую историю:

```powershell
cd D:\system_checking_public
git init -b master
git add -- .github JS_project
git status --short
git commit -m "Initial public DB Tools release"
git remote add origin https://github.com/igekarm/system_checking.git
git push -u origin master
```

Перед commit внимательно проверьте `git status`: там не должно быть `untitled`, `.local-keys`, `node_modules`, `release`, `.pfx`, `.pem`, `.env`, пользовательских JSON и логов.

## 4. Настройки GitHub Actions

В новом публичном репозитории откройте **Settings → Secrets and variables → Actions** и заново создайте:

Repository secrets:

- `UPDATE_SIGNING_PRIVATE_KEY_BASE64` — используйте тот же Ed25519 private key, который применялся ранее.

`DB_TOOLS_GITHUB_APP_CLIENT_ID` создавать не нужно. Старый GitHub App Device Flow новому репозиторию не требуется.

В **Settings → Actions → General → Workflow permissions** выберите **Read and write permissions**, если публикация Release получает ошибку доступа. Workflow также объявляет `contents: write`.

## 5. Первый публичный релиз

После добавления secrets и variable:

```powershell
cd D:\system_checking_public
git tag -a app-v0.1.5 -m "DB Tools 0.1.5"
git push origin app-v0.1.5
```

Дождитесь зелёного workflow и проверьте без входа в GitHub:

```text
https://github.com/igekarm/system_checking/releases/tag/app-v0.1.5
```

В Assets должны присутствовать installer, blockmap и `latest-win-x64-stable.json`.

## 6. Переход с 0.1.4

Версия `0.1.4` требует GitHub-токен до обращения к Releases, поэтому она не сможет автоматически получить первый публичный релиз. Один раз вручную скачайте `DB-Tools-0.1.5-win-x64.exe` и установите поверх `0.1.4`.

Начиная с `0.1.5`, кнопка **Проверить** работает анонимно. Все следующие версии `0.1.6+` можно загружать и устанавливать встроенным updater без входа пользователя в GitHub.

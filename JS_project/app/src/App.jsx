import React, { useEffect, useMemo, useState } from "react";
import { ResultGrid, SqlEditor } from "@db-tools/ui";
import { UpdatePanel } from "./UpdatePanel.jsx";

const desktop = window.dbToolsDesktop;
const emptyConnection = {
  name: "",
  providerId: "postgresql",
  host: "localhost",
  port: 5432,
  database: "postgres",
  serviceName: "FREEPDB1",
  sid: "ORCL",
  oracleConnectionType: "serviceName",
  connectString: "",
  user: "",
  password: "",
  sslMode: "prefer",
};
const cleanError = (error) =>
  String(error?.message ?? error).replace(
    /^Error invoking remote method '[^']+': Error: /,
    "",
  );

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div
      className="backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className={`modal ${wide ? "wide" : ""}`}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ConnectionModal({ initial, enabledProviders, onSaved, onClose }) {
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          password: "",
          sslMode: initial.sslMode ?? (initial.ssl ? "prefer" : "disable"),
        }
      : emptyConnection,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const oracle = form.providerId === "oracle";
  const oracleType =
    form.oracleConnectionType ??
    (form.connectString ? "connectString" : "serviceName");
  function changeProvider(providerId) {
    setForm((old) => ({
      ...old,
      providerId,
      port: providerId === "oracle" ? 1521 : 5432,
      host: old.host || "localhost",
    }));
  }
  async function test() {
    setBusy(true);
    setMessage("Проверка…");
    try {
      const value = await desktop.connections.test(form);
      setMessage(
        `Подключено за ${value.durationMs} мс · ${value.database ?? form.serviceName ?? form.sid ?? "Oracle"} · ${value.user}${value.mode ? ` · ${value.mode}${value.serverVersion ? ` · сервер ${value.serverVersion}` : ""}${value.clientVersion ? ` · клиент ${value.clientVersion}` : ""}` : ` · ${value.sslUsed ? "SSL" : "без SSL"}`}`,
      );
    } catch (error) {
      setMessage(cleanError(error));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      await desktop.connections.save(form);
      await onSaved();
      onClose();
    } catch (error) {
      setMessage(cleanError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={form.id ? "Редактирование подключения" : "Новое подключение"}
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="Название">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="СУБД">
          <select
            value={form.providerId}
            onChange={(e) => changeProvider(e.target.value)}
            disabled={Boolean(form.id)}
          >
            <option value="postgresql">PostgreSQL</option>
            {(enabledProviders ?? ["postgresql"]).includes("oracle") && (
              <option value="oracle">Oracle Database</option>
            )}
          </select>
        </Field>
        {oracle ? (
          <>
            <Field label="Подключаться по">
              <select
                value={oracleType}
                onChange={(e) => set("oracleConnectionType", e.target.value)}
              >
                <option value="serviceName">Service name</option>
                <option value="sid">SID</option>
                <option value="connectString">
                  Connect descriptor / JDBC URL
                </option>
              </select>
            </Field>
            {oracleType === "connectString" ? (
              <Field label="Connect descriptor, Easy Connect или JDBC URL">
                <textarea
                  className="oracle-connect-string"
                  value={form.connectString ?? ""}
                  placeholder="host:1521/service, jdbc:oracle:thin:@... или (DESCRIPTION=...)"
                  onChange={(e) => set("connectString", e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="Сервер">
                  <input
                    value={form.host}
                    onChange={(e) => set("host", e.target.value)}
                  />
                </Field>
                <Field label="Порт">
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => set("port", e.target.value)}
                  />
                </Field>
                {oracleType === "sid" ? (
                  <Field label="SID">
                    <input
                      value={form.sid ?? ""}
                      placeholder="ORCL"
                      onChange={(e) => set("sid", e.target.value)}
                    />
                  </Field>
                ) : (
                  <Field label="Service name">
                    <input
                      value={form.serviceName ?? ""}
                      placeholder="FREEPDB1 или service.domain"
                      onChange={(e) => set("serviceName", e.target.value)}
                    />
                  </Field>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <Field label="Сервер">
              <input
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
              />
            </Field>
            <Field label="Порт">
              <input
                type="number"
                value={form.port}
                onChange={(e) => set("port", e.target.value)}
              />
            </Field>
            <Field label="База данных">
              <input
                value={form.database ?? ""}
                onChange={(e) => set("database", e.target.value)}
              />
            </Field>
            <Field label="Режим SSL">
              <select
                value={form.sslMode}
                onChange={(e) => set("sslMode", e.target.value)}
              >
                <option value="prefer">Предпочитать SSL (с fallback)</option>
                <option value="disable">Отключить SSL</option>
                <option value="require">Требовать SSL</option>
                <option value="verify-full">SSL с проверкой сертификата</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Пользователь">
          <input
            value={form.user}
            onChange={(e) => set("user", e.target.value)}
          />
        </Field>
        <Field label={form.id ? "Новый пароль (пусто — не менять)" : "Пароль"}>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </Field>
      </div>
      {oracle && (
        <small className="form-hint">
          Режим Oracle выбирается настройками приложения: Thin поддерживает Database
          12.1+, Thick с Instant Client 19 — Database 11.2+.
        </small>
      )}
      {message && <div className="form-message">{message}</div>}
      <footer>
        <button className="secondary" onClick={test} disabled={busy}>
          Проверить
        </button>
        <span className="spacer" />
        <button className="secondary" onClick={onClose}>
          Отмена
        </button>
        <button onClick={save} disabled={busy}>
          Сохранить
        </button>
      </footer>
    </Modal>
  );
}

function QueryModal({ initial, sql, connections, onSaved, onClose }) {
  const [form, setForm] = useState(
    initial ?? { name: "", sql, providerId: "postgresql", connectionId: null },
  );
  const [error, setError] = useState("");
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function save() {
    try {
      await desktop.queries.save(form);
      await onSaved();
      onClose();
    } catch (value) {
      setError(cleanError(value));
    }
  }
  return (
    <Modal
      title={form.id ? "Редактирование запроса" : "Сохранить запрос"}
      onClose={onClose}
    >
      <Field label="Название">
        <input
          autoFocus
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <Field label="Доступен для">
        <select
          value={form.connectionId ?? ""}
          onChange={(e) => set("connectionId", e.target.value || null)}
        >
          <option value="">Всех PostgreSQL-подключений</option>
          {connections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="SQL">
        <textarea
          className="modal-sql"
          value={form.sql}
          onChange={(e) => set("sql", e.target.value)}
        />
      </Field>
      {error && <div className="form-message error">{error}</div>}
      <footer>
        <span className="spacer" />
        <button className="secondary" onClick={onClose}>
          Отмена
        </button>
        <button onClick={save}>Сохранить</button>
      </footer>
    </Modal>
  );
}

function OracleInstallModal({ provider, onInstalled, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function install() {
    setBusy(true);
    setError("");
    try {
      await desktop.providers.install("oracle");
      await onInstalled();
    } catch (value) {
      setError(cleanError(value));
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Подключить Oracle Database"
      onClose={busy ? () => {} : onClose}
    >
      <div className="provider-notice">
        <b>
          Будет загружен Oracle node-oracledb {provider?.version ?? "7.0.1"}
        </b>
        <p>
          Источник: официальный npm Registry, пакет поддерживается Oracle. После
          загрузки приложение проверит закреплённую контрольную сумму SHA-512 и
          версию пакета.
        </p>
        <ul>
          <li>Thin без Oracle Client: Oracle Database 12.1 и новее</li>
          <li>Thick с Oracle Instant Client 19 x64: Oracle Database 11.2 и новее</li>
          <li>Размер после распаковки: около 3,9 МБ</li>
        </ul>
        <code>{provider?.source}</code>
      </div>
      {busy && (
        <div className="form-message">
          Скачивание и проверка Oracle provider…
        </div>
      )}
      {error && <div className="form-message error">{error}</div>}
      <footer>
        <span className="spacer" />
        <button className="secondary" onClick={onClose} disabled={busy}>
          Отмена
        </button>
        <button onClick={install} disabled={busy}>
          {busy ? "Установка…" : "Скачать и включить"}
        </button>
      </footer>
    </Modal>
  );
}

function SettingsModal({ settings, onSaved, onClose }) {
  const [form, setForm] = useState({
    ...settings,
    enabledProviders: settings.enabledProviders ?? ["postgresql"],
    oracleClientDir: settings.oracleClientDir ?? "",
  });
  const [info, setInfo] = useState(null);
  const [providers, setProviders] = useState([]);
  const [oraclePrompt, setOraclePrompt] = useState(false);
  useEffect(() => {
    desktop.app.info().then(setInfo);
    desktop.providers.list().then(setProviders);
  }, []);
  const oracle = providers.find((item) => item.id === "oracle");
  function toggleOracle(checked) {
    if (!checked) {
      setForm((old) => ({
        ...old,
        enabledProviders: old.enabledProviders.filter((id) => id !== "oracle"),
      }));
      return;
    }
    if (oracle?.installed)
      setForm((old) => ({
        ...old,
        enabledProviders: [...new Set([...old.enabledProviders, "oracle"])],
      }));
    else setOraclePrompt(true);
  }
  async function oracleInstalled() {
    const values = await desktop.providers.list();
    setProviders(values);
    setForm((old) => ({
      ...old,
      enabledProviders: [...new Set([...old.enabledProviders, "oracle"])],
    }));
    setOraclePrompt(false);
  }
  async function save() {
    await desktop.settings.save(form);
    await onSaved();
    onClose();
  }
  return (
    <>
      <Modal title="Настройки" onClose={onClose} wide>
        <div className="settings-grid">
          <Field label="Тема">
            <select
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
            >
              <option value="dark">Тёмная</option>
              <option value="light">Светлая</option>
            </select>
          </Field>
          <Field label="Timeout запроса, мс">
            <input
              type="number"
              min="0"
              max="3600000"
              value={form.defaultTimeoutMs}
              onChange={(e) =>
                setForm({ ...form, defaultTimeoutMs: e.target.value })
              }
            />
            <small className="form-hint">0 — без ограничения; максимум 3 600 000 мс (1 час)</small>
          </Field>
          <Field label="Лимит строк">
            <input
              type="number"
              min="1"
              max="10000"
              value={form.rowLimit}
              onChange={(e) => setForm({ ...form, rowLimit: e.target.value })}
            />
          </Field>
        </div>
        <section className="provider-settings">
          <h3>Поддерживаемые СУБД</h3>
          <label className="provider-choice">
            <input type="checkbox" checked disabled />
            <span>
              <b>PostgreSQL</b>
              <small>Встроен и доступен по умолчанию</small>
            </span>
          </label>
          {form.enabledProviders.includes("oracle") && (
            <div className="oracle-runtime-settings">
              <Field label="Oracle Instant Client 19 (необязательно)">
                <input value={form.oracleClientDir} placeholder="C:\\oracle\\instantclient_19_28" onChange={(e) => setForm({ ...form, oracleClientDir: e.target.value })} />
              </Field>
              <small>Оставьте поле пустым для Thin mode (Oracle 12.1+). Укажите каталог, содержащий oci.dll, для Thick mode и Oracle 11.2+. После изменения пути перезапустите приложение.</small>
            </div>
          )}
          <label className="provider-choice">
            <input
              type="checkbox"
              checked={form.enabledProviders.includes("oracle")}
              onChange={(e) => toggleOracle(e.target.checked)}
            />
            <span>
              <b>Oracle Database</b>
              <small>
                {oracle?.installed
                  ? `Oracle node-oracledb ${oracle.version} установлен`
                  : "Будет загружен с официального ресурса после подтверждения"}
              </small>
            </span>
          </label>
        </section>
        <section className="app-details">
          <div>
            <strong>DB Tools {info?.version ?? "—"}</strong>
            <small>
              Технический журнал не содержит SQL, результаты и сведения о
              подключениях.
            </small>
          </div>
          <button
            className="secondary"
            onClick={() => desktop.app.openLogFolder()}
          >
            Открыть папку логов
          </button>
        </section>
        <UpdatePanel />
        <footer>
          <span className="spacer" />
          <button className="secondary" onClick={onClose}>
            Отмена
          </button>
          <button onClick={save}>Сохранить</button>
        </footer>
      </Modal>
      {oraclePrompt && (
        <OracleInstallModal
          provider={oracle}
          onInstalled={oracleInstalled}
          onClose={() => setOraclePrompt(false)}
        />
      )}
    </>
  );
}

function ChangelogModal({ info, onClose }) {
  async function close() {
    await desktop.app.acknowledgeVersion();
    onClose();
  }
  return (
    <Modal title={`DB Tools ${info.version} — что нового`} onClose={close} wide>
      <pre className="changelog-content">{info.changelog}</pre>
      <footer>
        <span className="spacer" />
        <button onClick={close}>Понятно</button>
      </footer>
    </Modal>
  );
}

export function App() {
  const [connections, setConnections] = useState([]),
    [queries, setQueries] = useState([]),
    [history, setHistory] = useState([]),
    [settings, setSettings] = useState({
      theme: "dark",
      defaultTimeoutMs: 15000,
      rowLimit: 1000,
      enabledProviders: ["postgresql"],
      oracleClientDir: "",
    });
  const [connectionId, setConnectionId] = useState("");
  const [sql, setSql] = useState("select current_timestamp;");
  const [result, setResult] = useState({ columns: [], rows: [] });
  const [status, setStatus] = useState("Готово");
  const [running, setRunning] = useState(null);
  const [sideTab, setSideTab] = useState("connections");
  const [bottomTab, setBottomTab] = useState("results");
  const [filter, setFilter] = useState("");
  const [connectionModal, setConnectionModal] = useState(null);
  const [queryModal, setQueryModal] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appInfo, setAppInfo] = useState(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  async function refreshConnections() {
    const values = await desktop.connections.list();
    setConnections(values);
    setConnectionId((current) =>
      values.some((v) => v.id === current) ? current : (values[0]?.id ?? ""),
    );
  }
  async function refreshQueries() {
    setQueries(await desktop.queries.list());
  }
  async function refreshHistory() {
    setHistory(await desktop.history.list());
  }
  async function refreshSettings() {
    const value = await desktop.settings.get();
    setSettings(value);
    document.documentElement.dataset.theme = value.theme;
  }
  useEffect(() => {
    if (!desktop) {
      setStatus("Запустите приложение через Electron");
      return;
    }
    Promise.all([
      refreshConnections(),
      refreshQueries(),
      refreshHistory(),
      refreshSettings(),
      desktop.app.info().then((value) => {
        setAppInfo(value);
        setChangelogOpen(value.showChangelog);
      }),
    ]).catch((e) => {
      setStatus(cleanError(e));
      desktop.app.reportError({ message: cleanError(e), source: "startup" });
    });
    const onError = (event) =>
      desktop.app.reportError({
        message: event.message,
        source: "window.error",
      });
    const onRejection = (event) =>
      desktop.app.reportError({
        message: cleanError(event.reason),
        source: "window.unhandledrejection",
      });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  const visibleQueries = useMemo(
    () =>
      queries.filter(
        (item) =>
          (!item.connectionId || item.connectionId === connectionId) &&
          item.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [queries, connectionId, filter],
  );
  async function execute() {
    if (!connectionId) {
      setStatus("Создайте и выберите подключение");
      return;
    }
    const requestId = crypto.randomUUID();
    setRunning(requestId);
    setStatus("Выполнение…");
    setBottomTab("results");
    try {
      const value = await desktop.sql.execute({
        requestId,
        connectionId,
        sql,
        timeoutMs: settings.defaultTimeoutMs,
        rowLimit: settings.rowLimit,
      });
      setResult(value);
      setStatus(
        `${value.command ?? "SQL"} · строк: ${value.rowCount} · ${value.durationMs} мс${value.truncated ? " · результат ограничен" : ""}`,
      );
    } catch (error) {
      setStatus(cleanError(error));
      setBottomTab("messages");
    } finally {
      setRunning(null);
      refreshHistory();
    }
  }
  async function cancel() {
    if (running) {
      await desktop.sql.cancel({ requestId: running, connectionId });
      setStatus("Отмена отправлена");
    }
  }
  async function deleteConnection(item) {
    if (confirm(`Удалить подключение «${item.name}» и сохранённый пароль?`)) {
      await desktop.connections.delete(item.id);
      await refreshConnections();
    }
  }
  async function deleteQuery(item) {
    if (confirm(`Удалить запрос «${item.name}»?`)) {
      await desktop.queries.delete(item.id);
      await refreshQueries();
    }
  }
  if (changelogOpen && appInfo)
    return (
      <ChangelogModal info={appInfo} onClose={() => setChangelogOpen(false)} />
    );
  return (
    <div className="app-shell">
      <aside>
        <div className="brand">
          <span className="brand-mark">DB</span>
          <div>
            <b>DB Tools</b>
            <small>Database workspace</small>
          </div>
        </div>
        <div className="side-tabs">
          <button
            className={sideTab === "connections" ? "active" : ""}
            onClick={() => setSideTab("connections")}
          >
            Подключения
          </button>
          <button
            className={sideTab === "queries" ? "active" : ""}
            onClick={() => setSideTab("queries")}
          >
            Запросы
          </button>
        </div>
        {sideTab === "connections" ? (
          <>
            <div className="side-toolbar">
              <b>Подключения</b>
              <button
                title="Новое подключение"
                onClick={() => setConnectionModal({})}
              >
                ＋
              </button>
            </div>
            <div className="side-list">
              {connections.map((item) => (
                <div
                  key={item.id}
                  className={`side-item ${item.id === connectionId ? "selected" : ""}`}
                  onClick={() => setConnectionId(item.id)}
                >
                  <span className="db-dot" />
                  <div>
                    <b>{item.name}</b>
                    <small>
                      {item.connectString ||
                        `${item.user}@${item.host}:${item.port}/${item.database ?? item.serviceName}`}
                    </small>
                  </div>
                  <div className="item-actions">
                    <button
                      title="Редактировать"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectionModal(item);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnection(item);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {!connections.length && (
                <div className="empty">
                  Нет подключений
                  <br />
                  <button onClick={() => setConnectionModal({})}>
                    Создать
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="side-toolbar">
              <b>Запросы</b>
              <button
                title="Сохранить текущий SQL"
                onClick={() => setQueryModal({ sql })}
              >
                ＋
              </button>
            </div>
            <input
              className="side-search"
              placeholder="Поиск запросов"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="side-list">
              {visibleQueries.map((item) => (
                <div
                  key={item.id}
                  className="side-item"
                  onDoubleClick={() => setSql(item.sql)}
                >
                  <div>
                    <b>{item.name}</b>
                    <small>{item.sql.slice(0, 55)}</small>
                  </div>
                  <div className="item-actions">
                    <button title="Открыть" onClick={() => setSql(item.sql)}>
                      ↗
                    </button>
                    <button
                      title="Редактировать"
                      onClick={() => setQueryModal(item)}
                    >
                      ✎
                    </button>
                    <button title="Удалить" onClick={() => deleteQuery(item)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
              {!visibleQueries.length && (
                <div className="empty">Нет сохранённых запросов</div>
              )}
            </div>
          </>
        )}
      </aside>
      <main className="workspace">
        <header className="topbar">
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
          >
            <option value="">Выберите подключение</option>
            {connections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <button className="secondary" onClick={() => setQueryModal({ sql })}>
            Сохранить запрос
          </button>
          <button
            className="icon-button settings"
            title="Настройки"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </header>
        <section className="editor-panel">
          <div className="editor-title">
            <b>SQL Editor</b>
            <small>
              {connections.find((item) => item.id === connectionId)?.name ??
                "Подключение не выбрано"}
            </small>
          </div>
          <SqlEditor
            value={sql}
            onChange={setSql}
            disabled={Boolean(running)}
          />
          <div className="runbar">
            <button
              onClick={execute}
              disabled={Boolean(running) || !connectionId}
            >
              ▶ Выполнить
            </button>
            <button className="danger" onClick={cancel} disabled={!running}>
              ■ Отменить
            </button>
            <span>{status}</span>
          </div>
        </section>
        <section className="output">
          <div className="output-tabs">
            <button
              className={bottomTab === "results" ? "active" : ""}
              onClick={() => setBottomTab("results")}
            >
              Результаты
            </button>
            <button
              className={bottomTab === "messages" ? "active" : ""}
              onClick={() => setBottomTab("messages")}
            >
              Сообщения
            </button>
            <button
              className={bottomTab === "history" ? "active" : ""}
              onClick={() => {
                setBottomTab("history");
                refreshHistory();
              }}
            >
              Журнал
            </button>
          </div>
          <div className="output-body">
            {bottomTab === "results" && <ResultGrid {...result} />}{" "}
            {bottomTab === "messages" && (
              <pre className="messages">{status}</pre>
            )}{" "}
            {bottomTab === "history" && (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className={item.ok ? "ok" : "failed"}>
                    <b>
                      {item.ok ? "Успешно" : "Ошибка"} · {item.connectionName}
                    </b>
                    <span>
                      {new Date(item.startedAt).toLocaleString()} ·{" "}
                      {item.durationMs ?? "—"} мс
                    </span>
                    <code>{item.sql}</code>
                    {item.error && <small>{item.error}</small>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      {connectionModal && (
        <ConnectionModal
          initial={connectionModal.id ? connectionModal : null}
          enabledProviders={settings.enabledProviders}
          onSaved={refreshConnections}
          onClose={() => setConnectionModal(null)}
        />
      )}{" "}
      {queryModal && (
        <QueryModal
          initial={queryModal.id ? queryModal : null}
          sql={queryModal.sql ?? sql}
          connections={connections}
          onSaved={refreshQueries}
          onClose={() => setQueryModal(null)}
        />
      )}{" "}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSaved={refreshSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

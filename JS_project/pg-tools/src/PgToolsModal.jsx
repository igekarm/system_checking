import React, { useMemo, useState } from "react";
import { assertPgToolsHost } from "@db-tools/contracts";
import { createRunLog } from "@db-tools/sql-core";
import { ResultGrid, SqlEditor } from "@db-tools/ui";

export function PgToolsModal({ host }) {
  assertPgToolsHost(host); const log = useMemo(() => createRunLog(), []); const [sql, setSql] = useState("select version();"); const [result, setResult] = useState({ columns: [], rows: [] }); const [running, setRunning] = useState(null);
  async function run() { const requestId = crypto.randomUUID(); setRunning(requestId); try { const value = await host.executeSql({ requestId, connectionId: host.activeConnectionId, sql, timeoutMs: 15000, rowLimit: 1000 }); setResult(value); log.add({ requestId, sql, ok: true, at: new Date().toISOString() }); } catch (error) { log.add({ requestId, sql, ok: false, at: new Date().toISOString() }); host.notify({ type:"error", title:"Ошибка SQL", message:error.message }); } finally { setRunning(null); } }
  return <div className="modal" data-theme={host.theme}><header><h2>PostgreSQL tools</h2><button onClick={host.onClose}>Закрыть</button></header><select value={host.activeConnectionId} onChange={(e)=>host.onConnectionChange(e.target.value)}>{host.connections.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><SqlEditor value={sql} onChange={setSql} disabled={!!running}/><div className="actions"><button onClick={run} disabled={!!running}>Выполнить</button><button onClick={()=>host.cancelSql(running)} disabled={!running}>Отмена</button></div><ResultGrid {...result}/></div>;
}

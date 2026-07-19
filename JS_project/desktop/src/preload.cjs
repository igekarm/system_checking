const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("dbToolsDesktop", Object.freeze({
  app: Object.freeze({info:()=>ipcRenderer.invoke("app:info"),acknowledgeVersion:()=>ipcRenderer.invoke("app:acknowledge-version"),openLogFolder:()=>ipcRenderer.invoke("app:open-log-folder"),reportError:(value)=>ipcRenderer.invoke("logs:renderer-error",value)}),
  providers: Object.freeze({list:()=>ipcRenderer.invoke("providers:list"),install:(id)=>ipcRenderer.invoke("providers:install",id)}),
  connections: Object.freeze({list:()=>ipcRenderer.invoke("connections:list"),save:(value)=>ipcRenderer.invoke("connections:save",value),delete:(id)=>ipcRenderer.invoke("connections:delete",id),test:(value)=>ipcRenderer.invoke("connections:test",value)}),
  queries: Object.freeze({list:()=>ipcRenderer.invoke("queries:list"),save:(value)=>ipcRenderer.invoke("queries:save",value),delete:(id)=>ipcRenderer.invoke("queries:delete",id)}),
  sql: Object.freeze({execute:(value)=>ipcRenderer.invoke("sql:execute",value),cancel:(value)=>ipcRenderer.invoke("sql:cancel",value)}),
  settings: Object.freeze({get:()=>ipcRenderer.invoke("settings:get"),save:(value)=>ipcRenderer.invoke("settings:save",value)}),
  history: Object.freeze({list:()=>ipcRenderer.invoke("history:list")}),
  updates: Object.freeze({
    status: () => ipcRenderer.invoke("updates:status"),
    check: () => ipcRenderer.invoke("updates:check"),
    download: () => ipcRenderer.invoke("updates:download"),
    install: () => ipcRenderer.invoke("updates:install")
  })
}));

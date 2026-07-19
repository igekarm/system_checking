import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { GitHubReleaseClient } from "./github-client.js";
import { UpdateCoordinator } from "./update-coordinator.js";
import { startAppServer } from "@db-tools/app-server";
import { AppService } from "./app-service.js";
import { updateConfig } from "./update-config.js";
import { ApplicationLogger } from "./application-logger.js";
import { JsonStore } from "./json-store.js";

app.setName("DB Tools");
const directory=path.dirname(fileURLToPath(import.meta.url)); let window; let logger;
const execFileAsync=promisify(execFile);
async function verifyAndInstall(coordinator){const file=coordinator.snapshot.installerPath;if(coordinator.snapshot.state!=="ready"||!file)throw new Error("Проверенное обновление не готово");const script='param([string]$p); $s=Get-AuthenticodeSignature -LiteralPath $p; [pscustomobject]@{Status=$s.Status.ToString();Subject=$s.SignerCertificate.Subject}|ConvertTo-Json -Compress';const {stdout}=await execFileAsync("powershell.exe",["-NoProfile","-NonInteractive","-Command",script,file],{windowsHide:true});const signature=JSON.parse(stdout.trim());if(signature.Status!=="Valid")throw new Error(`Authenticode signature is not valid (${signature.Status})`);if(updateConfig.windowsPublisherSubject&&!signature.Subject.includes(updateConfig.windowsPublisherSubject))throw new Error("Installer publisher does not match update policy");spawn(file,["/S"],{detached:true,stdio:"ignore",windowsHide:true}).unref();setTimeout(()=>app.quit(),250);return true;}
function registerAppHandlers(service){
  const handlers={"connections:list":()=>service.listConnections(),"connections:save":(_event,value)=>service.saveConnection(value),"connections:delete":(_event,id)=>service.deleteConnection(id),"connections:test":(_event,value)=>service.testConnection(value),"queries:list":()=>service.listQueries(),"queries:save":(_event,value)=>service.saveQuery(value),"queries:delete":(_event,id)=>service.deleteQuery(id),"sql:execute":(_event,value)=>service.execute(value),"sql:cancel":(_event,value)=>service.cancel(value),"settings:get":()=>service.getSettings(),"settings:save":(_event,value)=>service.saveSettings(value),"history:list":()=>service.listHistory()};
  for(const [channel,handler] of Object.entries(handlers))ipcMain.handle(channel,handler);
}
app.whenReady().then(async()=>{
  const userDataPath=app.getPath("userData");
  logger=new ApplicationLogger(userDataPath);
  await logger.info("application.started",{version:app.getVersion(),packaged:app.isPackaged,platform:process.platform});
  process.on("uncaughtException",(error)=>logger.error("application.uncaught-exception",error));
  process.on("unhandledRejection",(error)=>logger.error("application.unhandled-rejection",error instanceof Error?error:new Error(String(error))));
  registerAppHandlers(new AppService(userDataPath));
  const client=new GitHubReleaseClient({owner:"igekarm",repo:"system_checking",logger});
  const publicKeyPem=process.env.DB_TOOLS_UPDATE_PUBLIC_KEY?.replace(/\\n/g,"\n")||updateConfig.publicKeyPem;
  const coordinator=new UpdateCoordinator({client,currentVersion:app.getVersion(),channel:"stable",publicKeyPem,downloadDirectory:path.join(userDataPath,"updates"),logger});
  const appState=new JsonStore(userDataPath,"application-state",{lastSeenVersion:null});
  const changelogPath=app.isPackaged?path.join(process.resourcesPath,"CHANGELOG.md"):path.join(directory,"..","..","CHANGELOG.md");
  const readChangelog=()=>readFile(changelogPath,"utf8").catch(()=>"Описание изменений для этой версии не подготовлено.");
  ipcMain.handle("app:info",async()=>{const state=await appState.read();return {version:app.getVersion(),logPath:logger.filePath,changelog:await readChangelog(),showChangelog:state.lastSeenVersion!==app.getVersion()};});
  ipcMain.handle("app:acknowledge-version",async()=>{await appState.write({lastSeenVersion:app.getVersion()});await logger.info("application.changelog-acknowledged",{version:app.getVersion()});return true;});
  ipcMain.handle("app:open-log-folder",async()=>{await shell.showItemInFolder(logger.filePath);return true;});
  ipcMain.handle("logs:renderer-error",(_event,value)=>logger.error("renderer.error",new Error(String(value?.message??"Renderer error")),{source:value?.source??"renderer"}));
  ipcMain.handle("updates:status",()=>coordinator.snapshot); ipcMain.handle("updates:check",()=>coordinator.check());
  ipcMain.handle("updates:download",()=>coordinator.download());
  ipcMain.handle("updates:install",async()=>{await logger.info("update.install.requested",{version:coordinator.snapshot.manifest?.version});return verifyAndInstall(coordinator);});
  window=new BrowserWindow({title:`DB Tools ${app.getVersion()}`,width:1280,height:820,minWidth:900,minHeight:600,webPreferences:{preload:path.join(directory,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if (app.isPackaged) { const server=await startAppServer({port:0,staticPath:path.join(process.resourcesPath,"app-ui")}); const address=server.address(); await window.loadURL(`http://127.0.0.1:${address.port}`); } else await window.loadURL("http://127.0.0.1:5173");
}).catch((error)=>{logger?.error("application.startup-failed",error);throw error;});
app.on("before-quit",()=>logger?.info("application.stopping",{version:app.getVersion()}));
app.on("window-all-closed",()=>{if(process.platform!=="darwin") app.quit();});

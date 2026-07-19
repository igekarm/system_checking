import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";

const MAX_LOG_SIZE = 5 * 1024 * 1024;
const SENSITIVE_KEY = /sql|query|row|result|password|secret|token|authorization|connection|database|host|user/i;

function safeDetails(value) {
  if (value === undefined) return undefined;
  if (value instanceof Error) return { name:value.name, code:value.code };
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(safeDetails);
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,SENSITIVE_KEY.test(key)?"[REDACTED]":safeDetails(item)]));
}

export class ApplicationLogger {
  constructor(userDataPath) { this.directory=path.join(userDataPath,"logs"); this.filePath=path.join(this.directory,"application.log"); this.queue=Promise.resolve(); }
  write(level,event,details) {
    const record={timestamp:new Date().toISOString(),level,event,...(details===undefined?{}:{details:safeDetails(details)})};
    this.queue=this.queue.then(async()=>{await mkdir(this.directory,{recursive:true});const info=await stat(this.filePath).catch(()=>null);if(info?.size>=MAX_LOG_SIZE)await rename(this.filePath,path.join(this.directory,"application.previous.log")).catch(()=>{});await appendFile(this.filePath,JSON.stringify(record)+"\n","utf8");}).catch(()=>{});
    return this.queue;
  }
  info(event,details){return this.write("info",event,details);}
  warn(event,details){return this.write("warn",event,details);}
  error(event,error,details={}){return this.write("error",event,{...details,error:safeDetails(error)});}
}

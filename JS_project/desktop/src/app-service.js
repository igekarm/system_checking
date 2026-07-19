import { randomUUID } from "node:crypto";
import { JsonStore } from "./json-store.js";
import { SecretStore } from "./secret-store.js";
import { PostgreSqlProvider } from "./postgresql-provider.js";

const clean=(value)=>String(value??"").trim();
export class AppService {
  constructor(userDataPath){this.connections=new JsonStore(userDataPath,"connections",[]);this.queries=new JsonStore(userDataPath,"queries",[]);this.settings=new JsonStore(userDataPath,"settings",{theme:"dark",defaultTimeoutMs:15000,rowLimit:1000});this.history=new JsonStore(userDataPath,"history",[]);this.secrets=new SecretStore(userDataPath);this.providers={postgresql:new PostgreSqlProvider(this.secrets)};}
  async listConnections(){return this.connections.read();}
  validateConnection(input){const requestedMode=input.sslMode??(input.ssl?"prefer":"disable");const value={id:input.id||randomUUID(),name:clean(input.name),providerId:input.providerId||"postgresql",host:clean(input.host),port:Number(input.port||5432),database:clean(input.database),user:clean(input.user),sslMode:["disable","prefer","require","verify-full"].includes(requestedMode)?requestedMode:"prefer",updatedAt:new Date().toISOString()};if(!value.name||!value.host||!value.database||!value.user)throw new Error("Заполните название, сервер, базу данных и пользователя");if(!Number.isInteger(value.port)||value.port<1||value.port>65535)throw new Error("Некорректный порт");if(!this.providers[value.providerId])throw new Error("Провайдер СУБД не установлен");return value;}
  async saveConnection(input){const value=this.validateConnection(input);await this.connections.update((items)=>[value,...items.filter((item)=>item.id!==value.id)]);if(typeof input.password==="string"&&input.password.length)await this.secrets.set(value.id,input.password);return value;}
  async deleteConnection(id){await this.connections.update((items)=>items.filter((item)=>item.id!==id));await this.secrets.delete(id);return true;}
  async findConnection(id){const value=(await this.connections.read()).find((item)=>item.id===id);if(!value)throw new Error("Подключение не найдено");return value;}
  async testConnection(input){const value=this.validateConnection(input);return this.providers[value.providerId].test(value,input.password);}
  async listQueries(){return this.queries.read();}
  async saveQuery(input){const value={id:input.id||randomUUID(),name:clean(input.name),sql:String(input.sql??""),providerId:input.providerId||"postgresql",connectionId:input.connectionId||null,updatedAt:new Date().toISOString()};if(!value.name||!value.sql.trim())throw new Error("Название и SQL обязательны");await this.queries.update((items)=>[value,...items.filter((item)=>item.id!==value.id)]);return value;}
  async deleteQuery(id){await this.queries.update((items)=>items.filter((item)=>item.id!==id));return true;}
  async getSettings(){return this.settings.read();}
  async saveSettings(input){const value={theme:input.theme==="light"?"light":"dark",defaultTimeoutMs:Math.max(1000,Math.min(Number(input.defaultTimeoutMs)||15000,300000)),rowLimit:Math.max(1,Math.min(Number(input.rowLimit)||1000,10000))};await this.settings.write(value);return value;}
  async listHistory(){return this.history.read();}
  async execute(input){const profile=await this.findConnection(input.connectionId);const settings=await this.getSettings();const startedAt=new Date().toISOString();try{const result=await this.providers[profile.providerId].execute({...input,profile,timeoutMs:input.timeoutMs??settings.defaultTimeoutMs,rowLimit:input.rowLimit??settings.rowLimit});await this.addHistory({id:input.requestId,connectionId:profile.id,connectionName:profile.name,sql:input.sql,startedAt,durationMs:result.durationMs,ok:true,rowCount:result.rowCount});return result;}catch(error){await this.addHistory({id:input.requestId,connectionId:profile.id,connectionName:profile.name,sql:input.sql,startedAt,ok:false,error:error.message});throw error;}}
  async cancel({requestId,connectionId}){const profile=await this.findConnection(connectionId);return this.providers[profile.providerId].cancel(requestId);}
  async addHistory(entry){await this.history.update((items)=>[entry,...items].slice(0,500));}
}
